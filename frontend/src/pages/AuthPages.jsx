import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// ── Login ──────────────────────────────────────────────────────
export function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const [form, setForm]     = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast(`Welcome back, ${user.name}!`, 'success');
      const redirect = user.role === 'superadmin' ? '/admin'
        : user.role === 'tenant_admin' ? '/seller'
        : from;
      navigate(redirect, { replace: true });
    } catch (err) {
      toast(err.response?.data?.message || 'Login failed', 'error');
    } finally { setLoading(false); }
  };

  const demoFill = (email, password) => setForm({ email, password });

  return (
    <div className="page flex-center" style={{ minHeight: '80vh' }}>
      <div className="card" style={{ width: '100%', maxWidth: 440 }}>
        <div className="card-body" style={{ padding: 40 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🛍️</div>
            <h2 style={{ fontSize: 24, fontWeight: 800 }}>Welcome Back</h2>
            <p className="text-muted text-sm">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-control" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-control" type="password" placeholder="••••••••"
                value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
            </div>
            <button className="btn btn-primary w-full btn-lg" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{ marginTop: 24, padding: 16, background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-200)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-600)', marginBottom: 10 }}>🔑 DEMO ACCOUNTS (click to fill)</p>
            {[
              { label: '👑 Super Admin', email: 'admin@daraz-clone.pk', pw: 'Admin@1234', color: 'var(--danger)' },
              { label: '🏪 Seller (TechZone)', email: 'ahmed@techzone.pk', pw: 'Seller@1234', color: 'var(--accent)' },
              { label: '👤 Customer', email: 'fatima@gmail.com', pw: 'Customer@1234', color: 'var(--success)' },
            ].map(d => (
              <button key={d.email} onClick={() => demoFill(d.email, d.pw)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', marginBottom: 4,
                  background: '#fff', border: `1px solid var(--gray-200)`, borderRadius: 6, cursor: 'pointer',
                  fontSize: 13, color: d.color, fontWeight: 600 }}>
                {d.label} — {d.email}
              </button>
            ))}
          </div>

          <p className="text-sm text-muted mt-2" style={{ textAlign: 'center' }}>
            No account? <Link to="/register" style={{ color: 'var(--brand)', fontWeight: 600 }}>Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Register ───────────────────────────────────────────────────
export function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm]       = useState({ name: '', email: '', password: '', role: 'customer', phone: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await register(form);
      toast(`Welcome, ${user.name}! Account created.`, 'success');
      navigate(user.role === 'tenant_admin' ? '/seller/onboard' : '/');
    } catch (err) {
      toast(err.response?.data?.message || 'Registration failed', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="page flex-center" style={{ minHeight: '80vh' }}>
      <div className="card" style={{ width: '100%', maxWidth: 480 }}>
        <div className="card-body" style={{ padding: 40 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✨</div>
            <h2 style={{ fontSize: 24, fontWeight: 800 }}>Create Account</h2>
            <p className="text-muted text-sm">Join Pakistan's largest multi-tenant marketplace</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-control" placeholder="Ahmed Khan"
                value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-control" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone (optional)</label>
              <input className="form-control" placeholder="+92-300-0000000"
                value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-control" type="password" placeholder="Min. 6 characters"
                value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                minLength={6} required />
            </div>

            <div className="form-group">
              <label className="form-label">I want to…</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { value: 'customer',     icon: '🛍️', label: 'Shop & Buy',   sub: 'Browse stores & order' },
                  { value: 'tenant_admin', icon: '🏪', label: 'Sell & Earn',  sub: 'Open my own store' },
                ].map(o => (
                  <label key={o.value} style={{
                    display: 'flex', flexDirection: 'column', gap: 4,
                    padding: 14, borderRadius: 8, cursor: 'pointer',
                    border: `2px solid ${form.role === o.value ? 'var(--brand)' : 'var(--gray-200)'}`,
                    background: form.role === o.value ? 'var(--brand-light)' : '#fff',
                  }}>
                    <input type="radio" name="role" value={o.value}
                      checked={form.role === o.value}
                      onChange={() => setForm({...form, role: o.value})}
                      style={{ display: 'none' }} />
                    <span style={{ fontSize: 24 }}>{o.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{o.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>{o.sub}</span>
                  </label>
                ))}
              </div>
            </div>

            <button className="btn btn-primary w-full btn-lg" type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create Account'}
            </button>
          </form>

          <p className="text-sm text-muted mt-2" style={{ textAlign: 'center' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--brand)', fontWeight: 600 }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
