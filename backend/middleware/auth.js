const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ── Protect Route: verify JWT ──────────────────────────────────
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized — no token provided",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Token is valid but user no longer exists",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account has been deactivated",
      });
    }

    if (user.isLocked) {
      return res.status(403).json({
        success: false,
        message: "Account temporarily locked due to too many failed login attempts",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired" });
    }
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

// ── RBAC: restrict to specific roles (Lecture: RBAC Implementation) ──
// Usage: authorize('superadmin', 'tenant_admin')
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`,
      });
    }
    next();
  };
};

// ── Tenant Scope Guard ─────────────────────────────────────────
// Ensures tenant_admin can ONLY modify their own tenant's data.
// Superadmin bypasses this check.
const guardTenantScope = (req, res, next) => {
  if (req.user.role === "superadmin") return next();

  const tenantIdFromToken = req.user.tenantId?.toString();
  const tenantIdFromParam =
    req.params.tenantId || req.tenant?._id?.toString();

  if (!tenantIdFromParam) return next(); // no tenant param, route-level auth handles it

  if (tenantIdFromToken !== tenantIdFromParam) {
    return res.status(403).json({
      success: false,
      message: "Access denied — you can only manage your own store",
    });
  }
  next();
};

// ── Optional Auth: attach user if token present, don't block ──
const optionalAuth = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
  } catch (_) {
    // invalid token → just proceed without user
  }
  next();
};

module.exports = { protect, authorize, guardTenantScope, optionalAuth };
