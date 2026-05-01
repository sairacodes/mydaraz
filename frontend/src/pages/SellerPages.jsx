import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// ── Shared Sidebar ─────────────────────────────────────────────
function SellerSidebar({ active }) {
  const links = [
    { path: '/seller',          icon: '📊', label: 'Dashboard'  },
    { path: '/seller/products', icon: '📦', label: 'Products'   },
    { path: '/seller/orders',   icon: '🛒', label: 'Orders'     },
    { path: '/seller/settings', icon: '⚙️',  label: 'Store Settings' },
  ];
  return (
    <div className="sidebar card" style={{ padding: 12, alignSelf: 'flex-start' }}>
      <div style={{ padding: '12px 16px 16px', borderBottom: '1px solid var(--gray-100)', marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--gray-500)', letterSpacing: '.5px' }}>SELLER CENTER</div>
      </div>
      {links.map(l => (
        <Link key={l.path} to={l.path} className={`sidebar-link ${active === l.path ? 'active' : ''}`}>
          <span className="icon">{l.icon}</span>
          {l.label}
        </Link>
      ))}
    </div>
  );
}

// ── Dashboard Overview ─────────────────────────────────────────
export function SellerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData]   = useState(null);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.tenantId) { setLoading(false); return; }
    const fetchStore = async () => {
      try {
        // Get tenant info
        const userRes = await api.get('/auth/me');
        const tenantId = userRes.data.user.tenantId;
        if (!tenantId) { setLoading(false); return; }

        // Find tenant slug from tenants list
        const tenantsRes = await api.get('/tenants?limit=100');
        const myStore = tenantsRes.data.data.find(t => t._id === (tenantId?._id || tenantId));
        if (!myStore) { setLoading(false); return; }

        setStore(myStore);
        const analyticsRes = await api.get(`/tenants/${myStore.slug}/analytics`);
        setData(analyticsRes.data.data);
      } catch (_) {}
      finally { setLoading(false); }
    };
    fetchStore();
  }, [user]);

  if (loading) return (
    <div className="container page" style={{ display: 'flex', gap: 24 }}>
      <SellerSidebar active="/seller" />
      <div style={{ flex: 1 }}><div className="spinner" /></div>
    </div>
  );

  if (!user?.tenantId) {
    return (
      <div className="container page" style={{ display: 'flex', gap: 24 }}>
        <SellerSidebar active="/seller" />
        <div style={{ flex: 1 }}>
          <div className="card" style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 60, marginBottom: 20 }}>🏪</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Set Up Your Store</h2>
            <p className="text-muted" style={{ marginBottom: 24 }}>You haven't created your store yet. Get started in minutes!</p>
            <Link to="/seller/onboard" className="btn btn-primary btn-lg">Create My Store →</Link>
          </div>
        </div>
      </div>
    );
  }

  const ov = data?.overview || {};
  const stats = [
    { icon: '📦', label: 'Total Products',  value: ov.totalProducts || 0,  color: '#dbeafe', iconColor: '#1d4ed8' },
    { icon: '🛒', label: 'Total Orders',    value: ov.totalOrders || 0,    color: '#dcfce7', iconColor: '#166534' },
    { icon: '⏳', label: 'Pending Orders',  value: ov.pendingOrders || 0,  color: '#fef3c7', iconColor: '#92400e' },
    { icon: '💰', label: 'Total Earnings',  value: `PKR ${(ov.totalRevenue||0).toLocaleString()}`, color: '#fff3ee', iconColor: '#d94800' },
  ];

  return (
    <div className="container page" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <SellerSidebar active="/seller" />
      <div style={{ flex: 1 }}>
        <div className="flex-between mb-2">
          <div>
            <h1 className="section-title" style={{ marginBottom: 4 }}>
              {store ? `${store.name}` : 'Dashboard'}
            </h1>
            <p className="text-muted text-sm">Welcome back, {user.name}</p>
          </div>
          <Link to="/seller/products/new" className="btn btn-primary">+ Add Product</Link>
        </div>

        {/* Stats */}
        <div className="grid-4 mb-3">
          {stats.map(s => (
            <div key={s.label} className="card stat-card">
              <div className="stat-icon" style={{ background: s.color }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
              </div>
              <div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Monthly chart placeholder */}
        <div className="card mb-3">
          <div className="card-body">
            <div className="section-title" style={{ fontSize: 16, marginBottom: 16 }}>Revenue Overview (Last 6 months)</div>
            {data?.monthlyRevenue?.length > 0 ? (
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 120 }}>
                {data.monthlyRevenue.map((m, i) => {
                  const maxR = Math.max(...data.monthlyRevenue.map(x => x.revenue));
                  const h = maxR > 0 ? (m.revenue / maxR) * 100 : 10;
                  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, color: 'var(--gray-500)' }}>PKR {(m.revenue/1000).toFixed(0)}k</span>
                      <div style={{ width: '100%', background: 'var(--brand)', borderRadius: '4px 4px 0 0', height: `${h}%`, minHeight: 4, transition: 'height .5s ease' }} />
                      <span style={{ fontSize: 10, color: 'var(--gray-500)' }}>{months[m._id.month - 1]}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 20 }}>
                <p>No revenue data yet — start selling!</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid-3">
          {[
            { icon: '➕', label: 'Add Product',    to: '/seller/products/new',   color: 'var(--brand)' },
            { icon: '📋', label: 'View Orders',    to: '/seller/orders',         color: 'var(--accent)' },
            { icon: '🏪', label: 'View My Store',  to: store ? `/stores/${store.slug}` : '#', color: 'var(--success)' },
          ].map(a => (
            <Link key={a.label} to={a.to} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, cursor: 'pointer', textDecoration: 'none' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${a.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{a.icon}</div>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Store Onboarding ───────────────────────────────────────────
export function SellerOnboard() {
  const { fetchMe } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', description: '', category: 'Electronics', contactEmail: '', contactPhone: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/tenants', form);
      await fetchMe();
      toast('🎉 Store created successfully!', 'success');
      navigate('/seller');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to create store', 'error');
    } finally { setLoading(false); }
  };

  const cats = ['Electronics','Fashion','Grocery','Books','Sports','Home & Kitchen','Health & Beauty','Toys','Automotive','Other'];

  return (
    <div className="container page flex-center" style={{ minHeight: '80vh' }}>
      <div className="card" style={{ width: '100%', maxWidth: 560 }}>
        <div className="card-body" style={{ padding: 40 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🏪</div>
            <h2 style={{ fontSize: 24, fontWeight: 800 }}>Create Your Store</h2>
            <p className="text-muted text-sm">Your store gets its own dedicated product & order database</p>
          </div>

          <div className="card mb-3" style={{ background: 'var(--brand-light)', border: '1px solid #ffd4b8' }}>
            <div className="card-body" style={{ padding: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--brand-dark)' }}>
                💡 <strong>Multi-Tenant Architecture:</strong> Your store data is isolated in its own MongoDB collections:
                <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, margin: '0 4px', fontSize: 11 }}>tenant_[your-store]_products</code>
                <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>tenant_[your-store]_orders</code>
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Store Name *</label>
              <input className="form-control" placeholder="e.g. TechZone Electronics"
                value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="form-control" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                {cats.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Store Description</label>
              <textarea className="form-control" rows={3} placeholder="Tell customers about your store..."
                value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Email *</label>
              <input className="form-control" type="email"
                value={form.contactEmail} onChange={e => setForm({...form, contactEmail: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input className="form-control" placeholder="+92-300-0000000"
                value={form.contactPhone} onChange={e => setForm({...form, contactPhone: e.target.value})} />
            </div>
            <button className="btn btn-primary w-full btn-lg" type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Launch My Store 🚀'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Seller Products ────────────────────────────────────────────
export function SellerProducts() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [storeSlug, setStoreSlug] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const tenantsRes = await api.get('/tenants?limit=100');
        const me = await api.get('/auth/me');
        const tid = me.data.user.tenantId;
        const myStore = tenantsRes.data.data.find(t => t._id === (tid?._id || tid));
        if (!myStore) { setLoading(false); return; }
        setStoreSlug(myStore.slug);
        const pr = await api.get(`/tenants/${myStore.slug}/products?limit=50`);
        setProducts(pr.data.data);
      } catch (_) {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  const archive = async (id) => {
    if (!window.confirm('Archive this product?')) return;
    try {
      await api.delete(`/tenants/${storeSlug}/products/${id}`);
      setProducts(p => p.filter(x => x._id !== id));
      toast('Product archived', 'success');
    } catch (err) { toast(err.response?.data?.message || 'Failed', 'error'); }
  };

  const fmt = n => `PKR ${Number(n).toLocaleString()}`;

  return (
    <div className="container page" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <SellerSidebar active="/seller/products" />
      <div style={{ flex: 1 }}>
        <div className="flex-between mb-3">
          <h1 className="section-title" style={{ marginBottom: 0 }}>My Products</h1>
          {storeSlug && (
            <button className="btn btn-primary" onClick={() => navigate('/seller/products/new')}>
              + Add Product
            </button>
          )}
        </div>

        {loading ? <div className="spinner" /> : products.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📦</div>
            <h3>No products yet</h3>
            <button className="btn btn-primary mt-2" onClick={() => navigate('/seller/products/new')}>Add Your First Product</button>
          </div>
        ) : (
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Sales</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img src={p.images?.[0]?.url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name.slice(0, 40)}{p.name.length > 40 ? '…' : ''}</div>
                          <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{p.category}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--brand)' }}>{fmt(p.price)}</td>
                    <td>
                      <span className={`badge ${p.stock > 5 ? 'badge-success' : p.stock > 0 ? 'badge-warning' : 'badge-danger'}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${p.status === 'active' ? 'badge-success' : 'badge-gray'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.totalSold || 0}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/seller/products/${p._id}/edit`)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => archive(p._id)}>Archive</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add/Edit Product Form ──────────────────────────────────────
export function ProductForm() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [storeSlug, setStoreSlug] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', price: '', compareAtPrice: '', stock: '',
    category: '', brand: '', status: 'active', isFeatured: false,
    images: [{ url: '', isPrimary: true }],
  });

  useEffect(() => {
    const load = async () => {
      try {
        const tenantsRes = await api.get('/tenants?limit=100');
        const me = await api.get('/auth/me');
        const tid = me.data.user.tenantId;
        const myStore = tenantsRes.data.data.find(t => t._id === (tid?._id || tid));
        if (myStore) setStoreSlug(myStore.slug);
      } catch (_) {}
    };
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!storeSlug) return toast('Store not found', 'error');
    setLoading(true);
    try {
      const payload = { ...form, price: Number(form.price), stock: Number(form.stock), compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined };
      await api.post(`/tenants/${storeSlug}/products`, payload);
      toast('Product added!', 'success');
      navigate('/seller/products');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed', 'error');
    } finally { setLoading(false); }
  };

  const cats = ['Electronics','Fashion','Grocery','Books','Sports','Home & Kitchen','Health & Beauty','Toys','Smartphones','Laptops','Audio','Women\'s Clothing','Men\'s Clothing','Technology Books','Literature','Other'];

  return (
    <div className="container page" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <SellerSidebar active="/seller/products" />
      <div style={{ flex: 1 }}>
        <h1 className="section-title">Add New Product</h1>
        <form onSubmit={handleSubmit}>
          <div className="grid-2" style={{ gap: 24, alignItems: 'flex-start' }}>
            <div>
              <div className="card mb-3">
                <div className="card-body">
                  <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Basic Info</h3>
                  <div className="form-group">
                    <label className="form-label">Product Name *</label>
                    <input className="form-control" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description *</label>
                    <textarea className="form-control" rows={4} required value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select className="form-control" required value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                      <option value="">Select category</option>
                      {cats.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Brand</label>
                    <input className="form-control" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Image</h3>
                  <div className="form-group">
                    <label className="form-label">Image URL</label>
                    <input className="form-control" placeholder="https://..." value={form.images[0].url}
                      onChange={e => setForm({...form, images: [{ url: e.target.value, isPrimary: true }]})} />
                  </div>
                  {form.images[0].url && (
                    <img src={form.images[0].url} alt="Preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--gray-200)' }}
                      onError={e => e.target.style.display = 'none'} />
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="card mb-3">
                <div className="card-body">
                  <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Pricing & Inventory</h3>
                  <div className="form-group">
                    <label className="form-label">Price (PKR) *</label>
                    <input className="form-control" type="number" min={0} required value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Compare At Price (original price)</label>
                    <input className="form-control" type="number" min={0} value={form.compareAtPrice} onChange={e => setForm({...form, compareAtPrice: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stock *</label>
                    <input className="form-control" type="number" min={0} required value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="card mb-3">
                <div className="card-body">
                  <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Visibility</h3>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-control" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                      <option value="active">Active (visible to customers)</option>
                      <option value="draft">Draft (hidden)</option>
                    </select>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.isFeatured} onChange={e => setForm({...form, isFeatured: e.target.checked})} />
                    <span style={{ fontWeight: 600 }}>Featured on store homepage</span>
                  </label>
                </div>
              </div>

              <button className="btn btn-primary w-full btn-lg" type="submit" disabled={loading}>
                {loading ? 'Saving…' : 'Add Product'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Seller Orders ──────────────────────────────────────────────
export function SellerOrders() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [storeSlug, setStoreSlug] = useState(null);
  const [filter, setFilter]   = useState('');
  const toast = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const tenantsRes = await api.get('/tenants?limit=100');
        const me = await api.get('/auth/me');
        const tid = me.data.user.tenantId;
        const myStore = tenantsRes.data.data.find(t => t._id === (tid?._id || tid));
        if (!myStore) { setLoading(false); return; }
        setStoreSlug(myStore.slug);
        const r = await api.get(`/tenants/${myStore.slug}/orders?limit=50`);
        setOrders(r.data.data);
      } catch (_) {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  const updateStatus = async (orderId, status) => {
    try {
      const r = await api.patch(`/tenants/${storeSlug}/orders/${orderId}/status`, { status });
      setOrders(os => os.map(o => o._id === orderId ? r.data.data : o));
      toast(`Order status updated to ${status}`, 'success');
    } catch (err) { toast(err.response?.data?.message || 'Failed', 'error'); }
  };

  const statusColors = { pending: 'badge-warning', confirmed: 'badge-info', processing: 'badge-info', shipped: 'badge-brand', delivered: 'badge-success', cancelled: 'badge-danger', refunded: 'badge-gray' };
  const nextStatus = { pending: 'confirmed', confirmed: 'processing', processing: 'shipped', shipped: 'delivered' };
  const fmt = n => `PKR ${Number(n).toLocaleString()}`;

  const filtered = filter ? orders.filter(o => o.status === filter) : orders;

  return (
    <div className="container page" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <SellerSidebar active="/seller/orders" />
      <div style={{ flex: 1 }}>
        <div className="flex-between mb-3">
          <h1 className="section-title" style={{ marginBottom: 0 }}>Orders</h1>
          <select className="form-control" value={filter} onChange={e => setFilter(e.target.value)} style={{ maxWidth: 160 }}>
            <option value="">All Status</option>
            {['pending','confirmed','processing','shipped','delivered','cancelled'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {loading ? <div className="spinner" /> : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🛒</div>
            <h3>No orders yet</h3>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(o => (
              <div key={o._id} className="card">
                <div className="card-body">
                  <div className="flex-between mb-2">
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>#{o.orderNumber}</span>
                      <span className={`badge ${statusColors[o.status]} ml-2`} style={{ marginLeft: 10 }}>{o.status}</span>
                    </div>
                    <div style={{ fontWeight: 800, color: 'var(--brand)', fontSize: 16 }}>{fmt(o.totalAmount)}</div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 10 }}>
                    👤 {o.customerName} · 📅 {new Date(o.createdAt).toLocaleDateString()} · 💳 {o.paymentMethod.toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    {o.items.map((item, i) => (
                      <div key={i} style={{ background: 'var(--gray-50)', borderRadius: 6, padding: '4px 10px', fontSize: 12, border: '1px solid var(--gray-200)' }}>
                        {item.productName?.slice(0, 30)} × {item.quantity}
                      </div>
                    ))}
                  </div>
                  {nextStatus[o.status] && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => updateStatus(o._id, nextStatus[o.status])}
                    >
                      Mark as {nextStatus[o.status]} →
                    </button>
                  )}
                  {o.status === 'pending' && (
                    <button className="btn btn-danger btn-sm" style={{ marginLeft: 8 }}
                      onClick={() => updateStatus(o._id, 'cancelled')}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
