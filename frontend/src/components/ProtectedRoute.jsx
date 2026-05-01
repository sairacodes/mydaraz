import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles = [] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div className="container page flex-center" style={{ flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 64 }}>🚫</div>
        <h2 style={{ fontSize: 24, fontWeight: 700 }}>Access Denied</h2>
        <p className="text-muted">You don't have permission to view this page.</p>
        <p className="text-sm badge badge-gray">Your role: {user.role}</p>
      </div>
    );
  }

  return children;
}
