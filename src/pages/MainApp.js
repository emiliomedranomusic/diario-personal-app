// src/pages/MainApp.js
import React, { useState, useEffect } from 'react';
import AppLayout from '../AppLayout';
// Importar funciones del servicio
import { subscribeToAvailableTags, updateUserTags } from '../services/userService';
import { auth } from '../firebase'; // Importar auth para comprobar usuario
import { onAuthStateChanged } from "firebase/auth"; // Importar para detectar cambios de auth

const MainApp = () => {
  // Estado local para las etiquetas, se cargará desde Firestore
  const [availableTags, setAvailableTags] = useState([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true); // Estado de carga
  const [currentUser, setCurrentUser] = useState(auth.currentUser); // Estado para el usuario

   // Listener para cambios de autenticación
   useEffect(() => {
       const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
           console.log("Auth state changed, user:", user?.uid);
           setCurrentUser(user); // Actualizar usuario
       });
       return () => unsubscribeAuth();
   }, []);


  // useEffect para suscribirse a las etiquetas del usuario actual
  useEffect(() => {
    // Solo suscribirse si hay un usuario
    if (currentUser) {
        setIsLoadingTags(true);
        console.log(`Setting up tag listener for user: ${currentUser.uid}`);
        // Llamar al servicio que maneja la carga inicial y las actualizaciones
        const unsubscribeTags = subscribeToAvailableTags((tagsFromFirestore) => {
            setAvailableTags(tagsFromFirestore);
            setIsLoadingTags(false);
            console.log("Local availableTags state updated from Firestore.");
        });
        // Devolver la función de limpieza para cancelar la suscripción
        return () => unsubscribeTags();
    } else {
        // Si no hay usuario, limpiar etiquetas y estado de carga
        setAvailableTags([]);
        setIsLoadingTags(false);
        console.log("No user, tags cleared.");
    }
  }, [currentUser]); // <- Volver a suscribirse si el usuario cambia


  // *** NUEVA FUNCIÓN para actualizar etiquetas (en estado Y Firestore) ***
  const handleSetAvailableTags = async (newTagsOrCallback) => {
      let finalNewTags = [];
      // Permitir pasar una función de actualización como en useState
      if (typeof newTagsOrCallback === 'function') {
          // Llamar a la función callback pasándole el estado actual
          setAvailableTags(prevTags => {
               finalNewTags = newTagsOrCallback(prevTags);
               // Actualizar Firestore DESPUÉS de que el estado local se actualice (o casi)
               updateUserTags(finalNewTags).catch(error => {
                   console.error("Failed to update tags in Firestore:", error);
                   // Opcional: Revertir estado local o mostrar error
               });
               return finalNewTags; // Devolver nuevo estado
          });
      } else {
          // Si se pasa directamente el nuevo array
          finalNewTags = newTagsOrCallback;
          setAvailableTags(finalNewTags); // Actualizar estado local
          // Actualizar Firestore
          updateUserTags(finalNewTags).catch(error => {
               console.error("Failed to update tags in Firestore:", error);
               // Opcional: Revertir estado local o mostrar error
           });
      }
  };


  // Mostrar "Cargando..." mientras se obtienen las etiquetas iniciales
  if (isLoadingTags && auth.currentUser) {
      return <div>Cargando datos del usuario...</div>; // O un spinner más elegante
  }


  return (
    <AppLayout
      availableTags={availableTags}
      // *** PASAR LA NUEVA FUNCIÓN DE ACTUALIZACIÓN ***
      setAvailableTags={handleSetAvailableTags}
    />
  );
};

export default MainApp;