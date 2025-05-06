import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";

export async function exportUserBackup() {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error("Usuario no autenticado");

  const result = {
    userData: null, // Incluye availableTags y otros datos del usuario
    entries: [],
    notebooks: [],
    profiles: [],
  };

  // 1. Documento principal del usuario (incluye availableTags)
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      result.userData = { id: userDocSnap.id, ...userDocSnap.data() };
    } else {
      result.userData = { id: userId };
    }
  } catch (error) {
    result.userData = { id: userId };
  }

  // 2. Entradas
  try {
    const entriesSnap = await getDocs(collection(db, `users/${userId}/entries`));
    result.entries = entriesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {}

  // 3. Cuadernos
  try {
    const notebooksSnap = await getDocs(collection(db, `users/${userId}/notebooks`));
    result.notebooks = notebooksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {}

  // 4. Perfiles
  try {
    const profilesSnap = await getDocs(collection(db, `users/${userId}/profiles`));
    result.profiles = profilesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {}

  return result;
}