const express = require("express");
const router = express.Router({ mergeParams: true }); // inherit tenantSlug param
const Tenant = require("../models/Tenant");
const { protect, authorize, guardTenantScope } = require("../middleware/auth");
const { resolveTenant, optionalTenant } = require("../middleware/tenant");

// ── GET /api/tenants/:tenantSlug/products ──────────────────────
// Public: browse a store's products
router.get("/", resolveTenant, async (req, res) => {
  try {
    const {
      search, category, minPrice, maxPrice,
      status = "active", sort = "-createdAt",
      page = 1, limit = 20, featured,
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (featured === "true") filter.isFeatured = true;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (search) filter.$text = { $search: search };

    const products = await req.ProductModel.find(filter)
      .select("-reviews -costPrice -attributes")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await req.ProductModel.countDocuments(filter);

    res.json({
      success: true,
      data: products,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/tenants/:tenantSlug/products/:id ──────────────────
router.get("/:id", resolveTenant, async (req, res) => {
  try {
    const product = await req.ProductModel.findById(req.params.id);
    if (!product || product.status === "archived") {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /api/tenants/:tenantSlug/products ─────────────────────
// Tenant admin creates a product in their OWN schema
router.post(
  "/",
  protect,
  authorize("tenant_admin", "superadmin"),
  resolveTenant,
  guardTenantScope,
  async (req, res) => {
    try {
      const {
        name, description, shortDescription, price, compareAtPrice,
        costPrice, category, subCategory, tags, brand,
        images, stock, variants, attributes, weight, dimensions,
        status, isFeatured, metaTitle, metaDescription, sku,
      } = req.body;

      const product = await req.ProductModel.create({
        name, description, shortDescription, price, compareAtPrice,
        costPrice, category, subCategory, tags, brand,
        images: images || [{ url: "https://via.placeholder.com/400", isPrimary: true }],
        stock: stock || 0,
        variants, attributes, weight, dimensions,
        status: status || "active",
        isFeatured: isFeatured || false,
        metaTitle, metaDescription, sku,
        tenantId: req.tenant._id,
        tenantSlug: req.tenantSlug,
      });

      // Update tenant stats
      await Tenant.findByIdAndUpdate(req.tenant._id, {
        $inc: { "stats.totalProducts": 1 },
      });

      res.status(201).json({ success: true, data: product });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ── PUT /api/tenants/:tenantSlug/products/:id ──────────────────
router.put(
  "/:id",
  protect,
  authorize("tenant_admin", "superadmin"),
  resolveTenant,
  guardTenantScope,
  async (req, res) => {
    try {
      const product = await req.ProductModel.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!product) return res.status(404).json({ success: false, message: "Product not found" });
      res.json({ success: true, data: product });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ── DELETE /api/tenants/:tenantSlug/products/:id ───────────────
router.delete(
  "/:id",
  protect,
  authorize("tenant_admin", "superadmin"),
  resolveTenant,
  guardTenantScope,
  async (req, res) => {
    try {
      const product = await req.ProductModel.findByIdAndUpdate(
        req.params.id,
        { status: "archived" },
        { new: true }
      );
      if (!product) return res.status(404).json({ success: false, message: "Product not found" });

      await Tenant.findByIdAndUpdate(req.tenant._id, {
        $inc: { "stats.totalProducts": -1 },
      });

      res.json({ success: true, message: "Product archived successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ── POST /api/tenants/:tenantSlug/products/:id/review ─────────
router.post(
  "/:id/review",
  protect,
  authorize("customer"),
  resolveTenant,
  async (req, res) => {
    try {
      const { rating, comment } = req.body;
      const product = await req.ProductModel.findById(req.params.id);
      if (!product) return res.status(404).json({ success: false, message: "Product not found" });

      const alreadyReviewed = product.reviews.find(
        (r) => r.userId.toString() === req.user._id.toString()
      );
      if (alreadyReviewed) {
        return res.status(409).json({ success: false, message: "You already reviewed this product" });
      }

      product.reviews.push({
        userId: req.user._id,
        userName: req.user.name,
        rating: Number(rating),
        comment,
        isVerifiedPurchase: false,
      });

      // Recalculate average rating
      product.ratings.count = product.reviews.length;
      product.ratings.average =
        product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length;

      await product.save();
      res.status(201).json({ success: true, data: product.ratings });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
