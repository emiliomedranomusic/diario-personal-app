// src/AppLayout.js
import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Tabs, Tab, Box } from '@mui/material';
import EntradasPage from './pages/EntradasPage';
import EtiquetasPage from './pages/EtiquetasPage';
import PersonasLugaresPage from './pages/PersonasLugaresPage';
// Importar iconos para las pestañas (opcional)
import DescriptionIcon from '@mui/icons-material/Description';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PeopleIcon from '@mui/icons-material/People';


// Recibe availableTags y setAvailableTags de MainApp
const AppLayout = ({ availableTags, setAvailableTags }) => {
  const [tab, setTab] = useState(0);
  const handleTabChange = (e, v) => setTab(v);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Diario Personal</Typography>
          {/* Podrías añadir un botón de Logout aquí si quieres */}
        </Toolbar>
        {/* Pestañas con iconos */}
        <Tabs value={tab} onChange={handleTabChange} centered variant="fullWidth" textColor="inherit" indicatorColor="secondary">
          <Tab icon={<DescriptionIcon />} iconPosition="start" label="Entradas" />
          <Tab icon={<LocalOfferIcon />} iconPosition="start" label="Etiquetas" />
          <Tab icon={<PeopleIcon />} iconPosition="start" label="Personas/Lugares" />
        </Tabs>
      </AppBar>
      {/* El Box principal ahora ocupa el espacio restante */}
      <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, flexGrow: 1, overflowY: 'auto' }}> {/* Añadir padding responsivo y flexGrow */}
        {/* Pasar props a cada página */}
        {tab === 0 && <EntradasPage
          availableTags={availableTags}
          setAvailableTags={setAvailableTags} // Pasarlo si EntradasPage necesita modificar tags (ej: crear una nueva)
        />}
        {tab === 1 && <EtiquetasPage
          availableTags={availableTags}
          setAvailableTags={setAvailableTags}
          // entries={entries} // Quitar si el contador ya no se usa
        />}
        {/* PersonasLugaresPage no necesita las tags directamente por ahora */}
        {tab === 2 && <PersonasLugaresPage /* entries={entries} */ />}
      </Box>
    </Box>
  );
};

export default AppLayout;