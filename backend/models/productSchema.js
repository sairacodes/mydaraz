const mongoose = require("mongoose");

// ── Product Schema ─────────────────────────────────────────────
// NOT registered as a global model directly.
// Used via getTenantModel(slug, 'Product', productSchema)
// which creates: tenant_<slug>_products collection.
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [200, "Name cannot exceed 200 characters"],
    },
    slug: { type: String, lowercase: true },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    shortDescription: { type: String, maxlength: [300] },
    sku: { type: String, trim: true },

    // Pricing
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    compareAtPrice: { type: Number }, // original/crossed-out price
    costPrice: { type: Number },      // seller's cost (not public)

    // Category & tags
    category: { type: String, required: true },
    subCategory: String,
    tags: [String],
    brand: String,

    // Media
    images: [
      {
        url: { type: String, required: true },
        alt: String,
        isPrimary: { type: Boolean, default: false },
      },
    ],

    // Inventory
    stock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    isInStock: { type: Boolean, default: true },

    // Variants (sizes, colors, etc.)
    variants: [
      {
        name: String, // e.g. "Size"
        options: [
          {
            value: String,   // e.g. "XL"
            price: Number,   // optional override
            stock: Number,
            sku: String,
          },
        ],
      },
    ],

    // Attributes (flexible key-value for category-specific fields)
    attributes: { type: Map, of: String },

    // Shipping
    weight: Number, // kg
    dimensions: { length: Number, width: Number, height: Number },
    requiresShipping: { type: Boolean, default: true },

    // Status
    status: {
      type: String,
      enum: ["draft", "active", "archived", "out_of_stock"],
      default: "draft",
    },
    isFeatured: { type: Boolean, default: false },

    // Reviews & Ratings
    ratings: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    reviews: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        userName: String,
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
        createdAt: { type: Date, default: Date.now },
        isVerifiedPurchase: { type: Boolean, default: false },
      },
    ],

    // Cross-tenant reference fields stored in product for platform-level features
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
    tenantSlug: { type: String, required: true },

    // SEO
    metaTitle: String,
    metaDescription: String,

    totalSold: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ status: 1, category: 1 });
productSchema.index({ price: 1 });

// Auto-slug
productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    const slugify = require("slugify");
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  // Sync isInStock with stock
  this.isInStock = this.stock > 0;
  next();
});

module.exports = productSchema; // export schema, not model
