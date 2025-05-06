// src/services/userService.js
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';

// Tus etiquetas iniciales por defecto (pueden estar aquí o importadas)
const DEFAULT_TAGS = [
    { name: "Dios/Iglesia", icon: "Church", color: "#795548" },
    { name: "Familia", icon: "FamilyRestroom", color: "#ff7043" },
    { name: "Amor", icon: "FavoriteBorder", color: "#e91e63" },
    { name: "Amigos", icon: "Group", color: "#4caf50" },
    { name: "Trabajo", icon: "WorkOutline", color: "#2196f3" },
    { name: "Educación", icon: "School", color: "#9c27b0" },
    { name: "Viaje", icon: "Flight", color: "#00acc1" },
    { name: "Salud", icon: "LocalHospital", color: "#ef5350" },
    { name: "Dinero", icon: "AttachMoney", color: "#ffc107" },
];

const DEFAULT_TAG_COLOR = '#757575';
const DEFAULT_TAG_ICON = 'LocalOfferOutlined';

// Normalización (puede quedarse aquí)
export function normalizeTags(tags) {
    if (!Array.isArray(tags)) return [];
    return tags.map(t => {
      if (typeof t === 'string') { return { name: t, color: DEFAULT_TAG_COLOR, icon: DEFAULT_TAG_ICON }; }
      return { name: t.name || "Etiqueta inválida", color: t.color || DEFAULT_TAG_COLOR, icon: t.icon || DEFAULT_TAG_ICON, ...t };
    });
}


/**
 * Obtiene el documento del usuario actual.
 * @returns {Promise<object|null>} Datos del usuario o null.
 */
const getUserDoc = async () => {
    const user = auth.currentUser;
    if (!user) return null;
    const userDocRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);
    return docSnap.exists() ? docSnap.data() : null;
};

/**
 * Escucha cambios en el documento del usuario.
 * @param {function} callback Función a llamar con los datos del usuario.
 * @returns {function} Unsubscribe function.
 */
export const subscribeToUserData = (callback) => {
    const user = auth.currentUser;
    if (!user) {
        callback(null); // Llamar con null si no hay usuario
        return () => {}; // Devuelve función vacía
    }
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data());
        } else {
            // El documento del usuario podría no existir si solo se usa Auth
            console.log("User document does not exist yet.");
            callback({ uid: user.uid }); // Devolver al menos el UID
        }
    }, (error) => {
        console.error("Error subscribing to user data:", error);
        callback(null); // Devolver null en error
    });
    return unsubscribe;
};


/**
 * Obtiene las etiquetas disponibles del usuario o las inicializa con defaults.
 * Llama al callback con las etiquetas y devuelve la función de unsubscribe.
 * @param {function} setTagsCallback Función para actualizar el estado de las etiquetas.
 * @returns {function} Unsubscribe function.
 */
export const subscribeToAvailableTags = (setTagsCallback) => {
    const user = auth.currentUser;
    if (!user) {
        setTagsCallback(normalizeTags(DEFAULT_TAGS)); // Mostrar defaults si no hay user? O array vacío?
        return () => {};
    }

    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(userDocRef, async (docSnap) => {
        if (docSnap.exists()) {
            const userData = docSnap.data();
            if (userData.availableTags && Array.isArray(userData.availableTags)) {
                console.log("User tags found in Firestore.");
                setTagsCallback(normalizeTags(userData.availableTags)); // Usar y normalizar las guardadas
            } else {
                // Si el campo no existe, usar defaults y guardarlos
                console.log("User tags not found, initializing with defaults and saving.");
                const normalizedDefaults = normalizeTags(DEFAULT_TAGS);
                setTagsCallback(normalizedDefaults);
                try {
                    // Usar updateDoc para no sobrescribir otros campos del usuario
                    await updateDoc(userDocRef, { availableTags: normalizedDefaults });
                } catch (error) {
                     // Si update falla (doc no existe?), intentar setDoc
                     if (error.code === 'not-found') {
                          try {
                               await setDoc(userDocRef, { availableTags: normalizedDefaults }, { merge: true });
                          } catch (setError) {
                               console.error("Error setting initial tags:", setError);
                          }
                     } else {
                          console.error("Error updating initial tags:", error);
                     }
                }
            }
        } else {
            // Si el documento del usuario no existe, crearlo con las etiquetas default
            console.log("User document not found, creating with default tags.");
             const normalizedDefaults = normalizeTags(DEFAULT_TAGS);
             setTagsCallback(normalizedDefaults);
             try {
                 await setDoc(userDocRef, { availableTags: normalizedDefaults }); // Crear documento
             } catch (error) {
                 console.error("Error creating user document with tags:", error);
             }
        }
    }, (error) => {
        console.error("Error subscribing to user tags:", error);
        setTagsCallback(normalizeTags(DEFAULT_TAGS)); // Fallback a defaults en error
    });

    return unsubscribe;
};


/**
 * Actualiza el array completo de availableTags en Firestore para el usuario actual.
 * @param {Array<object>} newTagsArray El nuevo array completo de etiquetas.
 * @returns {Promise<void>}
 */
export const updateUserTags = async (newTagsArray) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuario no autenticado");
    if (!Array.isArray(newTagsArray)) throw new Error("Se esperaba un array de etiquetas");

    const userDocRef = doc(db, 'users', user.uid);
    try {
        // Sobrescribir el campo 'availableTags' completo
        await updateDoc(userDocRef, {
            availableTags: newTagsArray
        });
        console.log("User tags updated in Firestore.");
    } catch (error) {
         // Si update falla (doc no existe?), intentar setDoc con merge
         if (error.code === 'not-found') {
              try {
                   await setDoc(userDocRef, { availableTags: newTagsArray }, { merge: true });
                   console.log("User tags set in Firestore (doc created).");
              } catch (setError) {
                   console.error("Error setting tags in new user doc:", setError);
                   throw setError;
              }
         } else {
              console.error("Error updating user tags:", error);
              throw error;
         }
    }
};