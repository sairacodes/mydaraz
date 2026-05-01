import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const navigate = useNavigate();
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [total, setTotal]       = useState(0);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    api.get(`/search?q=${encodeURIComponent(q)}&limit=20`)
      .then(r => { setResults(r.data.data); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }, [q]);

  const fmt = n => `PKR ${Number(n).toLocaleString()}`;

  return (
    <div className="container page">
      <h1 className="section-title">
        Search Results for "<span style={{ color: 'var(--brand)' }}>{q}</span>"
      </h1>
      {!loading && <p className="text-muted text-sm mb-2">{total} products found across all stores</p>}

      {loading ? <div className="spinner" /> : results.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🔍</div>
          <h3>No results found</h3>
          <p>Try different keywords or browse our stores</p>
        </div>
      ) : (
        <div className="grid-4">
          {results.map(p => (
            <div key={p._id} className="card product-card"
              onClick={() => navigate(`/stores/${p.tenantSlug}/products/${p._id}`)}>
              <img src={p.images?.[0]?.url} alt={p.name} />
              <div className="info">
                <div style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 4 }}>🏪 {p.tenantSlug}</div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
                  {p.name.length > 55 ? p.name.slice(0, 55) + '…' : p.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                  <span className="stars">{'★'.repeat(Math.round(p.ratings?.average || 0))}{'☆'.repeat(5 - Math.round(p.ratings?.average || 0))}</span>
                  <span style={{ fontSize: 11, color: 'var(--gray-400)', marginLeft: 4 }}>({p.ratings?.count || 0})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="price">{fmt(p.price)}</span>
                  {p.compareAtPrice && <span className="compare-price">{fmt(p.compareAtPrice)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
