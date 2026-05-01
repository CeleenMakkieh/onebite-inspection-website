import { db, storage } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// ── Firestore ──

export async function saveReceipt(receipt) {
    const id = receipt.id || String(Date.now());
    await setDoc(doc(db, 'receipts', String(id)), { ...receipt, id });
    return id;
}

export async function fetchReceipts() {
    const snap = await getDocs(collection(db, 'receipts'));
    return snap.docs.map(d => d.data()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function fetchReceiptsByLocation(location) {
    const snap = await getDocs(query(collection(db, 'receipts'), where('location', '==', location)));
    return snap.docs.map(d => d.data()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function deleteReceipt(id) {
    await deleteDoc(doc(db, 'receipts', String(id)));
}

export async function saveReceiptItems(receiptId, items) {
    await setDoc(doc(db, 'receipt_items', String(receiptId)), { receiptId, items });
}

export async function fetchReceiptItems(receiptId) {
    const snap = await getDocs(query(collection(db, 'receipt_items'), where('receiptId', '==', String(receiptId))));
    if (snap.empty) return [];
    return snap.docs[0].data().items || [];
}

export async function deleteReceiptItems(receiptId) {
    await deleteDoc(doc(db, 'receipt_items', String(receiptId)));
}

// ── Budgets ──

export async function fetchBudgets() {
    const snap = await getDoc(doc(db, 'settings', 'monthlyBudgets'));
    return snap.exists() ? (snap.data().data || {}) : {};
}

export async function saveBudget(location, amount) {
    const snap = await getDoc(doc(db, 'settings', 'monthlyBudgets'));
    const existing = snap.exists() ? (snap.data().data || {}) : {};
    await setDoc(doc(db, 'settings', 'monthlyBudgets'), { data: { ...existing, [location]: amount } });
}

// ── Firebase Storage ──

export async function uploadReceiptImage(receiptId, file) {
    const ext = file.name.split('.').pop();
    const path = `receipts/${receiptId}/receipt.${ext}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
}

export async function deleteReceiptImage(receiptId, ext) {
    const path = `receipts/${receiptId}/receipt.${ext}`;
    try { await deleteObject(ref(storage, path)); } catch (_) { /* ignore if not found */ }
}
