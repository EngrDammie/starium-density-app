// ===== FIREBASE CONFIGURATION =====
window.firebaseConfig = window.firebaseConfig || {
    apiKey: "AIzaSyBO3Yrns0NibOzcM5EVUdQ62Std95ltZBk",
    authDomain: "starium-rafa-app.firebaseapp.com",
    projectId: "starium-rafa-app",
    storageBucket: "starium-rafa-app.firebasestorage.app",
    messagingSenderId: "743583982928",
    appId: "1:743583982928:web:e331aaa0b9e741a1537855"
};

if (!window.db) {
    try {
        window.app = firebase.apps.length > 0 ? firebase.app() : firebase.initializeApp(window.firebaseConfig);
        window.db = firebase.firestore();
    } catch (e) {
        console.error('Firebase initialization error:', e);
    }
}

// ===== LOCALSTORAGE OFFLINE QUEUE =====
window.OFFLINE_QUEUE_KEY = window.OFFLINE_QUEUE_KEY || 'starium_offline_queue';

// ===== APP CONFIG =====
window.DEFAULT_CONFIG = window.DEFAULT_CONFIG || {
    level9MinDensity: 0.200,
    level9MaxDensity: 0.310,
    botMinDensity: 0.200,
    botMaxDensity: 0.240,
    level9Divisor: 1580,
    botDivisor: 1680,
    dayShiftStart: 7,
    nightShiftStart: 19,
    showSettingsBtnIndex: true,
    showSettingsBtnLevel9Exec: true,
    showSettingsBtnBotExec: true,
    machineGridColumns: 6,
    productionLines: [
        { id: "1A", name: "Line 1A", order: 1 },
        { id: "1B", name: "Line 1B", order: 2 },
        { id: "2A", name: "Line 2A", order: 3 },
        { id: "2B", name: "Line 2B", order: 4 },
        { id: "3A", name: "Line 3A", order: 5 },
        { id: "3B", name: "Line 3B", order: 6 }
    ],
    machines: [
        { id: 1, gram: 125, min: 0.200, max: 0.270, line: "1A", name: "Machine 1" },
        { id: 2, gram: 85, min: 0.240, max: 0.300, line: "1A", name: "Machine 2" },
        { id: 3, gram: 85, min: 0.240, max: 0.300, line: "1A", name: "Machine 3" },
        { id: 4, gram: 85, min: 0.240, max: 0.300, line: "1A", name: "Machine 4" },
        { id: 5, gram: 85, min: 0.240, max: 0.300, line: "1A", name: "Machine 5" },
        { id: 6, gram: 125, min: 0.200, max: 0.270, line: "1B", name: "Machine 6" },
        { id: 7, gram: 85, min: 0.240, max: 0.300, line: "1B", name: "Machine 7" },
        { id: 8, gram: 850, min: 0.200, max: 0.270, line: "1B", name: "Machine 8" },
        { id: 9, gram: 85, min: 0.240, max: 0.300, line: "1B", name: "Machine 9" },
        { id: 10, gram: 22, min: 0.200, max: 0.310, line: "1B", name: "Machine 10" },
        { id: 11, gram: 85, min: 0.240, max: 0.300, line: "2A", name: "Machine 11" },
        { id: 12, gram: 85, min: 0.240, max: 0.300, line: "2A", name: "Machine 12" },
        { id: 13, gram: 85, min: 0.240, max: 0.300, line: "2A", name: "Machine 13" },
        { id: 14, gram: 85, min: 0.240, max: 0.300, line: "2A", name: "Machine 14" },
        { id: 15, gram: 85, min: 0.240, max: 0.300, line: "2A", name: "Machine 15" },
        { id: 16, gram: 850, min: 0.200, max: 0.270, line: "2B", name: "Machine 16" },
        { id: 17, gram: 85, min: 0.240, max: 0.300, line: "2B", name: "Machine 17" },
        { id: 18, gram: 85, min: 0.240, max: 0.300, line: "2B", name: "Machine 18" },
        { id: 19, gram: 85, min: 0.240, max: 0.300, line: "2B", name: "Machine 19" },
        { id: 20, gram: 85, min: 0.240, max: 0.300, line: "2B", name: "Machine 20" },
        { id: 21, gram: 850, min: 0.200, max: 0.270, line: "3A", name: "Machine 21" },
        { id: 22, gram: 45, min: 0.210, max: 0.310, line: "3A", name: "Machine 22" },
        { id: 23, gram: 45, min: 0.210, max: 0.310, line: "3A", name: "Machine 23" },
        { id: 24, gram: 45, min: 0.210, max: 0.310, line: "3A", name: "Machine 24" },
        { id: 25, gram: 45, min: 0.210, max: 0.310, line: "3A", name: "Machine 25" },
        { id: 26, gram: 850, min: 0.200, max: 0.270, line: "3B", name: "Machine 26" },
        { id: 27, gram: 45, min: 0.210, max: 0.310, line: "3B", name: "Machine 27" },
        { id: 28, gram: 45, min: 0.210, max: 0.310, line: "3B", name: "Machine 28" },
        { id: 29, gram: 45, min: 0.210, max: 0.310, line: "3B", name: "Machine 29" },
        { id: 30, gram: 45, min: 0.210, max: 0.310, line: "3B", name: "Machine 30" }
    ],
    gramSpecs: {
        "22": { min: 0.200, max: 0.310, piecesPerCarton: 162, piecesBreakdown: "27 strings * 6 pcs" },
        "45": { min: 0.210, max: 0.310, piecesPerCarton: 84, piecesBreakdown: "14 strings * 6 pcs" },
        "85": { min: 0.240, max: 0.300, piecesPerCarton: 52, piecesBreakdown: "8 strings * 6 pcs + 4 pcs" },
        "125": { min: 0.200, max: 0.270, piecesPerCarton: 31, piecesBreakdown: "7 strings * 4 pcs + 3 pcs" },
        "850": { min: 0.200, max: 0.270, piecesPerCarton: 7, piecesBreakdown: "" }
    }
};

window.appConfig = window.appConfig || { ...window.DEFAULT_CONFIG };
window.configUnsubscribe = window.configUnsubscribe || null;

// ===== FUNCTIONS =====

function getConfig() {
    return { ...window.appConfig };
}

async function loadConfig() {
    const db = window.db;
    if (!db) {
        console.warn('Firebase not initialized, using default config');
        return { ...window.DEFAULT_CONFIG };
    }
    try {
        const doc = await db.collection('config').doc('settings').get();
        if (doc.exists) {
            const data = doc.data();
            window.appConfig = { ...window.DEFAULT_CONFIG, ...data };
            console.log('✅ Config loaded from Firestore');
        } else {
            await db.collection('config').doc('settings').set({
                ...window.DEFAULT_CONFIG,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            window.appConfig = { ...window.DEFAULT_CONFIG };
        }
        return { ...window.appConfig };
    } catch (error) {
        console.error('Error loading config:', error);
        return { ...window.DEFAULT_CONFIG };
    }
}

async function updateConfig(newConfig) {
    const db = window.db;
    if (!db) return false;
    try {
        await db.collection('config').doc('settings').update({
            ...newConfig,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        window.appConfig = { ...window.appConfig, ...newConfig };
        return true;
    } catch (error) {
        console.error('Error updating config:', error);
        return false;
    }
}

function subscribeToConfig(callback) {
    const db = window.db;
    if (!db) { callback({ ...window.DEFAULT_CONFIG }); return () => {}; }
    if (window.configUnsubscribe) window.configUnsubscribe();
    window.configUnsubscribe = db.collection('config').doc('settings').onSnapshot((doc) => {
        if (doc.exists) {
            window.appConfig = { ...window.DEFAULT_CONFIG, ...doc.data() };
            callback({ ...window.appConfig });
        } else {
            callback({ ...window.DEFAULT_CONFIG });
        }
    }, (error) => { console.error('Error subscribing to config:', error); callback({ ...window.appConfig }); });
    return window.configUnsubscribe;
}

function getMachines() {
    const config = getConfig();
    return config.machines || [];
}

function getMatchingMachines(density, mode) {
    const config = getConfig();
    const machines = config.machines || [];
    const minDensity = mode === 'bot' ? config.botMinDensity : config.level9MinDensity;
    const maxDensity = mode === 'bot' ? config.botMaxDensity : config.level9MaxDensity;
    return machines.filter(m => {
        const spec = config.gramSpecs?.[String(m.gram)];
        const machineMin = spec ? spec.min : m.min;
        const machineMax = spec ? spec.max : m.max;
        return density >= machineMin && density <= machineMax && density >= minDensity && density <= maxDensity;
    });
}

function getMachineById(id) {
    const machines = getMachines();
    const machine = machines.find(m => m.id === id);
    if (!machine) return null;
    const config = getConfig();
    const spec = config.gramSpecs?.[String(machine.gram)];
    return { ...machine, min: spec ? spec.min : machine.min, max: spec ? spec.max : machine.max, piecesPerCarton: spec ? spec.piecesPerCarton : null };
}

function getMachinesByLines() {
    const config = getConfig();
    const lines = {};
    config.productionLines.forEach(line => { lines[line.id] = config.machines.filter(m => m.line === line.id); });
    return lines;
}

function getGramSpec(gram) {
    const config = getConfig();
    return config.gramSpecs?.[String(gram)] || null;
}

function getCurrentShift() {
    const config = getConfig();
    const hour = new Date().getHours();
    return (hour >= config.dayShiftStart && hour < config.nightShiftStart) ? 'DAY' : 'NIGHT';
}

// ===== QC TEST FUNCTIONS =====

window.isOnline = window.isOnline || navigator.onLine;
window.onlineStatusListeners = window.onlineStatusListeners || [];

function saveToLocalQueue(testData) {
    try {
        const queue = getLocalQueue();
        queue.push({ ...testData, queuedAt: new Date().toISOString() });
        localStorage.setItem(window.OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        return true;
    } catch (e) { return false; }
}

function getLocalQueue() {
    try { const data = localStorage.getItem(window.OFFLINE_QUEUE_KEY); return data ? JSON.parse(data) : []; } catch (e) { return []; }
}

function clearLocalQueue() {
    localStorage.removeItem(window.OFFLINE_QUEUE_KEY);
}

async function syncLocalQueue() {
    const queue = getLocalQueue();
    if (queue.length === 0) return;
    const db = window.db;
    for (const testData of queue) {
        try { await db.collection('qc_tests').add({ ...testData, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); } catch (e) { console.error('Sync error:', e); }
    }
    clearLocalQueue();
}

window.addEventListener('online', () => { window.isOnline = true; notifyOnlineStatusListeners(true); syncLocalQueue(); });
window.addEventListener('offline', () => { window.isOnline = false; notifyOnlineStatusListeners(false); });

function isNetworkOnline() { return window.isOnline; }
function onOnlineStatusChange(callback) { window.onlineStatusListeners.push(callback); callback(window.isOnline); }
function notifyOnlineStatusListeners(status) { window.onlineStatusListeners.forEach(cb => cb(status)); }

async function saveQCTest(testData) {
    const db = window.db;
    if (!db) return 'error';
    if (!window.isOnline) { return saveToLocalQueue(testData) ? 'offline-queued' : 'error'; }
    try {
        const docRef = await db.collection('qc_tests').add({ ...testData, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        return docRef.id;
    } catch (error) { return saveToLocalQueue(testData) ? 'offline-queued' : 'error'; }
}

async function getTestsByMode(mode) {
    const db = window.db;
    if (!db) return [];
    try {
        const snapshot = await db.collection('qc_tests').where('mode', '==', mode).orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) { return []; }
}

async function getTestsToday(mode) {
    const db = window.db;
    if (!db) return [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    try {
        const snapshot = await db.collection('qc_tests').where('mode', '==', mode).where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(today)).where('createdAt', '<', firebase.firestore.Timestamp.fromDate(tomorrow)).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) { return []; }
}

async function getTestById(testId) {
    const db = window.db;
    if (!db) return null;
    try {
        const doc = await db.collection('qc_tests').doc(testId).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (error) { return null; }
}

async function deleteTest(testId) {
    const db = window.db;
    if (!db) return false;
    try { await db.collection('qc_tests').doc(testId).delete(); return true; } catch (error) { return false; }
}

async function getTestsByApprovalDoc(approvalDocId) {
    const db = window.db;
    if (!db) return [];
    try {
        const snapshot = await db.collection('qc_tests').where('approvalDocId', '==', approvalDocId).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) { return []; }
}

function subscribeToTestsByApprovalDoc(approvalDocId, callback) {
    const db = window.db;
    if (!approvalDocId) { callback([]); return () => {}; }
    return db.collection('qc_tests').where('approvalDocId', '==', approvalDocId).onSnapshot((snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => { callback([]); });
}

async function getLatestTest(mode) {
    const db = window.db;
    if (!db) return null;
    try {
        const snapshot = await db.collection('qc_tests').where('mode', '==', mode).get();
        if (snapshot.empty) return null;
        let latest = null, latestDate = null;
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.createdAt) {
                const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                if (!latestDate || date > latestDate) { latestDate = date; latest = { id: doc.id, ...data }; }
            }
        });
        return latest;
    } catch (error) { return null; }
}

function subscribeToLatestTest(mode, callback) {
    const db = window.db;
    return db.collection('qc_tests').where('mode', '==', mode).orderBy('createdAt', 'desc').limit(1).onSnapshot((snapshot) => {
        callback(snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
    }, (error) => { callback(null); });
}

async function getTestsTodayCount(mode) {
    const db = window.db;
    if (!db) return 0;
    try {
        const snapshot = await db.collection('qc_tests').where('mode', '==', mode).get();
        return snapshot.size;
    } catch (error) { return 0; }
}

function subscribeToTestsTodayCount(mode, callback) {
    const db = window.db;
    return db.collection('qc_tests').where('mode', '==', mode).onSnapshot((snapshot) => { callback(snapshot.size); }, (error) => { callback(0); });
}

function subscribeToShiftApproval(approvalId, callback) {
    const db = window.db;
    return db.collection('shift_approvals').doc(approvalId).onSnapshot((doc) => { callback(doc.exists ? { id: doc.id, ...doc.data() } : null); }, (error) => { callback(null); });
}

async function getCurrentShiftApproval(mode) {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const shift = (now.getHours() >= 7 && now.getHours() < 19) ? 'DAY' : 'NIGHT';
    return getOrCreateShiftApproval(mode, shift, date);
}

async function getOrCreateShiftApproval(mode, shift, date) {
    const db = window.db;
    const docId = `${mode}_${shift}_${date}`;
    try {
        const doc = await db.collection('shift_approvals').doc(docId).get();
        if (doc.exists) return { id: doc.id, ...doc.data() };
        const newDoc = { mode, shift, date, status: 'pending', createdAt: new Date(), approvedBy: [], approvals: {} };
        await db.collection('shift_approvals').doc(docId).set(newDoc);
        return { id: docId, ...newDoc };
    } catch (error) { return null; }
}

async function updateShiftApproval(approvalId, updates) {
    const db = window.db;
    if (!db) return false;
    try { await db.collection('shift_approvals').doc(approvalId).update({ ...updates, updatedAt: new Date() }); return true; } catch (error) { return false; }
}

async function addApprover(approvalId, approverName, approverRole) {
    const db = window.db;
    if (!db) {
        console.error('Firestore not initialized');
        return false;
    }
    try {
        console.log('Adding approver:', { approvalId, approverName, approverRole });
        const doc = await db.collection('shift_approvals').doc(approvalId).get();
        if (!doc.exists) {
            console.error('Approval document not found:', approvalId);
            return false;
        }
        const data = doc.data();
        const approvedBy = data.approvedBy || [];
        const approvals = data.approvals || {};
        if (!approvedBy.includes(approverName)) approvedBy.push(approverName);
        approvals[approverName] = { role: approverRole, timestamp: new Date() };
        const requiredApprovers = getRequiredApprovers(data.mode);
        const allApproved = requiredApprovers.every(a => approvedBy.includes(a));
        const result = await updateShiftApproval(approvalId, { approvedBy, approvals, status: allApproved ? 'completed' : 'pending' });
        console.log('Approver added successfully:', result);
        return result;
    } catch (error) {
        console.error('Error adding approver:', error);
        return false;
    }
}

function getRequiredApprovers(mode) {
    return mode === 'level9' ? ['Buggy Supervisor', 'PLC Operator', 'Production Manager', 'QC Manager'] : ['PLC Operator', 'Production Manager', 'QC Manager'];
}

function getQCStaffInfo() {
    return { name: localStorage.getItem('qcName') || '', team: localStorage.getItem('qcTeam') || '', shift: getCurrentShift() };
}

// ===== AUTO-SAVE =====
window.AUTO_SAVE_CONFIG = window.AUTO_SAVE_CONFIG || { enableAutoSave: true, delaySeconds: 5 };
window.autoSaveTimer = window.autoSaveTimer || null;

function startAutoSave(callback, delaySeconds) {
    delaySeconds = delaySeconds || window.AUTO_SAVE_CONFIG.delaySeconds;
    if (!window.AUTO_SAVE_CONFIG.enableAutoSave) return;
    if (window.autoSaveTimer) clearTimeout(window.autoSaveTimer);
    window.autoSaveTimer = setTimeout(callback, delaySeconds * 1000);
}

function cancelAutoSave() {
    if (window.autoSaveTimer) { clearTimeout(window.autoSaveTimer); window.autoSaveTimer = null; }
}

function showAutoSaveProgress(elementId, delaySeconds) {
    delaySeconds = delaySeconds || window.AUTO_SAVE_CONFIG.delaySeconds;
    const element = document.getElementById(elementId);
    if (!element) return;
    let remaining = delaySeconds;
    element.innerHTML = `Auto-saving in ${remaining}s...`;
    element.style.color = '#FFA500';
    const interval = setInterval(() => {
        remaining--;
        if (remaining > 0) element.innerHTML = `Auto-saving in ${remaining}s...`;
        else { clearInterval(interval); element.innerHTML = 'Saving...'; }
    }, 1000);
}

function showSavedFeedback(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.innerHTML = '✓ Saved';
    element.style.color = '#00E676';
    setTimeout(() => { element.innerHTML = ''; }, 3000);
}

function showOfflineFeedback(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.innerHTML = '📴 Offline - Will sync when online';
    element.style.color = '#FF5722';
}

// ===== AUTH FUNCTIONS =====
async function isAuthEnabled() {
    const db = window.db;
    if (!db) return false;
    try {
        const doc = await db.collection('config').doc('auth_settings').get();
        if (doc.exists) return doc.data().authEnabled === true;
    } catch (e) { 
        // If we can't read (permissions error when auth enabled but user not logged in),
        // assume auth IS enabled (fail-safe approach for security)
        console.log('Cannot read auth settings, assuming enabled'); 
    }
    return true;  // Default to enabled - fail-safe for security
}

async function requireAuth() {
    const authEnabled = await isAuthEnabled();
    if (!authEnabled) {
        localStorage.setItem('userRole', 'admin');
        localStorage.setItem('userEmail', 'development@local');
        return true;
    }
    return new Promise((resolve) => {
        firebase.auth().onAuthStateChanged((user) => {
            if (!user) { window.location.href = 'login.html'; resolve(false); }
            else { localStorage.setItem('userEmail', user.email); localStorage.setItem('userUid', user.uid); resolve(true); }
        });
    });
}