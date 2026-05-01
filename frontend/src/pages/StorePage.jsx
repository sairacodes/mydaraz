import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function StorePage() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const [store, setStore]       = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [sort, setSort]         = useState('-createdAt');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const LIMIT = 12;

  useEffect(() => {
    api.get(`/tenants/${tenantSlug}`)
      .then(r => setStore(r.data.data))
      .catch(() => navigate('/stores'));
  }, [tenantSlug]);

  useEffect(() => {
    const params = new URLSearchParams({ sort, page, limit: LIMIT });
    if (search) params.set('search', search);
    api.get(`/tenants/${tenantSlug}/products?${params}`)
      .then(r => { setProducts(r.data.data); setTotal(r.data.pagination.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantSlug, sort, page, search]);

  const fmt = n => `PKR ${Number(n).toLocaleString()}`;

  if (!store) return <div className="spinner" />;

  return (
    <div>
      {/* Store Hero */}
      <div style={{ position: 'relative', background: 'var(--gray-200)', height: 220, overflow: 'hidden' }}>
        <img src={store.banner} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.6) 0%, transparent 60%)' }} />
      </div>

      <div className="container">
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', marginTop: -40, marginBottom: 32, position: 'relative', zIndex: 10 }}>
          <img src={store.logo} alt={store.name} style={{ width: 80, height: 80, borderRadius: 16, border: '4px solid #fff', objectFit: 'cover', boxShadow: 'var(--shadow)' }} />
          <div style={{ paddingBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,.4)' }}>
                {store.name}
              </h1>
              {store.isVerified && <span className="badge badge-success">✓ Verified</span>}
            </div>
          </div>
        </div>

        {/* Store Info Bar */}
        <div className="card" style={{ marginBottom: 28 }}>
          <div className="card-body" style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, color: 'var(--gray-600)' }}>{store.description}</p>
            </div>
            <div style={{ display: 'flex', gap: 24, flexShrink: 0 }}>
              {[
                { label: 'Products', value: store.stats?.totalProducts || 0, icon: '📦' },
                { label: 'Orders',   value: store.stats?.totalOrders || 0,   icon: '🛒' },
                { label: 'Rating',   value: `${store.stats?.avgRating?.toFixed(1) || '—'} ⭐`, icon: '' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-900)' }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <input
            className="form-control"
            placeholder="Search in this store..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ maxWidth: 320 }}
          />
          <select className="form-control" value={sort} onChange={e => setSort(e.target.value)} style={{ maxWidth: 180 }}>
            <option value="-createdAt">Newest First</option>
            <option value="price">Price: Low to High</option>
            <option value="-price">Price: High to Low</option>
            <option value="-ratings.average">Top Rated</option>
            <option value="-totalSold">Best Selling</option>
          </select>
          <span style={{ alignSelf: 'center', fontSize: 13, color: 'var(--gray-500)' }}>
            {total} products
          </span>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="spinner" />
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📦</div>
            <h3>No products found</h3>
            <p>Try a different search term</p>
          </div>
        ) : (
          <>
            <div className="grid-4 mb-3">
              {products.map(p => (
                <div
                  key={p._id}
                  className="card product-card"
                  onClick={() => navigate(`/stores/${tenantSlug}/products/${p._id}`)}
                >
                  <img src={p.images?.[0]?.url} alt={p.name} />
                  <div className="info">
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, lineHeight: 1.4 }}>
                      {p.name.length > 55 ? p.name.slice(0, 55) + '…' : p.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <span className="stars">
                        {'★'.repeat(Math.round(p.ratings?.average || 0))}
                        {'☆'.repeat(5 - Math.round(p.ratings?.average || 0))}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--gray-400)', marginLeft: 4 }}>
                        ({p.ratings?.count || 0})
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="price">{fmt(p.price)}</span>
                      {p.compareAtPrice && (
                        <span className="compare-price">{fmt(p.compareAtPrice)}</span>
                      )}
                    </div>
                    {p.compareAtPrice && (
                      <span className="badge badge-danger" style={{ marginTop: 6 }}>
                        {Math.round((1 - p.price / p.compareAtPrice) * 100)}% OFF
                      </span>
                    )}
                    <div style={{ marginTop: 8 }}>
                      {p.stock <= 5 && p.stock > 0 && (
                        <span className="badge badge-warning">Only {p.stock} left!</span>
                      )}
                      {p.stock === 0 && (
                        <span className="badge badge-gray">Out of Stock</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {total > LIMIT && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  ← Prev
                </button>
                <span style={{ padding: '8px 16px', fontSize: 14, color: 'var(--gray-600)' }}>
                  {page} / {Math.ceil(total / LIMIT)}
                </span>
                <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / LIMIT)}>
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
