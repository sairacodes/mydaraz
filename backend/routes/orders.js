const express = require("express");
const router = express.Router({ mergeParams: true });
const Tenant = require("../models/Tenant");
const { protect, authorize, guardTenantScope } = require("../middleware/auth");
const { resolveTenant } = require("../middleware/tenant");

// ── POST /api/tenants/:tenantSlug/orders — place order ─────────
router.post("/", protect, authorize("customer"), resolveTenant, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod = "cod", couponCode, customerNote } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Order must contain at least one item" });
    }

    // Validate items and compute totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await req.ProductModel.findById(item.productId);
      if (!product || product.status !== "active") {
        return res.status(400).json({
          success: false,
          message: `Product not available: ${item.productId}`,
        });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for: ${product.name}`,
        });
      }

      const lineTotal = product.price * item.quantity;
      subtotal += lineTotal;

      orderItems.push({
        productId: product._id,
        productName: product.name,
        productImage: product.images[0]?.url,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice: lineTotal,
      });

      // Reduce stock
      await req.ProductModel.findByIdAndUpdate(product._id, {
        $inc: { stock: -item.quantity, totalSold: item.quantity },
      });
    }

    const shippingFee = subtotal >= 2000 ? 0 : 200; // Free shipping over PKR 2000
    const discount = 0; // coupon logic placeholder
    const taxAmount = 0;
    const totalAmount = subtotal + shippingFee - discount + taxAmount;

    // Commission split
    const commissionRate = req.tenant.commissionRate / 100;
    const platformCommission = totalAmount * commissionRate;
    const tenantEarnings = totalAmount - platformCommission;

    const order = await req.OrderModel.create({
      customerId: req.user._id,
      customerName: req.user.name,
      customerEmail: req.user.email,
      tenantId: req.tenant._id,
      tenantSlug: req.tenantSlug,
      items: orderItems,
      subtotal,
      shippingFee,
      discount,
      taxAmount,
      totalAmount,
      platformCommission,
      tenantEarnings,
      couponCode,
      shippingAddress,
      paymentMethod,
      customerNote,
      statusHistory: [{ status: "pending", changedBy: req.user.name }],
    });

    // Update tenant stats
    await Tenant.findByIdAndUpdate(req.tenant._id, {
      $inc: { "stats.totalOrders": 1 },
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/tenants/:tenantSlug/orders — seller sees all orders ─
router.get(
  "/",
  protect,
  authorize("tenant_admin", "superadmin"),
  resolveTenant,
  guardTenantScope,
  async (req, res) => {
    try {
      const { status, page = 1, limit = 20, sort = "-createdAt" } = req.query;
      const filter = {};
      if (status) filter.status = status;

      const orders = await req.OrderModel.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(Number(limit));

      const total = await req.OrderModel.countDocuments(filter);

      res.json({
        success: true,
        data: orders,
        pagination: { page: Number(page), limit: Number(limit), total },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ── GET /api/tenants/:tenantSlug/orders/my — customer's own orders ─
router.get("/my", protect, authorize("customer"), resolveTenant, async (req, res) => {
  try {
    const orders = await req.OrderModel.find({ customerId: req.user._id }).sort("-createdAt");
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/tenants/:tenantSlug/orders/:id ────────────────────
router.get("/:id", protect, resolveTenant, async (req, res) => {
  try {
    const order = await req.OrderModel.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // Customers can only see their own orders
    if (
      req.user.role === "customer" &&
      order.customerId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── PATCH /api/tenants/:tenantSlug/orders/:id/status ──────────
router.patch(
  "/:id/status",
  protect,
  authorize("tenant_admin", "superadmin"),
  resolveTenant,
  guardTenantScope,
  async (req, res) => {
    try {
      const { status, note, trackingNumber, carrier } = req.body;
      const validTransitions = {
        pending: ["confirmed", "cancelled"],
        confirmed: ["processing", "cancelled"],
        processing: ["shipped", "cancelled"],
        shipped: ["delivered"],
        delivered: ["refunded"],
        cancelled: [],
        refunded: [],
      };

      const order = await req.OrderModel.findById(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: "Order not found" });

      if (!validTransitions[order.status]?.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot transition from '${order.status}' to '${status}'`,
        });
      }

      order.status = status;
      order.statusHistory.push({ status, changedBy: req.user.name, note });
      if (status === "shipped") {
        order.trackingNumber = trackingNumber;
        order.carrier = carrier;
      }
      if (status === "delivered") {
        order.deliveredAt = new Date();
        order.paymentStatus = order.paymentMethod === "cod" ? "paid" : order.paymentStatus;
        if (order.paymentStatus === "paid") {
          await Tenant.findByIdAndUpdate(req.tenant._id, {
            $inc: { "stats.totalRevenue": order.tenantEarnings },
          });
        }
      }
      if (status === "cancelled") {
        order.cancelledAt = new Date();
        order.cancellationReason = note;
        // Restore stock
        for (const item of order.items) {
          await req.ProductModel.findByIdAndUpdate(item.productId, {
            $inc: { stock: item.quantity, totalSold: -item.quantity },
          });
        }
      }

      await order.save();
      res.json({ success: true, data: order });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
