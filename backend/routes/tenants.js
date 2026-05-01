const express = require("express");
const router = express.Router();
const Tenant = require("../models/Tenant");
const User = require("../models/User");
const { protect, authorize, guardTenantScope } = require("../middleware/auth");
const { resolveTenant } = require("../middleware/tenant");

// ── GET /api/tenants — list all active stores ──────────────────
router.get("/", async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true, isSuspended: false };
    if (category) filter.category = category;
    if (search) filter.$text = { $search: search };

    const tenants = await Tenant.find(filter)
      .select("name slug description logo banner category stats plan isVerified")
      .sort({ "stats.avgRating": -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Tenant.countDocuments(filter);

    res.json({
      success: true,
      data: tenants,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /api/tenants — tenant_admin creates their store ───────
router.post("/", protect, authorize("tenant_admin", "superadmin"), async (req, res) => {
  try {
    const {
      name, description, category,
      contactEmail, contactPhone, address, logo, banner,
    } = req.body;

    // Prevent duplicate store per user
    if (req.user.role === "tenant_admin") {
      const existing = await Tenant.findOne({ owner: req.user._id });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "You already have a registered store",
        });
      }
    }

    const tenant = await Tenant.create({
      name,
      description,
      category,
      contactEmail: contactEmail || req.user.email,
      contactPhone,
      address,
      logo,
      banner,
      owner: req.user._id,
    });

    // Bind tenant to the owner's user record
    await User.findByIdAndUpdate(req.user._id, { tenantId: tenant._id });

    res.status(201).json({ success: true, data: tenant });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "A store with that name already exists" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/tenants/:tenantSlug — public store profile ────────
router.get("/:tenantSlug", resolveTenant, async (req, res) => {
  const tenant = await req.tenant.populate("owner", "name avatar").execPopulate
    ? req.tenant
    : req.tenant;
  res.json({ success: true, data: req.tenant });
});

// ── PUT /api/tenants/:tenantSlug — update store settings ───────
router.put(
  "/:tenantSlug",
  protect,
  authorize("tenant_admin", "superadmin"),
  resolveTenant,
  guardTenantScope,
  async (req, res) => {
    try {
      const allowedUpdates = [
        "description", "logo", "banner", "contactEmail",
        "contactPhone", "address",
      ];
      const updates = {};
      allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      });

      const tenant = await Tenant.findByIdAndUpdate(
        req.tenant._id,
        updates,
        { new: true, runValidators: true }
      );

      res.json({ success: true, data: tenant });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ── PATCH /api/tenants/:tenantSlug/suspend — superadmin only ───
router.patch(
  "/:tenantSlug/suspend",
  protect,
  authorize("superadmin"),
  resolveTenant,
  async (req, res) => {
    try {
      const { reason } = req.body;
      const tenant = await Tenant.findByIdAndUpdate(
        req.tenant._id,
        { isSuspended: true, suspensionReason: reason },
        { new: true }
      );
      res.json({ success: true, message: "Store suspended", data: tenant });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ── PATCH /api/tenants/:tenantSlug/verify — superadmin verifies ─
router.patch(
  "/:tenantSlug/verify",
  protect,
  authorize("superadmin"),
  resolveTenant,
  async (req, res) => {
    try {
      const tenant = await Tenant.findByIdAndUpdate(
        req.tenant._id,
        { isVerified: true },
        { new: true }
      );
      res.json({ success: true, message: "Store verified", data: tenant });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ── GET /api/tenants/:tenantSlug/analytics — store dashboard ───
router.get(
  "/:tenantSlug/analytics",
  protect,
  authorize("tenant_admin", "superadmin"),
  resolveTenant,
  guardTenantScope,
  async (req, res) => {
    try {
      const { OrderModel, ProductModel, tenant } = req;

      const [
        totalOrders,
        pendingOrders,
        deliveredOrders,
        totalRevenue,
        totalProducts,
        activeProducts,
      ] = await Promise.all([
        OrderModel.countDocuments(),
        OrderModel.countDocuments({ status: "pending" }),
        OrderModel.countDocuments({ status: "delivered" }),
        OrderModel.aggregate([
          { $match: { paymentStatus: "paid" } },
          { $group: { _id: null, total: { $sum: "$tenantEarnings" } } },
        ]),
        ProductModel.countDocuments(),
        ProductModel.countDocuments({ status: "active" }),
      ]);

      // Monthly revenue for the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const monthlyRevenue = await OrderModel.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo }, paymentStatus: "paid" } },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            revenue: { $sum: "$tenantEarnings" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]);

      res.json({
        success: true,
        data: {
          overview: {
            totalOrders,
            pendingOrders,
            deliveredOrders,
            totalRevenue: totalRevenue[0]?.total || 0,
            totalProducts,
            activeProducts,
            avgRating: tenant.stats.avgRating,
          },
          monthlyRevenue,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
