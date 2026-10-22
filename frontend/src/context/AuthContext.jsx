import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';
import { clearLocalDatabase } from '../db/indexedDb';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('chat_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('chat_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyAuth() {
      if (token) {
        try {
          const profile = await authApi.getMe();
          setUser(profile);
          localStorage.setItem('chat_user', JSON.stringify(profile));
        } catch (err) {
          // If offline or network error, keep user from localStorage
          if (!err.response) {
            console.log('Backend unreachable, keeping local session for offline access');
          } else if (err.response.status === 401) {
            logout();
          }
        }
      }
      setLoading(false);
    }

    verifyAuth();

    const handleExpired = () => logout();
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, [token]);

  const login = async (usernameOrEmail, password) => {
    const res = await authApi.login(usernameOrEmail, password);
    const tokenVal = res.accessToken || res.token;
    setToken(tokenVal);
    setUser(res.user);
    localStorage.setItem('chat_token', tokenVal);
    localStorage.setItem('chat_user', JSON.stringify(res.user));
    return res.user;
  };

  const register = async (userData) => {
    const res = await authApi.register(userData);
    const tokenVal = res.accessToken || res.token;
    setToken(tokenVal);
    setUser(res.user);
    localStorage.setItem('chat_token', tokenVal);
    localStorage.setItem('chat_user', JSON.stringify(res.user));
    return res.user;
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('chat_token');
    localStorage.removeItem('chat_user');
    await clearLocalDatabase();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
