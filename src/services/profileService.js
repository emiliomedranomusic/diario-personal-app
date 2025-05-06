// src/services/profileService.js
import { db, auth } from '../firebase';
import {
    collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
    query, where, serverTimestamp, onSnapshot, orderBy, writeBatch, limit,
    getDoc // <-- Importar getDoc
} from 'firebase/firestore';
// *** Importar la función de actualización de entryService ***
// Ajusta la ruta si tu archivo entryService.js está en otro lugar (ej: '../services/entryService')
import { updateEntryProfileRefsAndContent } from './entryService';

const getCurrentUserId = () => {
    const user = auth.currentUser;
    if (!user) {
        console.error("No user logged in for Firestore operation.");
        return null;
    }
    return user.uid;
};

// Función para escuchar perfiles (sin cambios)
export const subscribeToUserProfiles = (callback) => {
    const userId = getCurrentUserId();
    if (!userId) return () => {};
    const profilesRef = collection(db, 'users', userId, 'profiles');
    const q = query(profilesRef, orderBy('nombre', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const profiles = [];
        querySnapshot.forEach((doc) => {
            profiles.push({ id: doc.id, ...doc.data() });
        });
        console.log("Firestore profiles updated:", profiles.length);
        callback(profiles);
    }, (error) => {
        console.error("Error subscribing to profiles: ", error);
        callback([]);
    });
    return unsubscribe;
};

// Función para añadir perfil (sin cambios)
export const addProfile = async (profileData) => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuario no autenticado");
    const profilesRef = collection(db, 'users', userId, 'profiles');
    const { id, ...dataToSave } = profileData;
    const nombreLower = dataToSave.nombre ? dataToSave.nombre.trim().toLowerCase() : '';
    if (!nombreLower) throw new Error("El nombre del perfil no puede estar vacío");

    try {
        const docRef = await addDoc(profilesRef, {
            ...dataToSave,
            nombre: dataToSave.nombre.trim(),
            nombreLower: nombreLower,
            fechaCreacion: serverTimestamp() // <-- Usa serverTimestamp
        });
        console.log("Profile added with ID: ", docRef.id);
        return { id: docRef.id, ...dataToSave, nombreLower };
    } catch (error) { console.error("Error adding profile: ", error); throw error; }
};

// *** FUNCIÓN updateProfile ACTUALIZADA ***
export const updateProfile = async (profileId, profileData) => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuario no autenticado");
    if (!profileId) throw new Error("Se requiere ID del perfil para actualizar");

    const profileRef = doc(db, 'users', userId, 'profiles', profileId);
    const { id, ...dataToUpdate } = profileData; // Datos nuevos que llegan

    let oldName = null; // Variable para guardar el nombre anterior

    // Preparar los datos y obtener el nombre viejo SI el nombre está cambiando
    if (dataToUpdate.nombre !== undefined) { // Verificar si 'nombre' está en los datos a actualizar
        const newTrimmedName = dataToUpdate.nombre.trim();
        if (!newTrimmedName) {
            throw new Error("El nombre del perfil no puede estar vacío al actualizar");
        }
        dataToUpdate.nombre = newTrimmedName; // Usar versión sin espacios extra
        dataToUpdate.nombreLower = newTrimmedName.toLowerCase(); // Actualizar campo en minúsculas

        // Leer el documento actual para obtener el nombre viejo ANTES de actualizar
        try {
            const docSnap = await getDoc(profileRef); // Obtener el documento actual
            if (docSnap.exists()) {
                const currentData = docSnap.data();
                // Solo guardar oldName si el nombre actual es diferente al nuevo
                if (currentData.nombre !== dataToUpdate.nombre) {
                    oldName = currentData.nombre;
                }
            } else {
                console.warn(`Profile document ${profileId} not found before update.`);
                // Si no existe, no podemos obtener nombre viejo, no se hará cascada
                oldName = null;
            }
        } catch (readError) {
            console.error("Error reading profile before update:", readError);
            oldName = null; // No intentar cascada si falla la lectura
        }
    }

    try {
        // Realizar la actualización del documento del perfil
        await updateDoc(profileRef, {
            ...dataToUpdate, // Aplicar todos los cambios
            fechaActualizacion: serverTimestamp() // Actualizar timestamp
        });
        console.log("Profile updated successfully: ", profileId);

        // *** LLAMAR A LA ACTUALIZACIÓN EN CASCADA SI el nombre cambió ***
        if (oldName && dataToUpdate.nombre) {
             console.log(`Profile name changed from "${oldName}" to "${dataToUpdate.nombre}". Triggering entry update...`);
             // Llamar a la función de entryService. No necesitamos esperar (await) aquí.
             // Se ejecutará en segundo plano. Manejar errores dentro de esa función si es necesario.
             updateEntryProfileRefsAndContent(profileId, oldName, dataToUpdate.nombre)
                .then(() => console.log(`Background entry update started for profile ${profileId}`))
                .catch(err => console.error(`Background entry update failed for profile ${profileId}:`, err));
        }

    } catch (error) {
        console.error("Error updating profile document: ", error);
        throw error; // Relanzar el error de actualización principal
    }
};

// Función para borrar perfil (sin cambios respecto a la última versión)
export const deleteProfile = async (profileId, cleanReferences = false) => {
    const userId = getCurrentUserId();
    if (!userId || !profileId) throw new Error("...");
    const profileRef = doc(db, 'users', userId, 'profiles', profileId);
    const entriesRef = collection(db, 'users', userId, 'entries');
    try {
        const batch = writeBatch(db);
        console.log(`Marking profile ${profileId} for deletion.`);
        batch.delete(profileRef);
        if (cleanReferences) {
            console.log(`Attempting to clean references for profile ${profileId}`);
            const q = query(entriesRef, where('profileRefs', 'array-contains', profileId));
            const snapshot = await getDocs(q);
            console.log(`Found ${snapshot.size} entries containing the ref.`);
            snapshot.forEach(entryDoc => {
                const entryData = entryDoc.data();
                const currentRefs = entryData.profileRefs || [];
                const updatedRefs = currentRefs.filter(refId => refId !== profileId);
                batch.update(entryDoc.ref, { profileRefs: updatedRefs });
                console.log(`  Updating entry ${entryDoc.id}, removing ref ${profileId}. New refs:`, updatedRefs);
            });
        }
        await batch.commit();
        console.log('Profile deleted (and references cleaned if requested): ', profileId);
    } catch (error) { console.error('Error deleting profile and/or cleaning references: ', error); throw error; }
};

// Función para buscar perfil por nombre exacto (sin cambios)
export const findProfileByNameExact = async (name) => {
    const userId = getCurrentUserId();
    if (!userId || !name) return null; // Devolver null si no se encuentra
    const profilesRef = collection(db, 'users', userId, 'profiles');
    const nameLower = name.trim().toLowerCase();
    const q = query(profilesRef, where('nombreLower', '==', nameLower), limit(1)); // Necesita índice
    try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            console.log(`Profile found by name '${name}': ${docSnap.id}`);
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.log(`Profile not found by name: '${name}'`);
            return null;
        }
    } catch (error) { console.error("Error finding profile by exact name: ", error); return null; }
};

// Función para buscar perfiles por prefijo (sin cambios)
export const findProfilesByName = async (name) => { /* ... */ };