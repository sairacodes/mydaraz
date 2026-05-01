const Tenant = require("../models/Tenant");
const { getTenantModel } = require("../config/db");
const productSchema = require("../models/productSchema");
const orderSchema = require("../models/orderSchema");

// ── Tenant Resolution Middleware ───────────────────────────────
// Resolves tenant from:
//   1. URL param  :  /api/tenants/:tenantSlug/...
//   2. Request header  :  X-Tenant-Slug: electronics-hub
//   3. Subdomain  :  electronics-hub.daraz-clone.com  (prod)
//
// Injects:
//   req.tenant       — Tenant document
//   req.ProductModel — tenant-scoped Product model
//   req.OrderModel   — tenant-scoped Order model

const resolveTenant = async (req, res, next) => {
  try {
    let tenantSlug =
      req.params.tenantSlug ||
      req.headers["x-tenant-slug"] ||
      extractSubdomain(req);

    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        message: "Tenant identifier required (slug param, X-Tenant-Slug header, or subdomain)",
      });
    }

    tenantSlug = tenantSlug.toLowerCase().trim();

    const tenant = await Tenant.findOne({
      slug: tenantSlug,
      isActive: true,
      isSuspended: false,
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: `Store '${tenantSlug}' not found or is not active`,
      });
    }

    // Inject tenant and its per-tenant Mongoose models
    req.tenant = tenant;
    req.tenantSlug = tenantSlug;
    req.ProductModel = getTenantModel(tenantSlug, "Product", productSchema);
    req.OrderModel = getTenantModel(tenantSlug, "Order", orderSchema);

    next();
  } catch (err) {
    console.error("Tenant resolution error:", err);
    res.status(500).json({ success: false, message: "Tenant resolution failed" });
  }
};

// ── Optional tenant resolution (doesn't block if missing) ─────
const optionalTenant = async (req, res, next) => {
  try {
    const tenantSlug =
      req.params.tenantSlug ||
      req.headers["x-tenant-slug"];

    if (!tenantSlug) return next();

    const tenant = await Tenant.findOne({ slug: tenantSlug, isActive: true });
    if (tenant) {
      req.tenant = tenant;
      req.tenantSlug = tenantSlug;
      req.ProductModel = getTenantModel(tenantSlug, "Product", productSchema);
      req.OrderModel = getTenantModel(tenantSlug, "Order", orderSchema);
    }
  } catch (_) { /* silent */ }
  next();
};

// ── Subdomain extractor (production use) ──────────────────────
function extractSubdomain(req) {
  const host = req.headers.host || "";
  const parts = host.split(".");
  // e.g. electronics-hub.daraz-clone.com → 'electronics-hub'
  if (parts.length >= 3) return parts[0];
  return null;
}

module.exports = { resolveTenant, optionalTenant };
