import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
  const apiUrl = import.meta.env.VITE_API_URL;
  const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const { token } = await response.json();
      localStorage.setItem('token', token);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'An error occurred during login.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#edf1fd', fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif', paddingTop: 50 }}>
      <div style={{ maxWidth: 480, margin: '0 auto', background: 'rgba(255,255,255,0.95)', padding: '32px 40px', borderRadius: 12, boxShadow: '0 8px 32px 0 rgba(60,80,120,0.10)' }}>
        <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, color: '#1a2233', marginBottom: 24 }}>Login</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#3b4252' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '12px 16px', fontSize: 18, border: '1.5px solid #bfc7d1', borderRadius: 8, boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#3b4252' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '12px 16px', fontSize: 18, border: '1.5px solid #bfc7d1', borderRadius: 8, boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          {error && <p style={{ color: '#dc2626', textAlign: 'center' }}>{error}</p>}
          <button type="submit" style={{ width: '100%', padding: '14px', background: 'linear-gradient(90deg, #6366f1 0%, #2563eb 100%)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 18, fontWeight: 700, marginTop: 10 }}>
            Login
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 24, color: '#3b4252' }}>
          Don't have an account? <Link to="/signup" style={{ color: '#2563eb', fontWeight: 600 }}>Sign Up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
