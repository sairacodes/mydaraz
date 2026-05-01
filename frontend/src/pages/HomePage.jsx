import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const CATEGORIES = ['Electronics','Fashion','Grocery','Books','Sports','Home & Kitchen','Health & Beauty','Toys'];
const CAT_ICONS  = { Electronics:'💻', Fashion:'👗', Grocery:'🛒', Books:'📚', Sports:'⚽', 'Home & Kitchen':'🏠', 'Health & Beauty':'💄', Toys:'🧸' };

export default function HomePage() {
  const [stores, setStores]     = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading]   = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/tenants?limit=6');
        setStores(data.data);

        // Gather featured products from each active store
        const products = [];
        for (const store of data.data.slice(0, 3)) {
          try {
            const r = await api.get(`/tenants/${store.slug}/products?featured=true&limit=4`);
            products.push(...r.data.data.map(p => ({ ...p, storeName: store.name, storeSlug: store.slug })));
          } catch (_) {}
        }
        setFeatured(products.slice(0, 8));
      } catch (_) {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  const fmt = (n) => `PKR ${Number(n).toLocaleString()}`;

  return (
    <div>
      {/* Hero */}
      <div className="container">
        <div className="hero" style={{ marginTop: 24 }}>
          <div>
            <h1>Pakistan's Multi-Tenant<br />Marketplace</h1>
            <p>Shop from hundreds of verified stores —<br />Electronics, Fashion, Books & more</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <Link to="/stores" className="btn btn-lg" style={{ background: '#fff', color: 'var(--brand)' }}>
                Browse Stores →
              </Link>
              <Link to="/register" className="btn btn-lg btn-outline" style={{ borderColor: '#fff', color: '#fff' }}>
                Become a Seller
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="container">
        <div className="section-title">Shop by Category</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 12, marginBottom: 40 }}>
          {CATEGORIES.map(cat => (
            <Link
              key={cat}
              to={`/stores?category=${encodeURIComponent(cat)}`}
              className="card"
              style={{ textAlign: 'center', padding: '20px 8px', cursor: 'pointer', transition: 'all .2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
              onMouseLeave={e => e.currentTarget.style.transform = ''}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>{CAT_ICONS[cat]}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-600)' }}>{cat}</div>
            </Link>
          ))}
        </div>

        {/* Featured Products */}
        <div className="flex-between mb-2">
          <div className="section-title" style={{ marginBottom: 0 }}>Featured Products</div>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : featured.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📦</div>
            <h3>No products yet</h3>
            <p>Check back soon — stores are adding products</p>
          </div>
        ) : (
          <div className="grid-4 mb-3">
            {featured.map(p => (
              <div
                key={p._id}
                className="card product-card"
                onClick={() => navigate(`/stores/${p.storeSlug}/products/${p._id}`)}
              >
                <img src={p.images?.[0]?.url} alt={p.name} />
                <div className="info">
                  <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4 }}>
                    🏪 {p.storeName}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, lineHeight: 1.4 }}>
                    {p.name.length > 50 ? p.name.slice(0, 50) + '…' : p.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                    <span className="stars">{'★'.repeat(Math.round(p.ratings?.average || 0))}{'☆'.repeat(5 - Math.round(p.ratings?.average || 0))}</span>
                    <span style={{ fontSize: 11, color: 'var(--gray-400)', marginLeft: 4 }}>({p.ratings?.count || 0})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="price">{fmt(p.price)}</span>
                    {p.compareAtPrice && <span className="compare-price">{fmt(p.compareAtPrice)}</span>}
                  </div>
                  {p.compareAtPrice && (
                    <span className="badge badge-danger" style={{ marginTop: 6 }}>
                      {Math.round((1 - p.price / p.compareAtPrice) * 100)}% OFF
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stores Section */}
        <div className="section-title">Top Stores</div>
        {loading ? <div className="spinner" /> : (
          <div className="grid-3 mb-3">
            {stores.map(s => (
              <div key={s._id} className="card store-card" onClick={() => navigate(`/stores/${s.slug}`)}>
                <img className="banner" src={s.banner} alt={s.name} />
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingLeft: 0 }}>
                  <img className="logo" src={s.logo} alt={s.name} />
                  {s.isVerified && <span className="badge badge-success" style={{ margin: '0 0 4px 8px' }}>✓ Verified</span>}
                </div>
                <div className="info">
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 8 }}>{s.description?.slice(0, 80)}…</div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--gray-600)' }}>
                    <span>⭐ {s.stats?.avgRating?.toFixed(1) || 'N/A'}</span>
                    <span>📦 {s.stats?.totalProducts || 0} products</span>
                    <span className="badge badge-gray">{s.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ background: 'var(--gray-800)', color: 'var(--gray-300)', padding: '40px 0', marginTop: 60 }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 8 }}>دراز<span style={{ color: 'var(--brand)' }}>Clone</span></div>
          <p style={{ fontSize: 14 }}>Multi-Tenant Marketplace · MERN Stack · Shared DB + Separate Schema</p>
          <p style={{ fontSize: 12, marginTop: 8, color: 'var(--gray-500)' }}>COMSATS University Islamabad · Final Year Project Demo</p>
        </div>
      </footer>
    </div>
  );
}
