// Layout principal con menú superior tipo tabs
import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Tabs, Tab, Box } from '@mui/material';
import EntradasPage from './pages/EntradasPage';
import EtiquetasPage from './pages/EtiquetasPage';
import PersonasLugaresPage from './pages/PersonasLugaresPage';

// Removed unused imports for deleted components (Sidebar, ProfileEditor, AddProfileModal, PersonName, Dashboard)

const AppLayout = ({ entries, availableTags, setAvailableTags, onUpdateEntries, handleDeleteEntry }) => {
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
          entries={entries} 
          availableTags={availableTags} 
          setAvailableTags={setAvailableTags} 
          onUpdateEntries={onUpdateEntries}
          handleDelete={entry => handleDeleteEntry(entry?.id)} 
        />}
        {tab === 1 && <EtiquetasPage availableTags={availableTags} setAvailableTags={setAvailableTags} />}
        {tab === 2 && <PersonasLugaresPage entries={entries} />}
      </Box>
    </Box>
  );
};

export default AppLayout;
