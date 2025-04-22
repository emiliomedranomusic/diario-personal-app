import { db, auth } from '../firebase';
import {
    collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
    query, where, serverTimestamp, onSnapshot, orderBy, writeBatch, limit
} from 'firebase/firestore';

const getCurrentUserId = () => {
    const user = auth.currentUser;
    if (!user) {
        console.error("No user logged in for Firestore operation.");
        return null;
    }
    return user.uid;
};

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
            fechaCreacion: serverTimestamp()
        });
        console.log("Profile added with ID: ", docRef.id);
        return { id: docRef.id, ...dataToSave, nombreLower };
    } catch (error) { console.error("Error adding profile: ", error); throw error; }
};

export const updateProfile = async (profileId, profileData) => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuario no autenticado");
    if (!profileId) throw new Error("Se requiere ID del perfil para actualizar");
    const profileRef = doc(db, 'users', userId, 'profiles', profileId);
    const { id, ...dataToUpdate } = profileData;
    if (dataToUpdate.nombre) {
        dataToUpdate.nombre = dataToUpdate.nombre.trim();
        dataToUpdate.nombreLower = dataToUpdate.nombre.toLowerCase();
        if (!dataToUpdate.nombre) throw new Error("El nombre del perfil no puede estar vacío");
    }
    try {
        await updateDoc(profileRef, {
            ...dataToUpdate,
            fechaActualizacion: serverTimestamp()
        });
        console.log("Profile updated: ", profileId);
    } catch (error) { console.error("Error updating profile: ", error); throw error; }
};

export const deleteProfile = async (profileId, cleanReferences = false) => {
    const userId = getCurrentUserId();
    if (!userId || !profileId) throw new Error("Usuario no autenticado o falta ID de perfil");

    const profileRef = doc(db, 'users', userId, 'profiles', profileId);
    const entriesRef = collection(db, 'users', userId, 'entries');

    try {
        const batch = writeBatch(db);
        batch.delete(profileRef);

        if (cleanReferences) {
            console.log(`Attempting to clean references for profile ${profileId}`);
            // *** LA CONSULTA CLAVE ***
            const q = query(entriesRef, where('profileRefs', 'array-contains', profileId));

            console.log(`Querying entries containing profileRef: ${profileId}`);
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
        console.log("Profile deleted (and references cleaned if requested): ", profileId);
    } catch (error) { console.error("Error deleting profile and/or cleaning references: ", error); throw error; }
};

export const findProfileByNameExact = async (name) => {
    const userId = getCurrentUserId();
    if (!userId || !name) return null;
    const profilesRef = collection(db, 'users', userId, 'profiles');
    const nameLower = name.trim().toLowerCase();
    const q = query(profilesRef, where('nombreLower', '==', nameLower), limit(1));
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
    } catch (error) {
        console.error("Error finding profile by exact name: ", error);
        return null;
    }
};

export const findProfilesByName = async (name) => {
    const userId = getCurrentUserId();
    if (!userId || !name) return [];
    const profilesRef = collection(db, 'users', userId, 'profiles');
    const nameLower = name.toLowerCase();
    const q = query(
        profilesRef,
        where('nombre', '>=', name),
        where('nombre', '<=', name + '\uf8ff')
    );
    try {
        console.log(`Searching profiles starting with: ${name}`);
        const querySnapshot = await getDocs(q);
        const profiles = [];
        querySnapshot.forEach((doc) => {
            if (doc.data().nombre.toLowerCase().startsWith(nameLower)) {
                profiles.push({ id: doc.id, ...doc.data() });
            }
        });
        console.log(`Found ${profiles.length} profiles starting with ${name}`);
        return profiles;
    } catch (error) {
        console.error("Error finding profiles by name: ", error);
        try {
            console.warn("Query failed, attempting client-side filter...");
            const allProfilesSnap = await getDocs(collection(db, 'users', userId, 'profiles'));
            const allProfiles = allProfilesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return allProfiles.filter(p => p.nombre.toLowerCase().includes(nameLower));
        } catch (fallbackError) {
            console.error("Client-side filter also failed:", fallbackError);
            return [];
        }
    }
};
