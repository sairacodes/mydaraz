const mongoose = require("mongoose");

// ── Order Schema ───────────────────────────────────────────────
// Per-tenant collection: tenant_<slug>_orders
const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
    },
    // Buyer
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customerName: String,
    customerEmail: String,
    customerPhone: String,

    // Tenant reference (for platform-level order aggregation)
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
    tenantSlug: String,

    // Order Items
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, required: true },
        productName: String,
        productImage: String,
        sku: String,
        variantName: String,
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true },
        totalPrice: { type: Number, required: true },
      },
    ],

    // Pricing breakdown
    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    couponCode: String,
    taxAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    // Platform commission
    platformCommission: { type: Number, default: 0 },
    tenantEarnings: { type: Number, default: 0 },

    // Shipping Address
    shippingAddress: {
      fullName: String,
      street: String,
      city: String,
      province: String,
      postalCode: String,
      country: { type: String, default: "Pakistan" },
      phone: String,
    },

    // Status flow: pending → confirmed → processing → shipped → delivered | cancelled | refunded
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      default: "pending",
    },
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: String,
        note: String,
      },
    ],

    // Payment
    paymentMethod: {
      type: String,
      enum: ["cod", "card", "easypaisa", "jazzcash", "bank_transfer"],
      default: "cod",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentReference: String,
    paidAt: Date,

    // Shipping
    trackingNumber: String,
    carrier: String,
    estimatedDelivery: Date,
    deliveredAt: Date,

    // Notes
    customerNote: String,
    internalNote: String,

    // Cancellation
    cancelledAt: Date,
    cancellationReason: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate order number
orderSchema.pre("save", function (next) {
  if (!this.orderNumber) {
    const ts = Date.now().toString().slice(-8);
    const rand = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    this.orderNumber = `ORD-${ts}-${rand}`;
  }
  next();
});

orderSchema.index({ customerId: 1, status: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = orderSchema;
