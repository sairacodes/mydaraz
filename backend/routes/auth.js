const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const Tenant = require("../models/Tenant");
const jwt = require("jsonwebtoken");
const { protect } = require("../middleware/auth");

// ── Validation helpers ─────────────────────────────────────────
const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  return null;
};

const sendTokenResponse = (user, statusCode, res) => {
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Store refresh token hash in DB (stateless + revocable pattern from lecture)
  user.refreshToken = refreshToken;
  user.save({ validateBeforeSave: false });

  res.status(statusCode).json({
    success: true,
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      avatar: user.avatar,
    },
  });
};

// ── POST /api/auth/register ─────────────────────────────────────
router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be 6+ characters"),
    body("role")
      .optional()
      .isIn(["customer", "tenant_admin"])
      .withMessage("Invalid role"),
  ],
  async (req, res) => {
    const err = handleValidation(req, res);
    if (err) return;

    try {
      const { name, email, password, role = "customer", phone } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ success: false, message: "Email already registered" });
      }

      const user = await User.create({ name, email, password, role, phone });
      sendTokenResponse(user, 201, res);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ── POST /api/auth/login ────────────────────────────────────────
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  async (req, res) => {
    const err = handleValidation(req, res);
    if (err) return;

    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email }).select("+password +refreshToken");

      if (!user) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      // Account lock check (lecture: session hijacking prevention)
      if (user.isLocked) {
        return res.status(403).json({
          success: false,
          message: "Account temporarily locked. Try again later.",
        });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        user.loginAttempts = (user.loginAttempts || 0) + 1;
        if (user.loginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
        }
        await user.save({ validateBeforeSave: false });
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      // Reset login attempts on success
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      user.lastLogin = new Date();

      sendTokenResponse(user, 200, res);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ── POST /api/auth/refresh ──────────────────────────────────────
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: "Refresh token required" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select("+refreshToken");

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }

    const newAccessToken = user.generateAccessToken();
    res.json({ success: true, accessToken: newAccessToken });
  } catch {
    res.status(401).json({ success: false, message: "Refresh token expired or invalid" });
  }
});

// ── POST /api/auth/logout ───────────────────────────────────────
router.post("/logout", protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/auth/me ────────────────────────────────────────────
router.get("/me", protect, async (req, res) => {
  const user = await User.findById(req.user._id).populate("tenantId", "name slug logo");
  res.json({ success: true, user });
});

module.exports = router;
