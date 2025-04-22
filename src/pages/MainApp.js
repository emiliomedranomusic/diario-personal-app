// MainApp.js: Carga datos y pasa a AppLayout
import React, { useState } from 'react';
import { auth } from '../firebase';
import AppLayout from '../AppLayout';

// Removed unused imports for deleted components (Sidebar, ProfileEditor, AddProfileModal, PersonName, Dashboard)

const MainApp = () => {
  const [availableTags, setAvailableTags] = useState([
    "Dios/Iglesia", "Familia", "Amor", "Amigos", "Trabajo", "Educación"
  ]);

  return (
    <AppLayout
      availableTags={availableTags}
      setAvailableTags={setAvailableTags}
    />
  );
};

export default MainApp;
