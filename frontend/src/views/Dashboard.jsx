import React from 'react';
import {
  Box,
  Container,
  Card,
  Typography,
  Button,
  Grid,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Atalhos para os módulos já implementados, com uma breve descrição funcional
// (útil tanto para o usuário final quanto para apresentação/demo do sistema).
const QUICK_LINKS = [
  {
    title: 'Clientes',
    description: 'Busque clientes, abra a ficha 360º e edite campos complementares (aniversário, preferências, tags).',
    path: '/clientes',
  },
  {
    title: 'Segmentação',
    description: 'Configure os critérios de classificação RFM e crie segmentos dinâmicos combinando filtros.',
    path: '/segmentacao',
  },
  {
    title: 'Vendedores',
    description: 'Cadastre vendedores e acompanhe a fila de rodízio usada no encaminhamento de leads.',
    path: '/vendedores',
  },
  {
    title: 'Tags',
    description: 'Gerencie as etiquetas usadas para classificar e segmentar clientes.',
    path: '/tags',
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <Container maxWidth="lg" sx={{ paddingY: 4 }}>
      <Box sx={{ marginBottom: 4 }}>
        <Typography variant="h3" sx={{ marginBottom: 1 }}>
          Bem-vindo, {user?.name || user?.email}!
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666' }}>
          Visão geral do CRM Live. Use o menu à esquerda para navegar entre os módulos.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {QUICK_LINKS.map((link) => (
          <Grid item xs={12} sm={6} md={3} key={link.path}>
            <Card
              sx={{
                padding: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ marginBottom: 1, fontWeight: 700 }}>
                  {link.title}
                </Typography>
                <Typography variant="body2" sx={{ color: '#666666', marginBottom: 2 }}>
                  {link.description}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                onClick={() => navigate(link.path)}
              >
                Acessar
              </Button>
            </Card>
          </Grid>
        ))}

        <Grid item xs={12}>
          <Card sx={{ padding: 3 }}>
            <Typography variant="h6" sx={{ marginBottom: 2, fontWeight: 700 }}>
              Sobre os dados exibidos no momento
            </Typography>
            <Typography variant="body2" sx={{ marginBottom: 1 }}>
              A sincronização automática com o Uniplus (importação de clientes, vendas, produtos
              e estoque) ainda não foi implementada — ela depende do mapeamento do schema do
              banco de origem, uma etapa posterior do projeto.
            </Typography>
            <Typography variant="body2" sx={{ color: '#666666' }}>
              Por isso, as telas de Clientes e Segmentação podem aparecer vazias até que essa
              sincronização entre em operação. Vendedores e Tags já podem ser cadastrados
              normalmente, pois não dependem de dados externos.
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
