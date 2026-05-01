import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function ProductPage() {
  const { tenantSlug, productId } = useParams();
  const navigate = useNavigate();
  const { user, isLoggedIn, isCustomer } = useAuth();
  const toast = useToast();

  const [product, setProduct]   = useState(null);
  const [store, setStore]       = useState(null);
  const [qty, setQty]           = useState(1);
  const [loading, setLoading]   = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [imgIdx, setImgIdx]     = useState(0);
  const [tab, setTab]           = useState('description');

  useEffect(() => {
    Promise.all([
      api.get(`/tenants/${tenantSlug}/products/${productId}`),
      api.get(`/tenants/${tenantSlug}`),
    ]).then(([pr, sr]) => {
      setProduct(pr.data.data);
      setStore(sr.data.data);
    }).catch(() => navigate(`/stores/${tenantSlug}`))
      .finally(() => setLoading(false));
  }, [tenantSlug, productId]);

  const handleBuyNow = async () => {
    if (!isLoggedIn) return navigate('/login', { state: { from: location.pathname } });
    if (!isCustomer) return toast('Only customers can place orders', 'error');

    setOrdering(true);
    try {
      await api.post(`/tenants/${tenantSlug}/orders`, {
        items: [{ productId: product._id, quantity: qty }],
        shippingAddress: {
          fullName: user.name,
          street: '123 Demo Street',
          city: 'Karachi',
          province: 'Sindh',
          country: 'Pakistan',
          phone: user.phone || '+92-300-0000000',
        },
        paymentMethod: 'cod',
      });
      toast('🎉 Order placed successfully!', 'success');
      navigate('/account/orders');
    } catch (err) {
      toast(err.response?.data?.message || 'Order failed', 'error');
    } finally { setOrdering(false); }
  };

  const fmt = n => `PKR ${Number(n).toLocaleString()}`;

  if (loading) return <div className="spinner" />;
  if (!product) return null;

  const discount = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0;

  return (
    <div className="container page">
      {/* Breadcrumb */}
      <div style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--gray-500)', marginBottom: 24 }}>
        <Link to="/stores" style={{ color: 'var(--brand)' }}>Stores</Link>
        <span>›</span>
        <Link to={`/stores/${tenantSlug}`} style={{ color: 'var(--brand)' }}>{store?.name}</Link>
        <span>›</span>
        <span>{product.name.slice(0, 40)}…</span>
      </div>

      <div className="grid-2" style={{ gap: 40, alignItems: 'start' }}>
        {/* Images */}
        <div>
          <div className="card" style={{ overflow: 'hidden', marginBottom: 12 }}>
            <img
              src={product.images?.[imgIdx]?.url}
              alt={product.name}
              style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }}
            />
          </div>
          {product.images?.length > 1 && (
            <div style={{ display: 'flex', gap: 8 }}>
              {product.images.map((img, i) => (
                <img
                  key={i}
                  src={img.url}
                  alt=""
                  onClick={() => setImgIdx(i)}
                  style={{
                    width: 64, height: 64, objectFit: 'cover', borderRadius: 8, cursor: 'pointer',
                    border: `2px solid ${i === imgIdx ? 'var(--brand)' : 'var(--gray-200)'}`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 8 }}>
            <Link to={`/stores/${tenantSlug}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>
              🏪 {store?.name}
            </Link>
            {store?.isVerified && <span className="badge badge-success" style={{ marginLeft: 8 }}>✓ Verified</span>}
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, lineHeight: 1.3 }}>{product.name}</h1>

          {/* Rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span className="stars" style={{ fontSize: 16 }}>
              {'★'.repeat(Math.round(product.ratings?.average || 0))}
              {'☆'.repeat(5 - Math.round(product.ratings?.average || 0))}
            </span>
            <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>
              {product.ratings?.average?.toFixed(1)} ({product.ratings?.count} reviews)
            </span>
          </div>

          {/* Price */}
          <div style={{ marginBottom: 20 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--brand)' }}>{fmt(product.price)}</span>
            {product.compareAtPrice && (
              <>
                <span style={{ fontSize: 18, color: 'var(--gray-400)', textDecoration: 'line-through', marginLeft: 10 }}>
                  {fmt(product.compareAtPrice)}
                </span>
                <span className="badge badge-danger" style={{ marginLeft: 10 }}>{discount}% OFF</span>
              </>
            )}
          </div>

          {/* Stock */}
          <div style={{ marginBottom: 20 }}>
            {product.stock > 5 ? (
              <span className="badge badge-success">✓ In Stock ({product.stock} available)</span>
            ) : product.stock > 0 ? (
              <span className="badge badge-warning">⚠ Only {product.stock} left!</span>
            ) : (
              <span className="badge badge-gray">Out of Stock</span>
            )}
          </div>

          {/* Qty + CTA */}
          {product.stock > 0 && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--gray-200)', borderRadius: 8, overflow: 'hidden' }}>
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  style={{ padding: '10px 18px', border: 'none', background: 'var(--gray-50)', cursor: 'pointer', fontSize: 18, fontWeight: 700 }}
                >−</button>
                <span style={{ padding: '10px 20px', fontWeight: 700, fontSize: 16 }}>{qty}</span>
                <button
                  onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                  style={{ padding: '10px 18px', border: 'none', background: 'var(--gray-50)', cursor: 'pointer', fontSize: 18, fontWeight: 700 }}
                >+</button>
              </div>
              <button className="btn btn-primary btn-lg" onClick={handleBuyNow} disabled={ordering} style={{ flex: 1 }}>
                {ordering ? 'Placing Order…' : '⚡ Buy Now (COD)'}
              </button>
            </div>
          )}

          {/* Shipping info */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-body" style={{ padding: 16 }}>
              {[
                { icon: '🚚', label: 'Free Delivery', sub: 'On orders above PKR 2,000' },
                { icon: '↩️', label: 'Easy Returns',  sub: '7-day return policy' },
                { icon: '💳', label: 'Cash on Delivery', sub: 'Pay when you receive' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attributes */}
          {product.brand && (
            <div style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 8 }}>
              <strong>Brand:</strong> {product.brand}
            </div>
          )}
          {product.category && (
            <div style={{ fontSize: 13, color: 'var(--gray-600)' }}>
              <strong>Category:</strong> {product.category}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="card mt-3">
        <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-200)' }}>
          {['description', 'reviews'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: '14px 24px', border: 'none', background: 'none', cursor: 'pointer',
                fontWeight: tab === t ? 700 : 500, color: tab === t ? 'var(--brand)' : 'var(--gray-600)',
                borderBottom: tab === t ? '2px solid var(--brand)' : '2px solid transparent',
                fontSize: 14, textTransform: 'capitalize', fontFamily: 'inherit',
              }}
            >
              {t === 'reviews' ? `Reviews (${product.ratings?.count || 0})` : 'Description'}
            </button>
          ))}
        </div>
        <div className="card-body">
          {tab === 'description' ? (
            <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--gray-700)' }}>{product.description}</p>
          ) : (
            <div>
              {product.reviews?.length === 0 ? (
                <div className="empty-state" style={{ padding: 32 }}>
                  <div className="icon">💬</div>
                  <h3>No reviews yet</h3>
                  <p>Be the first to review this product</p>
                </div>
              ) : (
                product.reviews?.map((r, i) => (
                  <div key={i} style={{ borderBottom: '1px solid var(--gray-100)', paddingBottom: 16, marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--brand)', fontSize: 14 }}>
                        {r.userName?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{r.userName}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span className="stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                          {r.isVerifiedPurchase && <span className="badge badge-success">Verified Purchase</span>}
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--gray-700)' }}>{r.comment}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
