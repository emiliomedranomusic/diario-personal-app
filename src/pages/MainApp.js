// MainApp.js: Carga datos y pasa a AppLayout
import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { collection, doc, query, orderBy, onSnapshot, deleteDoc } from 'firebase/firestore';
import AppLayout from '../AppLayout';

// Removed unused imports for deleted components (Sidebar, ProfileEditor, AddProfileModal, PersonName, Dashboard)

const MainApp = () => {
  const [entries, setEntries] = useState([]);
  const [availableTags, setAvailableTags] = useState([
    "Dios/Iglesia", "Familia", "Amor", "Amigos", "Trabajo", "Educación"
  ]);

  // Cargar entradas
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const entriesRef = collection(userDocRef, 'entries');
    const q = query(entriesRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEntries = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setEntries(fetchedEntries);
    });
    return () => unsubscribe();
  }, []);

  // Sincronizar etiquetas con entradas (opcional: extraer de las entradas)
  // ...

  // Eliminar entrada
  const handleDeleteEntry = async (entryId) => {
    try {
      const user = auth.currentUser;
      if (!user || !entryId) return;
      const userDocRef = doc(db, 'users', user.uid);
      const entriesRef = collection(userDocRef, 'entries');
      const entryRef = doc(entriesRef, entryId);
      await deleteDoc(entryRef);
      // Firestore emitirá el cambio automáticamente por onSnapshot
    } catch (error) {
      alert('Error eliminando entrada: ' + error.message);
    }
  };

  return (
    <AppLayout
      entries={entries}
      availableTags={availableTags}
      setAvailableTags={setAvailableTags}
      onUpdateEntries={() => {}}
      handleDeleteEntry={handleDeleteEntry}
    />
  );
};

export default MainApp;
