import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';

const CATEGORIES = ['All','Electronics','Fashion','Grocery','Books','Sports','Home & Kitchen','Health & Beauty','Toys'];

export default function StoresPage() {
  const [stores, setStores]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const category = searchParams.get('category') || 'All';
  const LIMIT = 12;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page, limit: LIMIT });
        if (category !== 'All') params.set('category', category);
        const { data } = await api.get(`/tenants?${params}`);
        setStores(data.data);
        setTotal(data.pagination.total);
      } catch (_) {}
      finally { setLoading(false); }
    };
    load();
  }, [category, page]);

  const setCategory = (cat) => {
    setPage(1);
    if (cat === 'All') searchParams.delete('category');
    else searchParams.set('category', cat);
    setSearchParams(searchParams);
  };

  return (
    <div className="container page">
      <h1 className="section-title">Browse Stores</h1>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className="btn btn-sm"
            style={{
              background: category === cat ? 'var(--brand)' : 'var(--white)',
              color: category === cat ? '#fff' : 'var(--gray-600)',
              border: `1.5px solid ${category === cat ? 'var(--brand)' : 'var(--gray-200)'}`,
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="spinner" />
      ) : stores.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🏪</div>
          <h3>No stores found</h3>
          <p>Try a different category</p>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
            Showing {stores.length} of {total} stores
          </div>
          <div className="grid-3">
            {stores.map(s => (
              <div key={s._id} className="card store-card" onClick={() => navigate(`/stores/${s.slug}`)}>
                <img className="banner" src={s.banner} alt={s.name} style={{ height: 100, width: '100%', objectFit: 'cover' }} />
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <img className="logo" src={s.logo} alt={s.name} />
                  {s.isVerified && (
                    <span className="badge badge-success" style={{ margin: '0 0 4px 8px' }}>✓ Verified</span>
                  )}
                </div>
                <div className="info">
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{s.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 10 }}>
                    {s.description?.slice(0, 80)}…
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 12, color: 'var(--gray-600)' }}>
                    <span>⭐ {s.stats?.avgRating?.toFixed(1) || 'N/A'}</span>
                    <span>📦 {s.stats?.totalProducts || 0} products</span>
                    <span>🛒 {s.stats?.totalOrders || 0} orders</span>
                    <span className="badge badge-gray">{s.category}</span>
                    {s.plan !== 'free' && <span className="badge badge-brand">{s.plan}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > LIMIT && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                ← Prev
              </button>
              <span style={{ padding: '8px 16px', fontSize: 14, color: 'var(--gray-600)' }}>
                Page {page} of {Math.ceil(total / LIMIT)}
              </span>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / LIMIT)}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
