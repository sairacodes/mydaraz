const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Tenant = require("../models/Tenant");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");
const { getTenantModel } = require("../config/db");
const productSchema = require("../models/productSchema");
const orderSchema = require("../models/orderSchema");

// All admin routes require superadmin role (RBAC from lecture)
router.use(protect, authorize("superadmin"));

// ── GET /api/admin/dashboard ────────────────────────────────────
router.get("/dashboard", async (req, res) => {
  try {
    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalUsers,
      totalCustomers,
      totalSellers,
    ] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.countDocuments({ isActive: true, isSuspended: false }),
      Tenant.countDocuments({ isSuspended: true }),
      User.countDocuments(),
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ role: "tenant_admin" }),
    ]);

    // Platform-wide revenue (sum across all tenant schemas)
    const allTenants = await Tenant.find().select("slug stats");
    let platformRevenue = 0;
    let platformOrders = 0;

    for (const tenant of allTenants) {
      platformRevenue += tenant.stats.totalRevenue || 0;
      platformOrders += tenant.stats.totalOrders || 0;
    }

    // Recent signups
    const recentUsers = await User.find()
      .select("name email role createdAt")
      .sort("-createdAt")
      .limit(10);

    // Top stores by revenue
    const topStores = await Tenant.find()
      .select("name slug stats category isVerified")
      .sort({ "stats.totalRevenue": -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        overview: {
          totalTenants,
          activeTenants,
          suspendedTenants,
          totalUsers,
          totalCustomers,
          totalSellers,
          platformRevenue,
          platformOrders,
        },
        recentUsers,
        topStores,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/admin/tenants ─────────────────────────────────────
router.get("/tenants", async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = {};
    if (status === "suspended") filter.isSuspended = true;
    else if (status === "active") filter.isActive = true, filter.isSuspended = false;
    else if (status === "unverified") filter.isVerified = false;

    const tenants = await Tenant.find(filter)
      .populate("owner", "name email")
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Tenant.countDocuments(filter);
    res.json({ success: true, data: tenants, pagination: { total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/admin/users ───────────────────────────────────────
router.get("/users", async (req, res) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const filter = role ? { role } : {};
    const users = await User.find(filter)
      .populate("tenantId", "name slug")
      .select("-password -refreshToken")
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await User.countDocuments(filter);
    res.json({ success: true, data: users, pagination: { total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── PATCH /api/admin/users/:id/toggle ─────────────────────────
router.patch("/users/:id/toggle", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: `User ${user.isActive ? "activated" : "deactivated"}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/admin/collections — list all tenant collections ───
router.get("/collections", async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const tenantCollections = collections
      .map((c) => c.name)
      .filter((n) => n.startsWith("tenant_"))
      .sort();

    res.json({ success: true, data: tenantCollections });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
