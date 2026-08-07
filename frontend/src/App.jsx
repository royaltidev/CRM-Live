import { Box, Typography } from '@mui/material';

// Tela de validação da Fase 1 (infraestrutura). Será substituída pelas
// rotas e views reais nas próximas fases (ver docs/PLANO.md, a partir da Fase 3).
export default function App() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2,
        bgcolor: 'background.default',
      }}
    >
      <Typography variant="h1">CRM Live</Typography>
      <Typography variant="body1" color="text.secondary">
        Estrutura inicial do projeto preparada. Telas de negócio chegam nas próximas fases.
      </Typography>
    </Box>
  );
}
