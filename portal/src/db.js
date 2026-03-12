import { db } from './firebase';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    orderBy
} from 'firebase/firestore';

// References to collections
const REPORTS_COLLECTION = "reports";
const DAILY_TASKS_COLLECTION = "daily_tasks";
const COMPLETIONS_COLLECTION = "completions";
const SETTINGS_COLLECTION = "settings";

// === Reports ===
export async function fetchReports() {
    const q = query(collection(db, REPORTS_COLLECTION), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function saveReport(report) {
    // Use the report ID or generate a new doc ref
    const reportRef = doc(collection(db, REPORTS_COLLECTION), report.id.toString());
    await setDoc(reportRef, report);
    return report;
}

// === Daily Tasks ===
export async function fetchDailyTasks() {
    const snapshot = await getDocs(collection(db, DAILY_TASKS_COLLECTION));
    if (snapshot.empty) return null;
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function saveDailyTask(task) {
    const taskRef = doc(collection(db, DAILY_TASKS_COLLECTION), task.id.toString());
    await setDoc(taskRef, task);
}

export async function deleteDailyTask(taskId) {
    const taskRef = doc(db, DAILY_TASKS_COLLECTION, taskId.toString());
    await deleteDoc(taskRef);
}

// === Daily Completions ===
export async function fetchCompletions(dateKey) {
    const snapshot = await getDocs(collection(db, COMPLETIONS_COLLECTION));
    let comps = {};
    snapshot.docs.forEach(doc => {
        if (doc.id === dateKey) comps = doc.data();
    });
    return comps;
}

export async function saveCompletions(dateKey, completionsObj) {
    const compRef = doc(db, COMPLETIONS_COLLECTION, dateKey);
    await setDoc(compRef, completionsObj, { merge: true });
}

// === Settings ===
export async function fetchSettings() {
    const snapshot = await getDocs(collection(db, SETTINGS_COLLECTION));
    let settings = {};
    snapshot.docs.forEach(doc => {
        settings[doc.id] = doc.data().data; // wrap in data to maintain arrays
    });
    return settings;
}

export async function saveSetting(key, data) {
    const settingRef = doc(db, SETTINGS_COLLECTION, key);
    await setDoc(settingRef, { data });
}

// === User Profiles ===
export async function fetchUserProfile(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
}

export async function saveUserProfile(uid, profile) {
    await setDoc(doc(db, 'users', uid), profile);
}
