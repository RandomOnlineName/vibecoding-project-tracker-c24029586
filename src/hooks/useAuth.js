/**
 * useAuth — authentication state + actions.
 * Stores JWT in localStorage under 'vt_token'.
 * Exposes: { user, token, loading, login, register, logout, updateProfile }
 */
import { useState, useEffect, useCallback } from 'react';

const TOKEN_KEY = 'vt_token';
const API = '/api';

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export function useAuth() {
  const [token, setToken]   = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount (or token change), load the user profile
  useEffect(() => {
    if (!token) { setUser(null); setLoading(false); return; }
    setLoading(true);
    fetch(`${API}/auth/me`, { headers: authHeaders(token) })
      .then(r => {
        if (r.status === 401) { logout(); return null; }
        return r.json();
      })
      .then(u => { if (u) setUser(u); })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const persist = useCallback((tok, u) => {
    localStorage.setItem(TOKEN_KEY, tok);
    setToken(tok);
    setUser(u);
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Login failed');
    persist(data.token, data.user);
    return data.user;
  }, [persist]);

  const register = useCallback(async (fields) => {
    const r = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Registration failed');
    persist(data.token, data.user);
    return data.user;
  }, [persist]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (fields) => {
    const r = await fetch(`${API}/auth/me`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(fields),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Update failed');
    setUser(data);
    return data;
  }, [token]);

  return { user, token, loading, login, register, logout, updateProfile };
}
