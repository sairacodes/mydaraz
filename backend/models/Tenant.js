const mongoose = require("mongoose");
const slugify = require("slugify");

// ── Shared collection: "tenants" (one per platform) ───────────
const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Store name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    logo: {
      type: String,
      default: "https://via.placeholder.com/150",
    },
    banner: {
      type: String,
      default: "https://via.placeholder.com/1200x300",
    },
    category: {
      type: String,
      enum: [
        "Electronics",
        "Fashion",
        "Grocery",
        "Books",
        "Sports",
        "Home & Kitchen",
        "Health & Beauty",
        "Toys",
        "Automotive",
        "Other",
      ],
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Contact Info
    contactEmail: { type: String, required: true },
    contactPhone: { type: String },
    address: {
      street: String,
      city: String,
      province: String,
      country: { type: String, default: "Pakistan" },
    },
    // Business settings
    commissionRate: {
      type: Number,
      default: 5, // platform takes 5% of each sale
      min: 0,
      max: 50,
    },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isSuspended: { type: Boolean, default: false },
    suspensionReason: String,
    // Analytics snapshot (updated via cron/hooks)
    stats: {
      totalProducts: { type: Number, default: 0 },
      totalOrders: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      avgRating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },
    // Plan / subscription tier
    plan: {
      type: String,
      enum: ["free", "starter", "professional", "enterprise"],
      default: "free",
    },
    planExpiry: Date,

    // Schema version — supports future migrations per tenant
    schemaVersion: { type: Number, default: 1 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate slug from store name
tenantSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Virtual: collection prefix used in getTenantModel
tenantSchema.virtual("collectionPrefix").get(function () {
  return `tenant_${this.slug}`;
});

module.exports = mongoose.model("Tenant", tenantSchema);
