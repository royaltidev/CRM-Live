import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import theme from './theme/theme';
import AppLayout from './components/AppLayout';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Users from './views/Users';
import ClientesList from './views/Clientes/ClientesList';
import ClienteFicha from './views/Clientes/ClienteFicha';
import RelatorioVendasSemCliente from './views/Clientes/RelatorioVendasSemCliente';
import Tags from './views/Tags/Tags';
import Segmentacao from './views/Segmentacao/Segmentacao';
import Vendedores from './views/Vendedores/Vendedores';
import Consentimento from './views/Consentimento/Consentimento';
import LogDisparos from './views/LogDisparos/LogDisparos';
import StatusSincronizacao from './views/StatusSincronizacao/StatusSincronizacao';
import Reguas from './views/Reguas/Reguas';
import ReguasWinbackElegiveis from './views/Reguas/ReguasWinbackElegiveis';
import Templates from './views/Templates/Templates';
import Cupons from './views/Cupons/Cupons';
import Giftback from './views/Giftback/Giftback';
import CrossSell from './views/CrossSell/CrossSell';
import Campanhas from './views/Campanhas/Campanhas';
import DesempenhoCampanhas from './views/DesempenhoCampanhas/DesempenhoCampanhas';
import Configuracoes from './views/Configuracoes/Configuracoes';
import CaixaEntrada from './views/CaixaEntrada/CaixaEntrada';
import NPS from './views/NPS/NPS';

// Componente que protege rotas autenticadas.
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Componente que protege rotas exclusivas do Administrador (FSD seção 8.5).
function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  // Enquanto carrega, não renderiza nada (evita flash de login).
  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <Routes>
      {/* Tela de login */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />}
      />

      {/* Telas protegidas — todas compartilham o layout com menu lateral */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/clientes" element={<ClientesList />} />
        <Route path="/clientes/relatorios/sem-cliente" element={<RelatorioVendasSemCliente />} />
        <Route path="/clientes/:id" element={<ClienteFicha />} />

        <Route path="/tags" element={<Tags />} />

        <Route path="/segmentacao" element={<Segmentacao />} />

        <Route path="/reguas" element={<Reguas />} />
        <Route path="/reguas/winback/:ruleId" element={<ReguasWinbackElegiveis />} />

        <Route path="/templates" element={<Templates />} />

        <Route path="/cupons" element={<Cupons />} />

        <Route path="/giftback" element={<Giftback />} />

        <Route path="/cross-sell" element={<CrossSell />} />

        <Route path="/campanhas" element={<Campanhas />} />

        <Route path="/desempenho-campanhas" element={<DesempenhoCampanhas />} />

        <Route path="/vendedores" element={<Vendedores />} />

        <Route path="/consentimento" element={<Consentimento />} />

        <Route path="/log-disparos" element={<LogDisparos />} />

        <Route path="/status-sincronizacao" element={<StatusSincronizacao />} />

        <Route path="/nps" element={<NPS />} />

        {/* Exclusiva do Administrador (FSD seção 8.5 e 12.17) */}
        <Route
          path="/users"
          element={
            <AdminRoute>
              <Users />
            </AdminRoute>
          }
        />

        {/* Exclusiva do Administrador (FSD seção 12.13) */}
        <Route
          path="/configuracoes"
          element={
            <AdminRoute>
              <Configuracoes />
            </AdminRoute>
          }
        />

        {/* Exclusiva do Administrador (FSD seções 6.5, 12.10) */}
        <Route
          path="/caixa-entrada"
          element={
            <AdminRoute>
              <CaixaEntrada />
            </AdminRoute>
          }
        />
      </Route>

      {/* Rota padrão */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}
