require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { connectDB } = require("./config/db");

const app = express();

// ── Connect Database ───────────────────────────────────────────
connectDB();

// ── Security Middleware (from lecture: ExpressJS security) ──────
app.use(helmet()); // sets secure HTTP headers

// Rate limiting (lecture: preventing abuse)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many auth attempts, please try again in 15 minutes" },
});

app.use(limiter);

// ── General Middleware ─────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

// ── Health check ───────────────────────────────────────────────
app.get("/api/health", (req, res) =>
  res.json({
    success: true,
    message: "Multi-Tenant Daraz API is running",
    architecture: "Shared DB · Separate Schema per Tenant",
    timestamp: new Date().toISOString(),
  })
);

// ── API Routes ─────────────────────────────────────────────────
app.use("/api/auth", authLimiter, require("./routes/auth"));
app.use("/api/tenants", require("./routes/tenants"));
app.use("/api/admin", require("./routes/admin"));

// ─ Nested tenant resource routes ──────────────────────────────
// Products:  /api/tenants/:tenantSlug/products
// Orders:    /api/tenants/:tenantSlug/orders
app.use("/api/tenants/:tenantSlug/products", require("./routes/products"));
app.use("/api/tenants/:tenantSlug/orders", require("./routes/orders"));

// ── Platform-wide product search (cross-tenant) ────────────────
app.get("/api/search", async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, page = 1, limit = 20 } = req.query;
    if (!q) return res.status(400).json({ success: false, message: "Query param 'q' required" });

    const mongoose = require("mongoose");
    const { getTenantModel } = require("./config/db");
    const productSchema = require("./models/productSchema");
    const Tenant = require("./models/Tenant");

    const activeTenants = await Tenant.find({ isActive: true, isSuspended: false }).select("slug");
    const results = [];

    for (const tenant of activeTenants) {
      const ProductModel = getTenantModel(tenant.slug, "Product", productSchema);
      const filter = { status: "active", $text: { $search: q } };
      if (category) filter.category = category;
      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = Number(minPrice);
        if (maxPrice) filter.price.$lte = Number(maxPrice);
      }

      const products = await ProductModel.find(filter)
        .select("name slug price compareAtPrice images ratings tenantSlug tenantId category brand")
        .limit(10);

      results.push(...products);
    }

    // Sort by relevance score (text search score)
    results.sort((a, b) => (b.ratings?.average || 0) - (a.ratings?.average || 0));

    const start = (page - 1) * limit;
    res.json({
      success: true,
      query: q,
      data: results.slice(start, start + Number(limit)),
      total: results.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── 404 handler ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global error handler ───────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("💥 Unhandled error:", err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║   🚀 Multi-Tenant Daraz API — Port ${PORT}             ║
  ║   📦 Architecture: Shared DB · Separate Schema       ║
  ║   🔐 Security: JWT + RBAC (superadmin/tenant/customer)║
  ╚══════════════════════════════════════════════════════╝
  `);
});
