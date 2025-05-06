// src/services/entryService.js
import { db, auth, storage } from '../firebase';
import {
    collection, query, orderBy, limit, getDocs,
    startAfter, doc, deleteDoc, getDoc, where, updateDoc, writeBatch
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';

const getCurrentUserId = () => {
    const user = auth.currentUser;
    return user ? user.uid : null;
};

export const PAGE_SIZE = 20;

// Función para obtener más entradas
export const getMoreEntries = async (startAfterDoc) => {
    const userId = getCurrentUserId();
    if (!userId || !startAfterDoc) return { entries: [], lastVisible: null, hasMore: false };
    const entriesRef = collection(db, 'users', userId, 'entries');
    const q = query(
        entriesRef,
        orderBy('updatedAt', 'desc'), // Usar updatedAt para ordenación consistente
        startAfter(startAfterDoc),
        limit(PAGE_SIZE)
    );
    try {
        const documentSnapshots = await getDocs(q);
        const entries = documentSnapshots.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        const lastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1];
        const hasMore = entries.length === PAGE_SIZE;
        return { entries, lastVisible, hasMore };
    } catch (error) {
        console.error("Error fetching more entries (check index 'updatedAt' desc?): ", error);
        return { entries: [], lastVisible: startAfterDoc, hasMore: false };
    }
};

// Función para borrar entrada Y SUS ADJUNTOS
export const deleteEntryById = async (entryId) => {
    const userId = getCurrentUserId();
    if (!userId || !entryId) throw new Error("Falta ID de usuario o entrada");
    const entryRef = doc(db, 'users', userId, 'entries', entryId);
    try {
        const entryDoc = await getDoc(entryRef);
        if (!entryDoc.exists()) {
            console.warn("Attempting to delete non-existent entry:", entryId);
            return;
        }
        const entryData = entryDoc.data();
        const attachments = entryData.attachments || [];
        const deleteResults = await Promise.allSettled(attachments.map(async (attachment) => {
            if (!attachment.fullPath) return;
            try {
                await deleteObject(ref(storage, attachment.fullPath));
                console.log("Adjunto eliminado:", attachment.fullPath);
            } catch (error) {
                console.error("Error eliminando adjunto:", attachment.fullPath, error);
            }
        }));
        console.log("Attachment deletion results:", deleteResults);
        await deleteDoc(entryRef);
        console.log("Entry deleted successfully:", entryId);
    } catch (error) {
        console.error("Error deleting entry:", error);
        throw error;
    }
};

// Función para obtener una entrada por ID
export const getEntryById = async (entryId) => {
    const userId = getCurrentUserId();
    if (!userId || !entryId) return null;
    const entryRef = doc(db, 'users', userId, 'entries', entryId);
    try {
        const docSnap = await getDoc(entryRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (error) { console.error("Error fetching entry by ID:", error); return null; }
};

// Función auxiliar para quitar acentos
function quitarAcentos(str) {
    if (typeof str !== 'string') return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Función de búsqueda (simplificada, requiere índices)
export const searchEntries = async (searchTerm) => {
    const userId = auth.currentUser ? auth.currentUser.uid : null;
    if (!userId || !searchTerm || !searchTerm.trim()) return [];
    const entriesRef = collection(db, 'users', userId, 'entries');
    const term = quitarAcentos(searchTerm.trim().toLowerCase());

    // Query por título (requiere índice 'titleLower' Asc)
    const qTitle = query( entriesRef, where('titleLower', '>=', term), where('titleLower', '<=', term + '\uf8ff'), orderBy('titleLower'), limit(30) );
    // Query por tags (requiere índice 'tags' Array Contains)
    const qTags = query( entriesRef, where('tags', 'array-contains', searchTerm.trim()), limit(30) );

    try {
        const [titleSnap, tagsSnap] = await Promise.all([ getDocs(qTitle), getDocs(qTags) ]);
        const map = new Map();
        titleSnap.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));
        tagsSnap.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));

        const initialResults = Array.from(map.values());
        // Filtrado extra por contenido (frontend)
        const filteredByContent = initialResults.filter(entry => {
             const content = quitarAcentos((entry.content || '').toLowerCase());
             const titleMatches = entry.titleLower?.includes(term);
             const tagMatches = (entry.tags || []).includes(searchTerm.trim());
             const contentMatches = content.includes(term);
             const mentionMatches = content.includes('@' + term);
             return titleMatches || tagMatches || contentMatches || mentionMatches;
         });

        console.log(`Search found ${filteredByContent.length} results for "${searchTerm}" after content filter.`);
        return filteredByContent.sort((a, b) => { // Ordenar por fecha descendente
            const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : 0;
            const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : 0;
            return dateB - dateA;
        });

    } catch (error) {
         console.error("Error searching entries:", error);
         if (error.code === 'failed-precondition') { console.error("Firestore requiere índices para las búsquedas. Verifica la consola de Firebase."); }
         return [];
    }
};

// Script para actualizar titleLower
export const updateAllEntriesWithTitleLower = async () => {
    const userId = auth.currentUser ? auth.currentUser.uid : null;
    if (!userId) throw new Error('No autenticado');
    const entriesRef = collection(db, 'users', userId, 'entries');
    const snapshot = await getDocs(entriesRef);
    let updated = 0;
    let batch = writeBatch(db); // Inicializar batch fuera del bucle
    let batchCount = 0;
    const MAX_BATCH_WRITES = 400;

    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.title && data.titleLower === undefined) {
            console.log(`Updating titleLower for entry: ${docSnap.id}`);
            batch.update(docSnap.ref, { titleLower: data.title.toLowerCase() });
            updated++;
            batchCount++;
            if (batchCount >= MAX_BATCH_WRITES) {
                 await batch.commit();
                 console.log(`Committed batch of ${batchCount} titleLower updates.`);
                 batch = writeBatch(db); // Reiniciar batch
                 batchCount = 0;
            }
        }
    }
     if (batchCount > 0) {
          await batch.commit();
          console.log(`Committed final batch of ${batchCount} titleLower updates.`);
     }
    console.log(`Total entries checked: ${snapshot.size}. Entries updated with titleLower: ${updated}`);
    return updated;
};

// --- Función para Actualizar Menciones en Contenido (Placeholder) ---
export const updateEntryProfileRefsAndContent = async (profileId, oldName, newName) => {
    const userId = auth.currentUser?.uid;
    if (!userId || !profileId || !oldName || !newName || oldName === newName || !oldName.trim() || !newName.trim()) {
        return Promise.resolve();
    }
    console.warn(`Placeholder: updateEntryProfileRefsAndContent called for ${profileId}. Content update from @${oldName} to @${newName} is disabled.`);
    // Lógica comentada
    return Promise.resolve();
};

// --- FUNCIÓN PARA ACTUALIZAR TAGS EN ENTRADAS ---
export const updateTagInEntries = async (oldTagName, newTagName) => {
    const userId = auth.currentUser?.uid;
    if (!userId || !oldTagName || !newTagName || oldTagName === newTagName) return;
    console.log(`Updating tag in entries: "${oldTagName}" -> "${newTagName}"`);
    const entriesRef = collection(db, 'users', userId, 'entries');
    const q = query(entriesRef, where('tags', 'array-contains', oldTagName)); // Requiere índice tags (Array Contains)
    try {
        const snapshot = await getDocs(q);
        if (snapshot.empty) { console.log(`No entries found containing the tag "${oldTagName}".`); return; }
        const batch = writeBatch(db);
        let updatedCount = 0;
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const currentTags = Array.isArray(data.tags) ? data.tags : [];
            if (currentTags.includes(oldTagName)) {
                 const newTags = currentTags.map(tag => tag === oldTagName ? newTagName : tag);
                 batch.update(docSnap.ref, { tags: newTags });
                 updatedCount++;
                 console.log(`Updating tags for entry ${docSnap.id}`);
            }
        });
        if (updatedCount > 0) { await batch.commit(); console.log(`Successfully updated tag in ${updatedCount} entries.`); }
        else { console.log("No tags needed updating..."); }
    } catch (error) {
        console.error(`Error updating tag "${oldTagName}" in entries:`, error);
        if (error.code === 'failed-precondition') { console.error("¡ÍNDICE FALTANTE! Firestore requiere un índice en 'entries' para 'tags' (Array Contains)."); }
        throw error;
    }
};

// *** NUEVA FUNCIÓN: Eliminar una etiqueta específica de todas las entradas ***
/**
 * Elimina una etiqueta específica del array 'tags' en todas las entradas que la contengan.
 * @param {string} tagName El nombre de la etiqueta a eliminar.
 */
export const removeTagFromEntries = async (tagName) => {
    const userId = auth.currentUser?.uid;
    if (!userId || !tagName || !tagName.trim()) return;

    const trimmedTagName = tagName.trim();
    console.log(`Removing tag "${trimmedTagName}" from all entries...`);
    const entriesRef = collection(db, 'users', userId, 'entries');
    // Query para encontrar entradas que contienen la etiqueta a eliminar
    // Requiere índice: entries -> tags (Array Contains)
    const q = query(entriesRef, where('tags', 'array-contains', trimmedTagName));

    try {
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
             console.log(`No entries found containing the tag "${trimmedTagName}".`);
             return; // No hay nada que hacer
        }
        console.log(`Found ${snapshot.size} entries containing tag "${trimmedTagName}". Preparing update...`);

        const batch = writeBatch(db);
        let updatedCount = 0;

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const currentTags = Array.isArray(data.tags) ? data.tags : [];

            // Verificar si la etiqueta realmente está (importante por si acaso)
            if (currentTags.includes(trimmedTagName)) {
                 // Crear nuevo array filtrando la etiqueta eliminada
                 const newTags = currentTags.filter(tag => tag !== trimmedTagName);

                 // Opcional: Actualizar también un campo tagsLower si lo tuvieras
                 // const newTagsLower = newTags.map(t => t.toLowerCase());

                 batch.update(docSnap.ref, {
                     tags: newTags
                     // , tagsLower: newTagsLower
                 });
                 updatedCount++;
                 console.log(`Removing tag from entry ${docSnap.id}`);
            }
        });

        // Ejecutar el batch solo si hubo cambios para actualizar
        if (updatedCount > 0) {
            await batch.commit();
            console.log(`Successfully removed tag from ${updatedCount} entries.`);
        } else {
            console.log("No tags needed removing from the found entries (inconsistency?).");
        }

    } catch (error) {
        console.error(`Error removing tag "${trimmedTagName}" from entries:`, error);
        // Sugerir índice si falla la query
        if (error.code === 'failed-precondition') {
             console.error("¡ÍNDICE FALTANTE! Firestore requiere un índice en 'entries' para el campo 'tags' con modo 'Array Contains'.");
        }
        throw error; // Relanzar para que la UI sepa que falló la limpieza
    }
};