require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { connectDB, getTenantModel } = require("../config/db");
const User = require("../models/User");
const Tenant = require("../models/Tenant");
const productSchema = require("../models/productSchema");
const orderSchema = require("../models/orderSchema");

const seed = async () => {
  await connectDB();

  // Clear existing data
  await User.deleteMany({});
  await Tenant.deleteMany({});
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const col of collections) {
    if (col.name.startsWith("tenant_")) {
      await mongoose.connection.db.dropCollection(col.name);
    }
  }

  console.log("🗑️  Cleared existing data");

  // ── Create Users ───────────────────────────────────────────
  const superadmin = await User.create({
    name: "Platform Admin",
    email: "admin@daraz-clone.pk",
    password: "Admin@1234",
    role: "superadmin",
  });

  const seller1 = await User.create({
    name: "Ahmed Khan",
    email: "ahmed@techzone.pk",
    password: "Seller@1234",
    role: "tenant_admin",
  });

  const seller2 = await User.create({
    name: "Sara Malik",
    email: "sara@fashionista.pk",
    password: "Seller@1234",
    role: "tenant_admin",
  });

  const seller3 = await User.create({
    name: "Bilal Rao",
    email: "bilal@bookworld.pk",
    password: "Seller@1234",
    role: "tenant_admin",
  });

  const customer1 = await User.create({
    name: "Fatima Ali",
    email: "fatima@gmail.com",
    password: "Customer@1234",
    role: "customer",
  });

  console.log("👥 Users created");

  // ── Create Tenants ─────────────────────────────────────────
  const tenant1 = await Tenant.create({
    name: "TechZone Electronics",
    description: "Pakistan's best electronics and gadgets store",
    category: "Electronics",
    owner: seller1._id,
    contactEmail: "ahmed@techzone.pk",
    contactPhone: "+92-300-1234567",
    logo: "https://placehold.co/150x150/1a73e8/white?text=TZ",
    banner: "https://placehold.co/1200x300/1a73e8/white?text=TechZone+Electronics",
    address: { city: "Karachi", province: "Sindh" },
    isVerified: true,
    commissionRate: 5,
    plan: "professional",
    stats: { totalProducts: 0, totalOrders: 0, totalRevenue: 0, avgRating: 4.5 },
  });

  const tenant2 = await Tenant.create({
    name: "Fashionista PK",
    description: "Trendy Pakistani and international fashion",
    category: "Fashion",
    owner: seller2._id,
    contactEmail: "sara@fashionista.pk",
    logo: "https://placehold.co/150x150/e91e63/white?text=FP",
    banner: "https://placehold.co/1200x300/e91e63/white?text=Fashionista+PK",
    address: { city: "Lahore", province: "Punjab" },
    isVerified: true,
    commissionRate: 8,
    plan: "starter",
    stats: { avgRating: 4.2 },
  });

  const tenant3 = await Tenant.create({
    name: "BookWorld Pakistan",
    description: "Books, stationery, and educational materials",
    category: "Books",
    owner: seller3._id,
    contactEmail: "bilal@bookworld.pk",
    logo: "https://placehold.co/150x150/4caf50/white?text=BW",
    banner: "https://placehold.co/1200x300/4caf50/white?text=BookWorld+Pakistan",
    address: { city: "Islamabad", province: "Federal" },
    isVerified: false,
    commissionRate: 3,
    plan: "free",
  });

  // Bind sellers to tenants
  await User.findByIdAndUpdate(seller1._id, { tenantId: tenant1._id });
  await User.findByIdAndUpdate(seller2._id, { tenantId: tenant2._id });
  await User.findByIdAndUpdate(seller3._id, { tenantId: tenant3._id });

  console.log("🏪 Tenants created");

  // ── Create Products per tenant schema ─────────────────────
  const TechProduct = getTenantModel(tenant1.slug, "Product", productSchema);
  const FashionProduct = getTenantModel(tenant2.slug, "Product", productSchema);
  const BookProduct = getTenantModel(tenant3.slug, "Product", productSchema);

  await TechProduct.insertMany([
    {
      name: "Samsung Galaxy S24 Ultra",
      description: "Flagship smartphone with S Pen, 200MP camera, and AI features",
      price: 289999,
      compareAtPrice: 320000,
      category: "Smartphones",
      brand: "Samsung",
      images: [{ url: "https://placehold.co/400x400/1a73e8/white?text=S24+Ultra", isPrimary: true }],
      stock: 15,
      status: "active",
      isFeatured: true,
      tenantId: tenant1._id,
      tenantSlug: tenant1.slug,
      ratings: { average: 4.7, count: 128 },
      tags: ["smartphone", "samsung", "flagship"],
    },
    {
      name: "Apple MacBook Air M3",
      description: "13-inch laptop with Apple M3 chip, 8GB RAM, 256GB SSD",
      price: 349999,
      compareAtPrice: 380000,
      category: "Laptops",
      brand: "Apple",
      images: [{ url: "https://placehold.co/400x400/1a73e8/white?text=MacBook", isPrimary: true }],
      stock: 8,
      status: "active",
      isFeatured: true,
      tenantId: tenant1._id,
      tenantSlug: tenant1.slug,
      ratings: { average: 4.9, count: 67 },
      tags: ["laptop", "apple", "macbook"],
    },
    {
      name: "JBL Tune 770NC Headphones",
      description: "Wireless noise-cancelling headphones with 70 hours battery",
      price: 29999,
      compareAtPrice: 35000,
      category: "Audio",
      brand: "JBL",
      images: [{ url: "https://placehold.co/400x400/1a73e8/white?text=JBL", isPrimary: true }],
      stock: 30,
      status: "active",
      tenantId: tenant1._id,
      tenantSlug: tenant1.slug,
      ratings: { average: 4.4, count: 203 },
    },
  ]);

  await FashionProduct.insertMany([
    {
      name: "Embroidered Lawn Suit",
      description: "Premium summer lawn suit with intricate embroidery work",
      price: 4500,
      compareAtPrice: 6000,
      category: "Women's Clothing",
      brand: "Sana Safinaz",
      images: [{ url: "https://placehold.co/400x400/e91e63/white?text=Lawn+Suit", isPrimary: true }],
      stock: 50,
      status: "active",
      isFeatured: true,
      tenantId: tenant2._id,
      tenantSlug: tenant2.slug,
      ratings: { average: 4.6, count: 312 },
    },
    {
      name: "Men's Casual Shalwar Kameez",
      description: "Comfortable cotton shalwar kameez for everyday wear",
      price: 2200,
      category: "Men's Clothing",
      images: [{ url: "https://placehold.co/400x400/e91e63/white?text=SK", isPrimary: true }],
      stock: 75,
      status: "active",
      tenantId: tenant2._id,
      tenantSlug: tenant2.slug,
      ratings: { average: 4.1, count: 89 },
    },
  ]);

  await BookProduct.insertMany([
    {
      name: "Clean Code by Robert C. Martin",
      description: "A handbook of agile software craftsmanship",
      price: 3500,
      category: "Technology Books",
      brand: "Prentice Hall",
      images: [{ url: "https://placehold.co/400x400/4caf50/white?text=Clean+Code", isPrimary: true }],
      stock: 20,
      status: "active",
      isFeatured: true,
      tenantId: tenant3._id,
      tenantSlug: tenant3.slug,
      ratings: { average: 4.8, count: 445 },
    },
    {
      name: "Urdu Adab Collection - 5 Books",
      description: "Classic Urdu literature collection including works of Manto, Faiz",
      price: 2800,
      category: "Literature",
      images: [{ url: "https://placehold.co/400x400/4caf50/white?text=Urdu+Adab", isPrimary: true }],
      stock: 12,
      status: "active",
      tenantId: tenant3._id,
      tenantSlug: tenant3.slug,
      ratings: { average: 4.9, count: 178 },
    },
  ]);

  console.log("📦 Products seeded into tenant-specific collections:");
  console.log("   • tenant_techzone-electronics_products");
  console.log("   • tenant_fashionista-pk_products");
  console.log("   • tenant_bookworld-pakistan_products");

  console.log("\n✅ Seed complete!\n");
  console.log("═".repeat(50));
  console.log("🔑 Test Credentials:");
  console.log("   SuperAdmin : admin@daraz-clone.pk / Admin@1234");
  console.log("   Seller 1   : ahmed@techzone.pk / Seller@1234");
  console.log("   Seller 2   : sara@fashionista.pk / Seller@1234");
  console.log("   Customer   : fatima@gmail.com / Customer@1234");
  console.log("═".repeat(50));

  process.exit(0);
};

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
