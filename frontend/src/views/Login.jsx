import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Card,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Carrega o script da biblioteca Google Sign-In.
function useGoogleSignIn() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);
}

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, loginWithGoogle, loading, error } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState(null);

  useGoogleSignIn();

  // Se já está autenticado, redireciona para o dashboard.
  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, loading, navigate]);

  // Callback chamado pelo botão Google Sign-In.
  const handleGoogleSuccess = async (response) => {
    try {
      setIsLoggingIn(true);
      setLoginError(null);

      // Envia o token para o backend.
      await loginWithGoogle(response.credential);

      // Redireciona para o dashboard (o useEffect fará isso automaticamente).
    } catch (err) {
      setLoginError(err.message || 'Falha ao fazer login. Tente novamente.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleError = () => {
    setLoginError('Falha na autenticação com Google. Tente novamente.');
  };

  // Redireciona o Google Sign-In para nosso callback customizado.
  useEffect(() => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleGoogleSuccess,
        auto_select: false,
      });

      // Roda o renderizador do botão.
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        { theme: 'outline', size: 'large', width: '300' }
      );
    }
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: '#f7f9fb',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f7f9fb',
        padding: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{
            padding: 4,
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Logo */}
          <Box sx={{ marginBottom: 3 }}>
            <img
              src="/logo-oval.svg"
              alt="CRM Live"
              style={{ height: 60, marginBottom: 16 }}
            />
          </Box>

          {/* Título */}
          <Typography variant="h4" sx={{ marginBottom: 1, fontWeight: 700 }}>
            CRM Live
          </Typography>

          {/* Subtítulo */}
          <Typography
            variant="body2"
            sx={{ marginBottom: 3, color: '#666666' }}
          >
            Aumente a recompra e retenção de clientes com automações de WhatsApp.
          </Typography>

          {/* Erro geral */}
          {(error || loginError) && (
            <Alert severity="error" sx={{ marginBottom: 3 }}>
              {error || loginError}
            </Alert>
          )}

          {/* Botão Google Sign-In */}
          <Box sx={{ marginBottom: 3 }}>
            <div id="google-signin-button" />
            {isLoggingIn && (
              <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
          </Box>

          {/* Mensagem de ajuda */}
          <Typography variant="caption" sx={{ color: '#999999' }}>
            Use sua conta Google para fazer login.
            <br />
            Primeira conta criada será Administradora.
          </Typography>
        </Card>

        {/* Rodapé */}
        <Box sx={{ textAlign: 'center', marginTop: 3 }}>
          <Typography variant="caption" sx={{ color: '#999999' }}>
            CRM Live © 2026 Royal Tecnologia
            <br />
            <a
              href="https://github.com/royaltidev/CRM-Live"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0f2d7b', textDecoration: 'none' }}
            >
              Repositório no GitHub
            </a>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
