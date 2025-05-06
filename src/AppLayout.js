// src/AppLayout.js
import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Tabs, Tab, Box, Button} from '@mui/material';
import EntradasPage from './pages/EntradasPage';
import EtiquetasPage from './pages/EtiquetasPage';
import PersonasLugaresPage from './pages/PersonasLugaresPage';
import DescriptionIcon from '@mui/icons-material/Description';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PeopleIcon from '@mui/icons-material/People';
import { signOut } from "firebase/auth";
import { auth } from "./firebase";

// Recibe availableTags (objetos) y la función handleSetAvailableTags
const AppLayout = ({ availableTags, setAvailableTags }) => {
  const [tab, setTab] = useState(0);
  const handleTabChange = (e, v) => setTab(v);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        {/* ... Toolbar ... */}
        <Tabs value={tab} onChange={handleTabChange} centered variant="fullWidth" textColor="inherit" indicatorColor="secondary">
          <Tab icon={<DescriptionIcon />} iconPosition="start" label="Entradas" />
          <Tab icon={<LocalOfferIcon />} iconPosition="start" label="Etiquetas" />
          <Tab icon={<PeopleIcon />} iconPosition="start" label="Personas/Lugares" />
        </Tabs>
        
      </AppBar>
      <Button
  variant="outlined"
  color="secondary"
  onClick={() => signOut(auth)}
  style={{ marginLeft: 16 }}
>
  Cerrar sesión
</Button>
      <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, flexGrow: 1, overflowY: 'auto' }}>
        {/* Pasar las props a las páginas que las necesiten */}
        {tab === 0 && <EntradasPage
          availableTags={availableTags} // <-- Pasa las etiquetas ya normalizadas
          setAvailableTags={setAvailableTags} // <-- Pasa la función que guarda en Firestore
           />}
        {tab === 1 && <EtiquetasPage
          availableTags={availableTags} // <-- Pasa las etiquetas ya normalizadas
          setAvailableTags={setAvailableTags} // <-- Pasa la función que guarda en Firestore
        />}
        {tab === 2 && <PersonasLugaresPage /* entries={entries} */ />}
      </Box>
    </Box>
  );
};

export default AppLayout;