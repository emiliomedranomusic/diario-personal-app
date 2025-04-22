import { db, auth } from '../firebase';
import {
    collection, query, orderBy, limit, getDocs,
    startAfter, doc, deleteDoc, getDoc
} from 'firebase/firestore';

const getCurrentUserId = () => {
    const user = auth.currentUser;
    return user ? user.uid : null;
};

export const PAGE_SIZE = 20;

export const getMoreEntries = async (startAfterDoc) => {
    const userId = getCurrentUserId();
    if (!userId || !startAfterDoc) return { entries: [], lastVisible: null, hasMore: false };

    const entriesRef = collection(db, 'users', userId, 'entries');
    const q = query(
        entriesRef,
        orderBy('updatedAt', 'desc'),
        startAfter(startAfterDoc),
        limit(PAGE_SIZE)
    );

    try {
        const documentSnapshots = await getDocs(q);
        const entries = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const lastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1];
        const hasMore = entries.length === PAGE_SIZE;
        return { entries, lastVisible, hasMore };
    } catch (error) {
        console.error("Error fetching more entries: ", error);
        return { entries: [], lastVisible: startAfterDoc, hasMore: false };
    }
};

export const deleteEntryById = async (entryId) => {
    const userId = getCurrentUserId();
    if (!userId || !entryId) throw new Error("Falta ID de usuario o entrada");

    const entryRef = doc(db, 'users', userId, 'entries', entryId);
    try {
        await deleteDoc(entryRef);
        console.log("Entry deleted successfully:", entryId);
    } catch (error) {
        console.error("Error deleting entry:", error);
        throw error;
    }
};

export const getEntryById = async (entryId) => {
    const userId = getCurrentUserId();
    if (!userId || !entryId) return null;
    const entryRef = doc(db, 'users', userId, 'entries', entryId);
    try {
        const docSnap = await getDoc(entryRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching entry by ID:", error);
        return null;
    }
};
