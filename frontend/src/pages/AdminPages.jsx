import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// ══════════════════════════════════════════════════════════════
//  SUPER ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════
function AdminSidebar({ active }) {
  const links = [
    { path: '/admin',              icon: '📊', label: 'Overview'    },
    { path: '/admin/tenants',      icon: '🏪', label: 'Stores'      },
    { path: '/admin/users',        icon: '👥', label: 'Users'       },
    { path: '/admin/collections',  icon: '🗄️',  label: 'DB Schema'  },
  ];
  return (
    <div className="sidebar card" style={{ padding: 12, alignSelf: 'flex-start' }}>
      <div style={{ padding: '12px 16px 16px', borderBottom: '1px solid var(--gray-100)', marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--gray-500)', letterSpacing: '.5px' }}>ADMIN PANEL</div>
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

export function AdminDashboard() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(r => setData(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container page" style={{ display: 'flex', gap: 24 }}><AdminSidebar active="/admin" /><div style={{ flex: 1 }}><div className="spinner" /></div></div>;

  const ov = data?.overview || {};
  const stats = [
    { icon: '🏪', label: 'Total Stores',   value: ov.totalTenants || 0,    color: '#dbeafe', sub: `${ov.activeTenants} active` },
    { icon: '👥', label: 'Total Users',    value: ov.totalUsers || 0,      color: '#dcfce7', sub: `${ov.totalCustomers} customers` },
    { icon: '🤝', label: 'Total Sellers',  value: ov.totalSellers || 0,    color: '#fef3c7', sub: `${ov.suspendedTenants} suspended` },
    { icon: '💰', label: 'Platform Revenue', value: `PKR ${(ov.platformRevenue||0).toLocaleString()}`, color: '#fff3ee', sub: `${ov.platformOrders} orders` },
  ];

  return (
    <div className="container page" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <AdminSidebar active="/admin" />
      <div style={{ flex: 1 }}>
        <div className="mb-3">
          <h1 className="section-title" style={{ marginBottom: 4 }}>Platform Dashboard</h1>
          <p className="text-muted text-sm">Welcome, {user?.name} · Superadmin</p>
        </div>

        <div className="grid-4 mb-3">
          {stats.map(s => (
            <div key={s.label} className="card stat-card">
              <div className="stat-icon" style={{ background: s.color }}><span style={{ fontSize: 22 }}>{s.icon}</span></div>
              <div>
                <div className="stat-value" style={{ fontSize: 22 }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid-2">
          {/* Top Stores */}
          <div className="card">
            <div className="card-body">
              <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Top Stores by Revenue</h3>
              {data?.topStores?.map((s, i) => (
                <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: i < 3 ? 'var(--brand)' : 'var(--gray-100)', color: i < 3 ? '#fff' : 'var(--gray-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{s.category}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}>PKR {(s.stats?.totalRevenue||0).toLocaleString()}</div>
                    {s.isVerified && <span className="badge badge-success" style={{ fontSize: 9 }}>✓</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Users */}
          <div className="card">
            <div className="card-body">
              <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Recent Signups</h3>
              {data?.recentUsers?.slice(0, 8).map(u => (
                <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--brand)', fontSize: 13 }}>
                    {u.name[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{u.email}</div>
                  </div>
                  <span className={`badge ${u.role === 'superadmin' ? 'badge-danger' : u.role === 'tenant_admin' ? 'badge-info' : 'badge-success'}`} style={{ fontSize: 10 }}>
                    {u.role.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminTenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');
  const toast = useToast();

  useEffect(() => {
    const url = filter ? `/admin/tenants?status=${filter}` : '/admin/tenants';
    api.get(url).then(r => setTenants(r.data.data)).finally(() => setLoading(false));
  }, [filter]);

  const suspend = async (id) => {
    const reason = prompt('Suspension reason:');
    if (!reason) return;
    try {
      const slug = tenants.find(t => t._id === id)?.slug;
      await api.patch(`/tenants/${slug}/suspend`, { reason });
      toast('Store suspended', 'success');
      setTenants(ts => ts.map(t => t._id === id ? { ...t, isSuspended: true } : t));
    } catch (err) { toast(err.response?.data?.message || 'Failed', 'error'); }
  };

  const verify = async (id) => {
    try {
      const slug = tenants.find(t => t._id === id)?.slug;
      await api.patch(`/tenants/${slug}/verify`);
      toast('Store verified!', 'success');
      setTenants(ts => ts.map(t => t._id === id ? { ...t, isVerified: true } : t));
    } catch (err) { toast(err.response?.data?.message || 'Failed', 'error'); }
  };

  return (
    <div className="container page" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <AdminSidebar active="/admin/tenants" />
      <div style={{ flex: 1 }}>
        <div className="flex-between mb-3">
          <h1 className="section-title" style={{ marginBottom: 0 }}>All Stores</h1>
          <select className="form-control" value={filter} onChange={e => setFilter(e.target.value)} style={{ maxWidth: 160 }}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="unverified">Unverified</option>
          </select>
        </div>

        {loading ? <div className="spinner" /> : (
          <div className="card table-wrap">
            <table>
              <thead>
                <tr><th>Store</th><th>Owner</th><th>Category</th><th>Products</th><th>Revenue</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {tenants.map(t => (
                  <tr key={t._id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>/{t.slug}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{t.owner?.name || '—'}<br /><span style={{ color: 'var(--gray-400)', fontSize: 11 }}>{t.owner?.email}</span></td>
                    <td><span className="badge badge-gray">{t.category}</span></td>
                    <td style={{ fontWeight: 600 }}>{t.stats?.totalProducts || 0}</td>
                    <td style={{ fontWeight: 700, color: 'var(--brand)' }}>PKR {(t.stats?.totalRevenue||0).toLocaleString()}</td>
                    <td>
                      {t.isSuspended ? <span className="badge badge-danger">Suspended</span>
                        : t.isVerified ? <span className="badge badge-success">✓ Verified</span>
                        : <span className="badge badge-warning">Unverified</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {!t.isVerified && !t.isSuspended && (
                          <button className="btn btn-secondary btn-sm" onClick={() => verify(t._id)}>Verify</button>
                        )}
                        {!t.isSuspended && (
                          <button className="btn btn-danger btn-sm" onClick={() => suspend(t._id)}>Suspend</button>
                        )}
                        <Link to={`/stores/${t.slug}`} className="btn btn-secondary btn-sm">View</Link>
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

export function AdminCollections() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/collections').then(r => setCollections(r.data.data)).finally(() => setLoading(false));
  }, []);

  const grouped = collections.reduce((acc, c) => {
    const parts = c.split('_');
    const tenant = parts.slice(1, -1).join('_');
    const type = parts[parts.length - 1];
    if (!acc[tenant]) acc[tenant] = [];
    acc[tenant].push({ name: c, type });
    return acc;
  }, {});

  return (
    <div className="container page" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <AdminSidebar active="/admin/collections" />
      <div style={{ flex: 1 }}>
        <h1 className="section-title">Database Schema Inspector</h1>
        <div className="card mb-3" style={{ background: 'var(--brand-light)', border: '1px solid #ffd4b8' }}>
          <div className="card-body" style={{ padding: 16 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>🗄️ Multi-Tenant Architecture: Shared DB + Separate Schema</h3>
            <p style={{ fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.7 }}>
              All tenants share a <strong>single MongoDB database</strong>, but each tenant's data lives in 
              <strong> isolated collections</strong>: <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4 }}>tenant_[slug]_products</code> and 
              <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, marginLeft: 4 }}>tenant_[slug]_orders</code>.
              Shared data (users, tenants) lives in global collections. This provides data isolation 
              without the cost of separate databases.
            </p>
          </div>
        </div>

        {/* Shared collections */}
        <div className="card mb-3">
          <div className="card-body">
            <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>📁 Shared Collections (Platform-level)</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {['users', 'tenants'].map(c => (
                <div key={c} style={{ padding: '8px 16px', background: '#dbeafe', borderRadius: 8, fontFamily: 'monospace', fontSize: 13, color: '#1e40af', fontWeight: 600 }}>
                  📄 {c}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tenant collections */}
        <h3 className="section-title" style={{ fontSize: 16 }}>🏪 Tenant-Scoped Collections</h3>
        {loading ? <div className="spinner" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(grouped).map(([tenant, cols]) => (
              <div key={tenant} className="card">
                <div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>🏪</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{tenant.replace(/_/g, '-')}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{cols.length} collections</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {cols.map(col => (
                      <div key={col.name} style={{
                        padding: '8px 16px', borderRadius: 8, fontFamily: 'monospace', fontSize: 12, fontWeight: 600,
                        background: col.type === 'products' ? '#dcfce7' : '#fef3c7',
                        color: col.type === 'products' ? '#166534' : '#92400e',
                      }}>
                        {col.type === 'products' ? '📦' : '🛒'} {col.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {Object.keys(grouped).length === 0 && (
              <div className="empty-state">
                <div className="icon">🗄️</div>
                <h3>No tenant collections yet</h3>
                <p>They will appear here after stores add products or receive orders</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  CUSTOMER ACCOUNT
// ══════════════════════════════════════════════════════════════
export function CustomerOrders() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [storeMap, setStoreMap] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const tenantsRes = await api.get('/tenants?limit=100');
        const map = {};
        tenantsRes.data.data.forEach(t => { map[t.slug] = t.name; });
        setStoreMap(map);

        const allOrders = [];
        for (const store of tenantsRes.data.data) {
          try {
            const r = await api.get(`/tenants/${store.slug}/orders/my`);
            allOrders.push(...r.data.data.map(o => ({ ...o, storeName: store.name, storeSlug: store.slug })));
          } catch (_) {}
        }
        allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setOrders(allOrders);
      } catch (_) {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  const statusColors = { pending: 'badge-warning', confirmed: 'badge-info', processing: 'badge-info', shipped: 'badge-brand', delivered: 'badge-success', cancelled: 'badge-danger' };
  const fmt = n => `PKR ${Number(n).toLocaleString()}`;

  return (
    <div className="container page">
      <h1 className="section-title">My Orders</h1>
      {loading ? <div className="spinner" /> : orders.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🛒</div>
          <h3>No orders yet</h3>
          <p>Start shopping from our stores!</p>
          <Link to="/stores" className="btn btn-primary mt-2">Browse Stores</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {orders.map(o => (
            <div key={o._id} className="card">
              <div className="card-body">
                <div className="flex-between mb-2">
                  <div>
                    <span style={{ fontWeight: 700 }}>#{o.orderNumber}</span>
                    <span className={`badge ${statusColors[o.status]}`} style={{ marginLeft: 10 }}>{o.status}</span>
                    {o.status === 'shipped' && o.trackingNumber && (
                      <span style={{ fontSize: 12, marginLeft: 10, color: 'var(--accent)' }}>📦 {o.trackingNumber}</span>
                    )}
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--brand)' }}>{fmt(o.totalAmount)}</div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 10 }}>
                  🏪 {o.storeName} · 📅 {new Date(o.createdAt).toLocaleDateString()} · 💳 {o.paymentMethod?.toUpperCase()}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {o.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--gray-50)', borderRadius: 8, padding: '6px 12px', border: '1px solid var(--gray-200)' }}>
                      {item.productImage && <img src={item.productImage} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }} />}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{item.productName?.slice(0, 30)}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>Qty: {item.quantity} · {fmt(item.unitPrice)}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--gray-500)' }}>
                  Shipping: {fmt(o.shippingFee)} · Commission: {fmt(o.platformCommission)} · Store Earnings: {fmt(o.tenantEarnings)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
