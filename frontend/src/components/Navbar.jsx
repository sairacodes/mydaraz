import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Navbar() {
  const { user, logout, isSuperAdmin, isTenantAdmin, isLoggedIn } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [dropOpen, setDropOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/search?q=${encodeURIComponent(search.trim())}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast('Logged out successfully', 'success');
    navigate('/');
    setDropOpen(false);
  };

  const dashboardPath = isSuperAdmin ? '/admin' : isTenantAdmin ? '/seller' : '/account';

  return (
    <nav className="navbar">
      <div className="container" style={{ display: 'flex', alignItems: 'center', gap: 24, width: '100%' }}>
        {/* Brand */}
        <Link to="/" className="brand" style={{ flexShrink: 0 }}>
          دراز<span>Clone</span>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: 560, display: 'flex', gap: 0 }}>
          <input
            className="form-control"
            placeholder="Search products, stores..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ borderRadius: '8px 0 0 8px', borderRight: 'none' }}
          />
          <button type="submit" className="btn btn-primary" style={{ borderRadius: '0 8px 8px 0', padding: '10px 18px' }}>
            🔍
          </button>
        </form>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <Link to="/stores" className={`nav-link ${location.pathname === '/stores' ? 'active' : ''}`}>
            Stores
          </Link>

          {isLoggedIn ? (
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setDropOpen(!dropOpen)}
                style={{ gap: 8 }}
              >
                <span style={{ fontSize: 16 }}>👤</span>
                {user.name.split(' ')[0]}
                <span style={{ fontSize: 10 }}>{dropOpen ? '▲' : '▼'}</span>
              </button>
              {dropOpen && (
                <div style={{
                  position: 'absolute', top: '110%', right: 0,
                  background: '#fff', border: '1px solid var(--gray-200)',
                  borderRadius: 'var(--radius)', padding: '8px',
                  minWidth: 200, boxShadow: 'var(--shadow)', zIndex: 200
                }}>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--gray-100)', marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{user.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{user.email}</div>
                    <span className={`badge badge-${isSuperAdmin ? 'danger' : isTenantAdmin ? 'info' : 'success'}`} style={{ marginTop: 6 }}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </div>
                  <Link to={dashboardPath} className="sidebar-link" onClick={() => setDropOpen(false)}>
                    <span className="icon">📊</span> Dashboard
                  </Link>
                  {isTenantAdmin && (
                    <>
                      <Link to="/seller/products" className="sidebar-link" onClick={() => setDropOpen(false)}>
                        <span className="icon">📦</span> My Products
                      </Link>
                      <Link to="/seller/orders" className="sidebar-link" onClick={() => setDropOpen(false)}>
                        <span className="icon">🛒</span> Orders
                      </Link>
                    </>
                  )}
                  {!isTenantAdmin && !isSuperAdmin && (
                    <Link to="/account/orders" className="sidebar-link" onClick={() => setDropOpen(false)}>
                      <span className="icon">📋</span> My Orders
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="sidebar-link"
                    style={{ width: '100%', border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span className="icon">🚪</span> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to="/login" className="btn btn-secondary btn-sm">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
