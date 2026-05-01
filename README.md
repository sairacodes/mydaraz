# Multi-Tenant Daraz Clone — MERN Stack

A production-grade multi-tenant marketplace (like Daraz.pk) built with the **MERN stack**.  
Architecture: **Shared Database · Separate Schema per Tenant**

---

## 🏗️ Architecture

```
MongoDB (Single Database: multitenant_daraz)
├── users           ← Shared: all platform users (superadmin, tenant_admin, customer)
├── tenants         ← Shared: store registry
├── tenant_techzone-electronics_products  ← Isolated per store
├── tenant_techzone-electronics_orders    ← Isolated per store
├── tenant_fashionista-pk_products
├── tenant_fashionista-pk_orders
└── tenant_bookworld-pakistan_products
    tenant_bookworld-pakistan_orders
    ... (grows automatically as stores register)
```

### Why Shared DB + Separate Schema?

| Aspect            | Separate DB | **Separate Schema** ✅ | Single Schema |
|-------------------|-------------|------------------------|---------------|
| Data isolation    | ✅ Full     | ✅ Collection-level    | ❌ Row-level only |
| Cost              | ❌ High     | ✅ Low                 | ✅ Low |
| Scalability       | ✅          | ✅                     | ⚠️ Limited |
| Cross-tenant query| ❌ Hard     | ⚠️ Possible via loop   | ✅ Easy |
| Setup complexity  | ❌ High     | ✅ Medium              | ✅ Low |

---

## 🔐 Security (from ExpressJS Lecture)

| Feature | Implementation |
|---------|----------------|
| JWT Auth | Access token (7d) + Refresh token (30d) |
| RBAC | `superadmin` / `tenant_admin` / `customer` |
| Tenant Scope Guard | Prevents sellers from accessing other stores |
| Rate Limiting | 200 req/15min global, 20 req/15min for auth |
| Helmet | Secure HTTP headers |
| bcrypt | Password hashing (salt rounds: 12) |
| Account Lock | 5 failed attempts → 15-min lockout |

---

## 📁 Project Structure

```
multitenant-daraz/
├── backend/
│   ├── config/
│   │   └── db.js              ← connectDB() + getTenantModel() factory
│   ├── middleware/
│   │   ├── auth.js            ← JWT protect, RBAC authorize, tenant scope guard
│   │   └── tenant.js          ← Resolves tenant + injects per-tenant models
│   ├── models/
│   │   ├── User.js            ← Shared users collection
│   │   ├── Tenant.js          ← Shared tenants collection
│   │   ├── productSchema.js   ← Schema only (used with getTenantModel)
│   │   └── orderSchema.js     ← Schema only (used with getTenantModel)
│   ├── routes/
│   │   ├── auth.js            ← /api/auth/*
│   │   ├── tenants.js         ← /api/tenants/*
│   │   ├── products.js        ← /api/tenants/:slug/products/*
│   │   ├── orders.js          ← /api/tenants/:slug/orders/*
│   │   └── admin.js           ← /api/admin/*
│   ├── utils/
│   │   └── seed.js            ← Demo data seeder
│   └── server.js              ← Express app entry point
│
└── frontend/
    └── src/
        ├── components/
        │   ├── Navbar.jsx
        │   └── ProtectedRoute.jsx
        ├── context/
        │   ├── AuthContext.jsx    ← Global auth + RBAC state
        │   └── ToastContext.jsx
        ├── pages/
        │   ├── HomePage.jsx
        │   ├── AuthPages.jsx      ← Login + Register
        │   ├── StoresPage.jsx     ← Store listing
        │   ├── StorePage.jsx      ← Store + products
        │   ├── ProductPage.jsx    ← Product detail + order
        │   ├── SellerPages.jsx    ← Dashboard, products, orders
        │   ├── AdminPages.jsx     ← Superadmin + customer orders
        │   └── SearchPage.jsx     ← Cross-tenant search
        ├── utils/
        │   └── api.js             ← Axios + JWT interceptors
        └── App.jsx                ← Routes
```

---

## 🚀 Setup & Run

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm

### 1. Clone & Install

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env: set MONGO_URI and JWT_SECRET

# Frontend
cd ../frontend
npm install
```

### 2. Seed Database

```bash
cd backend
npm run seed
```

This creates:
- 3 stores with isolated collections
- Demo products in each store's own collection
- Test users (admin, sellers, customer)

### 3. Start Dev Servers

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# → http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# → http://localhost:5173
```

---

## 🔑 Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@daraz-clone.pk | Admin@1234 |
| Seller (TechZone) | ahmed@techzone.pk | Seller@1234 |
| Seller (Fashionista) | sara@fashionista.pk | Seller@1234 |
| Customer | fatima@gmail.com | Customer@1234 |

---

## 📡 API Endpoints

### Auth
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

### Public
```
GET  /api/tenants                              ← List all stores
GET  /api/tenants/:slug                        ← Store profile
GET  /api/tenants/:slug/products               ← Store products
GET  /api/tenants/:slug/products/:id           ← Product detail
GET  /api/search?q=laptop                      ← Cross-tenant search
```

### Seller (tenant_admin)
```
POST   /api/tenants                            ← Create store
PUT    /api/tenants/:slug                      ← Update store
POST   /api/tenants/:slug/products             ← Add product
PUT    /api/tenants/:slug/products/:id         ← Edit product
DELETE /api/tenants/:slug/products/:id         ← Archive product
GET    /api/tenants/:slug/orders               ← View store orders
PATCH  /api/tenants/:slug/orders/:id/status   ← Update order status
GET    /api/tenants/:slug/analytics            ← Store analytics
```

### Customer
```
POST /api/tenants/:slug/orders                 ← Place order
GET  /api/tenants/:slug/orders/my              ← My orders in this store
```

### Superadmin
```
GET   /api/admin/dashboard
GET   /api/admin/tenants
GET   /api/admin/users
PATCH /api/admin/users/:id/toggle
PATCH /api/tenants/:slug/verify
PATCH /api/tenants/:slug/suspend
GET   /api/admin/collections                   ← DB schema inspector
```

---

## 🎓 Multi-Tenancy Core — Key Code

### getTenantModel (config/db.js)
```js
// Each tenant gets their own MongoDB collection automatically
const getTenantModel = (tenantSlug, modelName, schema) => {
  const collectionName = `tenant_${tenantSlug}_${modelName.toLowerCase()}s`;
  return mongoose.model(cacheKey, schema, collectionName);
};
```

### Tenant Middleware (middleware/tenant.js)
```js
// Injected on every /api/tenants/:slug/* request
req.tenant       = <Tenant document>
req.ProductModel = getTenantModel(slug, 'Product', productSchema)
req.OrderModel   = getTenantModel(slug, 'Order',   orderSchema)
```

### RBAC Authorization (middleware/auth.js)
```js
// Route protection (from lecture: RBAC Implementation)
router.post('/', protect, authorize('tenant_admin'), resolveTenant, guardTenantScope, handler)
```

---

## 🧑‍🏫 Lecture Concepts Applied

| Lecture Topic | Applied In |
|--------------|-----------|
| JWT lifecycle (header.payload.signature) | `auth.js` routes + `api.js` interceptors |
| Refresh tokens | `/auth/refresh` + localStorage + auto-retry |
| RBAC (Role-Based Access Control) | `authorize()` middleware, 3 roles |
| Session security / account locking | Login attempts + lockUntil field |
| Helmet / secure headers | `server.js` |
| Rate limiting | Auth limiter (20/15min) + global (200/15min) |
| Stateless auth | JWT — no server-side session storage |
| Access control enforcement (server-side) | `guardTenantScope` middleware |
