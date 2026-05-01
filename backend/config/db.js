const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// ─────────────────────────────────────────────────────────────
//  DYNAMIC TENANT MODEL FACTORY
//  Core of the "Shared DB, Separate Schema" pattern.
//  Each tenant gets its own Mongoose model bound to its own
//  collection (tenant_<slug>_products, tenant_<slug>_orders).
// ─────────────────────────────────────────────────────────────
const tenantModelCache = {};

const getTenantModel = (tenantSlug, modelName, schema) => {
  const cacheKey = `${tenantSlug}_${modelName}`;

  if (tenantModelCache[cacheKey]) {
    return tenantModelCache[cacheKey];
  }

  // Collection per tenant: tenant_electronics_products, tenant_fashion_orders, etc.
  const collectionName = `tenant_${tenantSlug}_${modelName.toLowerCase()}s`;
  const model = mongoose.model(cacheKey, schema, collectionName);
  tenantModelCache[cacheKey] = model;

  console.log(`🗃️  Registered model "${cacheKey}" → collection "${collectionName}"`);
  return model;
};

module.exports = { connectDB, getTenantModel };
