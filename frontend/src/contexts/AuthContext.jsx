import React, { createContext, useState, useEffect, useCallback } from 'react';

// Contexto de autenticação.
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verifica se o usuário está autenticado ao carregar a página.
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      setLoading(true);
      const response = await fetch('/auth/me', {
        method: 'GET',
        credentials: 'include', // Envia cookies
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data);
        setError(null);
      } else {
        // Não autenticado
        setUser(null);
        setError(null);
      }
    } catch (err) {
      console.error('Erro ao verificar autenticação:', err);
      setUser(null);
      setError('Erro ao verificar sessão');
    } finally {
      setLoading(false);
    }
  }

  // Faz login com Google.
  const loginWithGoogle = useCallback(async (idToken) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/auth/google/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        credentials: 'include', // Envia/recebe cookies
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao fazer login');
      }

      const data = await response.json();
      setUser(data.user);
      setError(null);
      return data.user;
    } catch (err) {
      const errorMessage = err.message || 'Erro ao fazer login';
      setError(errorMessage);
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Faz logout.
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await fetch('/auth/logout', {
        method: 'GET',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    } finally {
      setUser(null);
      setError(null);
      setLoading(false);
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    loginWithGoogle,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para usar o contexto de autenticação.
export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
