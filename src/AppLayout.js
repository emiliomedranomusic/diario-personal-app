// Layout principal con menú superior tipo tabs
import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Tabs, Tab, Box } from '@mui/material';
import EntradasPage from './pages/EntradasPage';
import EtiquetasPage from './pages/EtiquetasPage';
import PersonasLugaresPage from './pages/PersonasLugaresPage';

// Removed unused imports for deleted components (Sidebar, ProfileEditor, AddProfileModal, PersonName, Dashboard)

const AppLayout = ({ availableTags, setAvailableTags }) => {
  const [tab, setTab] = useState(0);
  const handleTabChange = (e, v) => setTab(v);

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Diario Personal</Typography>
        </Toolbar>
        <Tabs value={tab} onChange={handleTabChange} centered textColor="inherit" indicatorColor="secondary">
          <Tab label="Entradas" />
          <Tab label="Etiquetas" />
          <Tab label="Personas/Lugares" />
        </Tabs>
      </AppBar>
      <Box sx={{ p: 3 }}>
        {tab === 0 && <EntradasPage
          availableTags={availableTags}
          setAvailableTags={setAvailableTags}
        />}
        {tab === 1 && <EtiquetasPage availableTags={availableTags} setAvailableTags={setAvailableTags} />}
        {tab === 2 && <PersonasLugaresPage />}
      </Box>
    </Box>
  );
};

export default AppLayout;
