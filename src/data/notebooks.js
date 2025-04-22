// Funciones para manejar cuadernos en Firebase
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore';

export async function getUserNotebooks() {
  const user = auth.currentUser;
  if (!user) return [];
  const notebooksRef = collection(db, 'users', user.uid, 'notebooks');
  const snapshot = await getDocs(notebooksRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function createNotebook(nombre) {
  const user = auth.currentUser;
  if (!user) throw new Error('No autenticado');
  const notebooksRef = collection(db, 'users', user.uid, 'notebooks');
  const docRef = await addDoc(notebooksRef, {
    nombre,
    fechaCreacion: serverTimestamp(),
    fechaActualizacion: serverTimestamp(),
    parentId: null
  });
  return { id: docRef.id, nombre };
}

export async function deleteNotebook(notebookId) {
  const user = auth.currentUser;
  if (!user) throw new Error('No autenticado');
  const notebookRef = doc(db, 'users', user.uid, 'notebooks', notebookId);
  await deleteDoc(notebookRef);
}

// Mueve todas las notas de un cuaderno a 'General' en Firebase
export async function moveEntriesToGeneral(notebookId) {
  const user = auth.currentUser;
  if (!user) throw new Error('No autenticado');
  const entriesRef = collection(db, 'users', user.uid, 'entries');
  const q = query(entriesRef, where('notebookId', '==', notebookId));
  const snapshot = await getDocs(q);
  const updates = snapshot.docs.map(docSnap => updateDoc(docSnap.ref, { notebookId: 'default' }));
  await Promise.all(updates);
}

/**
 * Actualiza el nombre de un cuaderno existente.
 * @param {string} notebookId ID del cuaderno a actualizar.
 * @param {string} newName Nuevo nombre para el cuaderno.
 * @returns {Promise<void>}
 */
export async function updateNotebookName(notebookId, newName) {
    const user = auth.currentUser;
    if (!user) throw new Error('No autenticado');
    if (!notebookId) throw new Error('Se requiere ID del cuaderno');
    const trimmedName = newName.trim();
    if (!trimmedName) throw new Error('El nuevo nombre no puede estar vacío');
    const notebookRef = doc(db, 'users', user.uid, 'notebooks', notebookId);
    try {
        await updateDoc(notebookRef, {
            nombre: trimmedName,
            fechaActualizacion: serverTimestamp()
        });
        console.log(`Notebook ${notebookId} updated with name: ${trimmedName}`);
    } catch (error) {
        console.error("Error updating notebook name: ", error);
        throw error;
    }
}

// Futuras funciones: etc.
