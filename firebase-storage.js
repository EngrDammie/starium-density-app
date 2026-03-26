// ===== FIREBASE CONFIGURATION =====

const firebaseConfig = {
    apiKey: "AIzaSyBO3Yrns0NibOzcM5EVUdQ62Std95ltZBk",
    authDomain: "starium-rafa-app.firebaseapp.com",
    projectId: "starium-rafa-app",
    storageBucket: "starium-rafa-app.firebasestorage.app",
    messagingSenderId: "743583982928",
    appId: "1:743583982928:web:e331aaa0b9e741a1537855"
};

// Initialize Firebase (only if not already initialized)
let app, db;
try {
    if (!firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
    } else {
        app = firebase.app();
    }
    db = firebase.firestore();
} catch (e) {
    console.error('Firebase initialization error:', e);
}

// NOTE: Firebase IndexedDB persistence not working in v9.22.0 compat
// Using localStorage-based offline queue instead
/*
if (db) {
    db.enableIndexedDBPersistence({ synchronizeTabs: true })
        .then(() => {
            console.log('✅ IndexedDB persistence enabled - app works offline');
        })
        .catch((err) => {
            if (err.code == 'failed-precondition') {
                console.warn('⚠️ Persistence failed: Multiple tabs open');
            } else if (err.code == 'unimplemented') {
                console.warn('⚠️ Persistence not available in this browser');
            } else {
                console.warn('⚠️ Persistence error:', err.message);
            }
        });
    
    // Configure cache settings for better offline experience
    db.settings({
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
    });
}
*/

// ===== LOCALSTORAGE OFFLINE QUEUE =====
const OFFLINE_QUEUE_KEY = 'starium_offline_queue';

/**
 * Save data to localStorage queue (for offline use)
 */
function saveToLocalQueue(testData) {
    try {
        const queue = getLocalQueue();
        queue.push({
            ...testData,
            queuedAt: new Date().toISOString()
        });
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        console.log('📱 Saved to local queue (offline)', queue.length, 'items');
        return true;
    } catch (e) {
        console.error('Failed to save to local queue:', e);
        return false;
    }
}

/**
 * Get pending items from localStorage queue
 */
function getLocalQueue() {
    try {
        const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

/**
 * Clear localStorage queue
 */
function clearLocalQueue() {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    console.log('🗑️ Cleared local queue');
}

/**
 * Sync local queue to Firestore
 */
async function syncLocalQueue() {
    const queue = getLocalQueue();
    if (queue.length === 0) return;
    
    console.log('🔄 Syncing', queue.length, 'items from local queue...');
    
    for (const testData of queue) {
        try {
            await db.collection('qc_tests').add({
                ...testData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                syncedFromOffline: true
            });
        } catch (e) {
            console.error('Failed to sync item:', e);
        }
    }
    
    clearLocalQueue();
    console.log('✅ Local queue synced to Firestore');
}

// Listen for network restoration to sync
window.addEventListener('online', () => {
    console.log('📶 Network restored - syncing offline queue...');
    syncLocalQueue();
});

// Track online/offline status
let isOnline = navigator.onLine;
let onlineStatusListeners = [];

// Listen for network status changes
window.addEventListener('online', () => {
    isOnline = true;
    console.log('📶 Network restored - syncing data...');
    notifyOnlineStatusListeners(true);
});

window.addEventListener('offline', () => {
    isOnline = false;
    console.log('📴 Network lost - working offline');
    notifyOnlineStatusListeners(false);
});

/**
 * Get current online status
 * @returns {boolean} - True if online
 */
function isNetworkOnline() {
    return isOnline;
}

/**
 * Add callback for online/offline status changes
 * @param {Function} callback - Called with true when online, false when offline
 */
function onOnlineStatusChange(callback) {
    onlineStatusListeners.push(callback);
    // Immediately call with current status
    callback(isOnline);
}

function notifyOnlineStatusListeners(status) {
    onlineStatusListeners.forEach(cb => cb(status));
}

// ===== APP CONFIG =====
const DEFAULT_CONFIG = {
    // Density Settings
    level9MinDensity: 0.200,
    level9MaxDensity: 0.310,
    botMinDensity: 0.200,
    botMaxDensity: 0.240,
    level9Divisor: 1580,
    botDivisor: 1680,
    
    // Shift Settings
    dayShiftStart: 7,
    nightShiftStart: 19,
    
    // UI Settings
    showSettingsBtnIndex: true,
    showSettingsBtnLevel9Exec: true,
    showSettingsBtnBotExec: true,
    
    // Grid Configuration
    machineGridColumns: 6,
    
    // Production Lines
    productionLines: [
        { id: "1A", name: "Line 1A", order: 1 },
        { id: "1B", name: "Line 1B", order: 2 },
        { id: "2A", name: "Line 2A", order: 3 },
        { id: "2B", name: "Line 2B", order: 4 },
        { id: "3A", name: "Line 3A", order: 5 },
        { id: "3B", name: "Line 3B", order: 6 }
    ],
    
    // Machine Configurations
    machines: [
        // Line 1A
        { id: 1, gram: 125, min: 0.200, max: 0.270, line: "1A", name: "Machine 1" },
        { id: 2, gram: 85, min: 0.240, max: 0.300, line: "1A", name: "Machine 2" },
        { id: 3, gram: 85, min: 0.240, max: 0.300, line: "1A", name: "Machine 3" },
        { id: 4, gram: 85, min: 0.240, max: 0.300, line: "1A", name: "Machine 4" },
        { id: 5, gram: 85, min: 0.240, max: 0.300, line: "1A", name: "Machine 5" },
        
        // Line 1B
        { id: 6, gram: 125, min: 0.200, max: 0.270, line: "1B", name: "Machine 6" },
        { id: 7, gram: 85, min: 0.240, max: 0.300, line: "1B", name: "Machine 7" },
        { id: 8, gram: 850, min: 0.200, max: 0.270, line: "1B", name: "Machine 8" },
        { id: 9, gram: 85, min: 0.240, max: 0.300, line: "1B", name: "Machine 9" },
        { id: 10, gram: 22, min: 0.200, max: 0.310, line: "1B", name: "Machine 10" },
        
        // Line 2A
        { id: 11, gram: 85, min: 0.240, max: 0.300, line: "2A", name: "Machine 11" },
        { id: 12, gram: 85, min: 0.240, max: 0.300, line: "2A", name: "Machine 12" },
        { id: 13, gram: 85, min: 0.240, max: 0.300, line: "2A", name: "Machine 13" },
        { id: 14, gram: 85, min: 0.240, max: 0.300, line: "2A", name: "Machine 14" },
        { id: 15, gram: 85, min: 0.240, max: 0.300, line: "2A", name: "Machine 15" },
        
        // Line 2B
        { id: 16, gram: 850, min: 0.200, max: 0.270, line: "2B", name: "Machine 16" },
        { id: 17, gram: 85, min: 0.240, max: 0.300, line: "2B", name: "Machine 17" },
        { id: 18, gram: 85, min: 0.240, max: 0.300, line: "2B", name: "Machine 18" },
        { id: 19, gram: 85, min: 0.240, max: 0.300, line: "2B", name: "Machine 19" },
        { id: 20, gram: 85, min: 0.240, max: 0.300, line: "2B", name: "Machine 20" },
        
        // Line 3A
        { id: 21, gram: 850, min: 0.200, max: 0.270, line: "3A", name: "Machine 21" },
        { id: 22, gram: 45, min: 0.210, max: 0.310, line: "3A", name: "Machine 22" },
        { id: 23, gram: 45, min: 0.210, max: 0.310, line: "3A", name: "Machine 23" },
        { id: 24, gram: 45, min: 0.210, max: 0.310, line: "3A", name: "Machine 24" },
        { id: 25, gram: 45, min: 0.210, max: 0.310, line: "3A", name: "Machine 25" },
        
        // Line 3B
        { id: 26, gram: 850, min: 0.200, max: 0.270, line: "3B", name: "Machine 26" },
        { id: 27, gram: 45, min: 0.210, max: 0.310, line: "3B", name: "Machine 27" },
        { id: 28, gram: 45, min: 0.210, max: 0.310, line: "3B", name: "Machine 28" },
        { id: 29, gram: 45, min: 0.210, max: 0.310, line: "3B", name: "Machine 29" },
        { id: 30, gram: 45, min: 0.210, max: 0.310, line: "3B", name: "Machine 30" }
    ],
    
    // Gram Specifications
    gramSpecs: {
        "22": { min: 0.200, max: 0.310, piecesPerCarton: 162, piecesBreakdown: "27 strings * 6 pcs" },
        "45": { min: 0.210, max: 0.310, piecesPerCarton: 84, piecesBreakdown: "14 strings * 6 pcs" },
        "85": { min: 0.240, max: 0.300, piecesPerCarton: 52, piecesBreakdown: "8 strings * 6 pcs + 4 pcs" },
        "125": { min: 0.200, max: 0.270, piecesPerCarton: 31, piecesBreakdown: "7 strings * 4 pcs + 3 pcs" },
        "850": { min: 0.200, max: 0.270, piecesPerCarton: 7, piecesBreakdown: "" }
    }
};

// Cached config - used immediately, then updated from Firestore
let appConfig = { ...DEFAULT_CONFIG };
let configUnsubscribe = null;

/**
 * Get current app config (synchronous - returns cached value)
 * @returns {Object} - Current config
 */
function getConfig() {
    return { ...appConfig };
}

/**
 * Load config from Firestore
 * @returns {Promise<Object>} - Config from Firestore or defaults
 */
async function loadConfig() {
    if (!db) {
        console.warn('Firebase not initialized, using default config');
        return { ...DEFAULT_CONFIG };
    }
    
    try {
        const doc = await db.collection('config').doc('settings').get();
        
        if (doc.exists) {
            const data = doc.data();
            appConfig = { ...DEFAULT_CONFIG, ...data };
            
            // Check if there are new fields in DEFAULT_CONFIG that don't exist in Firestore
            const newFields = {};
            let hasNewFields = false;
            for (const key in DEFAULT_CONFIG) {
                if (!(key in data)) {
                    newFields[key] = DEFAULT_CONFIG[key];
                    hasNewFields = true;
                }
            }
            
            // If there are new fields, update Firestore with them
            if (hasNewFields) {
                await db.collection('config').doc('settings').update({
                    ...newFields,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('✅ Config updated with new fields:', newFields);
                // Reload appConfig with new fields
                appConfig = { ...DEFAULT_CONFIG, ...data };
            }
            
            console.log('✅ Config loaded from Firestore:', appConfig);
        } else {
            // Create default config document
            await db.collection('config').doc('settings').set({
                ...DEFAULT_CONFIG,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            appConfig = { ...DEFAULT_CONFIG };
            console.log('✅ Default config created in Firestore');
        }
        
        return { ...appConfig };
    } catch (error) {
        console.error('Error loading config:', error);
        return { ...DEFAULT_CONFIG };
    }
}

/**
 * Update config in Firestore
 * @param {Object} newConfig - New config values to merge
 * @returns {Promise<boolean>} - Success status
 */
async function updateConfig(newConfig) {
    if (!db) {
        console.error('Firebase not initialized');
        return false;
    }
    
    try {
        await db.collection('config').doc('settings').update({
            ...newConfig,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update cached config
        appConfig = { ...appConfig, ...newConfig };
        console.log('✅ Config updated:', appConfig);
        return true;
    } catch (error) {
        console.error('Error updating config:', error);
        return false;
    }
}

/**
 * Subscribe to config changes (real-time)
 * @param {Function} callback - Called with config object when it changes
 * @returns {Function} - Unsubscribe function
 */
function subscribeToConfig(callback) {
    if (!db) {
        callback({ ...DEFAULT_CONFIG });
        return () => {};
    }
    
    // Unsubscribe from previous listener if exists
    if (configUnsubscribe) {
        configUnsubscribe();
    }
    
    configUnsubscribe = db.collection('config').doc('settings')
        .onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                appConfig = { ...DEFAULT_CONFIG, ...data };
                callback({ ...appConfig });
            } else {
                callback({ ...DEFAULT_CONFIG });
            }
        }, (error) => {
            console.error('Error subscribing to config:', error);
            callback({ ...appConfig });
        });
    
    return configUnsubscribe;
}

// ===== MACHINE CONFIG HELPER FUNCTIONS =====

/**
 * Get all machines from config
 * @returns {Array} - Array of machine objects
 */
function getMachines() {
    const config = getConfig();
    return config.machines || [];
}

/**
 * Get machines that match a given density
 * @param {number} density - The density value to match
 * @param {string} mode - 'level9' or 'bot'
 * @returns {Array} - Array of matching machines with min/max from gramSpecs
 */
function getMatchingMachines(density, mode = 'level9') {
    const config = getConfig();
    const machines = config.machines || [];
    
    const minDensity = mode === 'bot' ? config.botMinDensity : config.level9MinDensity;
    const maxDensity = mode === 'bot' ? config.botMaxDensity : config.level9MaxDensity;
    
    return machines.filter(m => {
        // Get min/max from gramSpecs
        const spec = config.gramSpecs?.[String(m.gram)];
        const machineMin = spec ? spec.min : m.min;
        const machineMax = spec ? spec.max : m.max;
        
        return density >= machineMin && 
               density <= machineMax &&
               density >= minDensity &&
               density <= maxDensity;
    });
}

/**
 * Get a single machine by ID
 * @param {number} id - Machine ID
 * @returns {Object|null} - Machine object with min/max from gramSpecs
 */
function getMachineById(id) {
    const machines = getMachines();
    const machine = machines.find(m => m.id === id) || null;
    
    if (!machine) return null;
    
    // Get min/max from gramSpecs (always use current values)
    const spec = getGramSpec(machine.gram);
    const min = spec ? spec.min : machine.min;
    const max = spec ? spec.max : machine.max;
    
    return { ...machine, min, max };
}

/**
 * Get gram specification for a gram value
 * @param {number|string} gram - Gram setting
 * @returns {Object|null} - Gram spec or null
 */
function getGramSpec(gram) {
    const config = getConfig();
    return config.gramSpecs?.[String(gram)] || null;
}

/**
 * Get all machines for a specific production line
 * @param {string} line - Line identifier (e.g., "1A", "1B")
 * @returns {Array} - Array of machines in that line
 */
function getMachinesByLine(line) {
    const machines = getMachines();
    return machines.filter(m => m.line === line);
}

/**
 * Get all unique production lines (auto-discovered from machines)
 * @returns {Array} - Sorted array of line identifiers
 */
function getLines() {
    const machines = getMachines();
    const lines = [...new Set(machines.map(m => m.line))];
    return lines.sort();
}

/**
 * Get machines grouped by line
 * @returns {Object} - { "1A": [machines], "1B": [machines], ... }
 */
function getMachinesByLines() {
    const machines = getMachines();
    const lines = getLines();
    const grouped = {};
    lines.forEach(line => {
        grouped[line] = machines.filter(m => m.line === line);
    });
    return grouped;
}

/**
 * Get grid column count
 * @returns {number} - Number of columns for machine grid
 */
function getMachineGridColumns() {
    return getConfig().machineGridColumns || 6;
}

/**
 * Get production lines in order
 * @returns {Array} - Sorted production lines
 */
function getProductionLines() {
    const config = getConfig();
    if (config.productionLines) {
        return [...config.productionLines].sort((a, b) => a.order - b.order);
    }
    // Fallback to auto-discovered
    return getLines().map((id, index) => ({ id, name: `Line ${id}`, order: index + 1 }));
}

/**
 * Update machines configuration (admin function)
 * @param {Array} newMachines - New machines array
 * @returns {Promise<boolean>} - Success status
 */
async function updateMachines(newMachines) {
    return updateConfig({ machines: newMachines });
}

/**
 * Update gram specifications (admin function)
 * @param {Object} newGramSpecs - New gram specs object
 * @returns {Promise<boolean>} - Success status
 */
async function updateGramSpecs(newGramSpecs) {
    return updateConfig({ gramSpecs: newGramSpecs });
}

/**
 * Update grid columns (admin function)
 * @param {number} columns - Number of columns
 * @returns {Promise<boolean>} - Success status
 */
async function updateMachineGridColumns(columns) {
    return updateConfig({ machineGridColumns: columns });
}

// ===== AUTO-SAVE CONFIGURATION =====
const AUTO_SAVE_CONFIG = {
    delaySeconds: 10, // Configurable delay before auto-save
    enableAutoSave: true
};

// ===== DATA MODEL =====

/**
 * Save QC Test to Firestore
 * @param {Object} testData - The QC test data
 * @returns {Promise<string>} - The document ID
 */
async function saveQCTest(testData) {
    if (!db) {
        throw new Error('Firebase not initialized');
    }
    
    // Check if online - if not, save to localStorage queue
    if (!navigator.onLine) {
        console.log('📴 Offline - saving to local queue');
        const success = saveToLocalQueue(testData);
        if (success) {
            return 'offline-queued';
        }
        throw new Error('Failed to save offline');
    }
    
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();
    
    // Ensure approvalDocId is always stored (fallback to null if not provided)
    const approvalDocId = testData.approvalDocId || null;
    
    const docRef = await db.collection('qc_tests').add({
        ...testData,
        approvalDocId: approvalDocId,
        createdAt: timestamp
    });
    
    return docRef.id;
}

/**
 * Get or create shift approval record
 * @param {string} mode - 'level9' or 'bot'
 * @param {string} shift - 'DAY' or 'NIGHT'
 * @param {string} date - YYYY-MM-DD format
 * @returns {Promise<Object>} - The shift approval document
 */
async function getOrCreateShiftApproval(mode, shift, date) {
    const querySnapshot = await db.collection('shift_approvals')
        .where('mode', '==', mode)
        .where('shift', '==', shift)
        .where('date', '==', date)
        .limit(1)
        .get();
    
    if (!querySnapshot.empty) {
        return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
    }
    
    // Create new shift approval
    const docRef = await db.collection('shift_approvals').add({
        mode,
        shift,
        date,
        buggySupervisor: null,
        plcOperator: null,
        productionManager: null,
        qcManager: null,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    return { id: docRef.id, mode, shift, date, status: 'pending' };
}

/**
 * Get shift approval by document ID
 * @param {string} approvalDocId - The shift approval document ID
 * @returns {Promise<Object|null>} - The shift approval document or null
 */
async function getShiftApprovalById(approvalDocId) {
    if (!approvalDocId) return null;
    
    const doc = await db.collection('shift_approvals').doc(approvalDocId).get();
    if (!doc.exists) return null;
    
    return { id: doc.id, ...doc.data() };
}

/**
 * Update approver for a shift
 * @param {string} approvalId - The shift approval document ID
 * @param {string} approverType - 'buggySupervisor' | 'plcOperator' | 'productionManager' | 'qcManager'
 * @param {string} approverName - Name of the approver
 */
async function updateApprover(approvalId, approverType, approverName) {
    await db.collection('shift_approvals').doc(approvalId).update({
        [approverType]: {
            name: approverName,
            approvedAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Check if all required approvers have approved and update status
    await checkAndUpdateApprovalStatus(approvalId);
}

/**
 * Check if all required approvers have approved and update status to completed
 * @param {string} approvalId - The shift approval document ID
 */
async function checkAndUpdateApprovalStatus(approvalId) {
    const doc = await db.collection('shift_approvals').doc(approvalId).get();
    if (!doc.exists) return;
    
    const data = doc.data();
    
    // Define required approvers based on mode
    const requiredApprovers = data.mode === 'bot' 
        ? ['plcOperator', 'productionManager', 'qcManager', 'qcSupervisor']
        : ['buggySupervisor', 'plcOperator', 'productionManager', 'qcManager', 'qcSupervisor'];
    
    // Check if all required approvers have approved
    const allApproved = requiredApprovers.every(approver => {
        return data[approver] && data[approver].name && data[approver].name.trim() !== '';
    });
    
    if (allApproved) {
        await db.collection('shift_approvals').doc(approvalId).update({
            status: 'completed',
            completedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}

async function getRecentTests(mode, limit = 10) {
    try {
        const querySnapshot = await db.collection('qc_tests')
            .where('mode', '==', mode)
            .limit(limit)
            .get();
        
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('getRecentTests error:', error);
        return [];
    }
}

/**
 * Get tests by approval document ID (direct link)
 * @param {string} approvalDocId - The shift approval document ID
 * @param {number} limit - Maximum number of tests to return
 * @returns {Promise<Array>} - Array of test documents
 */
async function getTestsByApprovalDoc(approvalDocId, limit = 50) {
    if (!approvalDocId) return [];
    
    console.log('getTestsByApprovalDoc - querying for approvalDocId:', approvalDocId);
    
    try {
        const querySnapshot = await db.collection('qc_tests')
            .where('approvalDocId', '==', approvalDocId)
            .limit(limit)
            .get();
        
        const tests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('getTestsByApprovalDoc - found tests:', tests.length, tests);
        return tests;
    } catch (error) {
        console.error('getTestsByApprovalDoc error:', error);
        return [];
    }
}

/**
 * Subscribe to tests by approval document ID (real-time)
 * @param {string} approvalDocId - The shift approval document ID
 * @param {Function} callback - Callback function receiving array of tests
 * @returns {Function} - Unsubscribe function
 */
function subscribeToTestsByApprovalDoc(approvalDocId, callback) {
    if (!approvalDocId) {
        callback([]);
        return () => {};
    }
    
    return db.collection('qc_tests')
        .where('approvalDocId', '==', approvalDocId)
        .onSnapshot((snapshot) => {
            const tests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(tests);
        }, (error) => {
            console.error('Error subscribing to tests by approvalDoc:', error);
            callback([]);
        });
}

/**
 * Get the latest QC test for a mode (efficient single query)
 * @param {string} mode - 'level9' or 'bot'
 * @returns {Promise<Object|null>} - Latest test document or null
 */
async function getLatestTest(mode) {
    const querySnapshot = await db.collection('qc_tests')
        .where('mode', '==', mode)
        .get();
    
    if (querySnapshot.empty) return null;
    
    // Find the most recent
    let latestDoc = null;
    let latestDate = null;
    
    querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.createdAt) {
            const docDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            if (!latestDate || docDate > latestDate) {
                latestDate = docDate;
                latestDoc = { id: doc.id, ...data };
            }
        }
    });
    
    return latestDoc;
}

/**
 * Get real-time listener for latest test
 * @param {string} mode - 'level9' or 'bot'
 * @param {Function} callback - Callback function receiving test data
 * @returns {Function} - Unsubscribe function
 */
function subscribeToLatestTest(mode, callback) {
    // Get most recent test by sorting by createdAt descending
    return db.collection('qc_tests')
        .where('mode', '==', mode)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .onSnapshot((snapshot) => {
            console.log('subscribeToLatestTest: received', snapshot.size, 'tests');
            
            if (snapshot.empty) {
                callback(null);
                return;
            }
            
            // Get the most recent document (first after sorting by createdAt desc)
            const firstDoc = snapshot.docs[0];
            const data = { id: firstDoc.id, ...firstDoc.data() };
            console.log('subscribeToLatestTest: most recent doc data:', data);
            callback(data);
        }, (error) => {
            console.error('Error subscribing to latest test:', error);
            callback(null);
        });
}

/**
 * Get count of tests for today
 * @param {string} mode - 'level9' or 'bot'
 * @returns {Promise<number>} - Count of tests today
 */
async function getTestsTodayCount(mode) {
    // Get all tests for this mode - no date filter
    const querySnapshot = await db.collection('qc_tests')
        .where('mode', '==', mode)
        .get();
    
    return querySnapshot.size;
}

/**
 * Subscribe to tests today count
 * @param {string} mode - 'level9' or 'bot'
 * @param {Function} callback - Callback function receiving count
 * @returns {Function} - Unsubscribe function
 */
function subscribeToTestsTodayCount(mode, callback) {
    // Simple approach: get all and count - no date filter
    return db.collection('qc_tests')
        .where('mode', '==', mode)
        .onSnapshot((snapshot) => {
            callback(snapshot.size);
        }, (error) => {
            console.error('Error subscribing to tests count:', error);
            callback(0);
        });
}

/**
 * Subscribe to shift approval changes (real-time)
 * @param {string} approvalId - The shift approval document ID
 * @param {Function} callback - Callback function receiving approval data
 * @returns {Function} - Unsubscribe function
 */
function subscribeToShiftApproval(approvalId, callback) {
    return db.collection('shift_approvals').doc(approvalId)
        .onSnapshot((doc) => {
            if (doc.exists) {
                callback({ id: doc.id, ...doc.data() });
            } else {
                callback(null);
            }
        }, (error) => {
            console.error('Error subscribing to shift approval:', error);
            callback(null);
        });
}

/**
 * Get shift approval for current shift
 * @param {string} mode - 'level9' or 'bot'
 * @returns {Promise<Object>} - Current shift approval
 */
async function getCurrentShiftApproval(mode) {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const hour = now.getHours();
    const shift = (hour >= 7 && hour < 19) ? 'DAY' : 'NIGHT';
    
    return getOrCreateShiftApproval(mode, shift, date);
}

/**
 * Get QC staff info from localStorage
 */
function getQCStaffInfo() {
    return {
        name: localStorage.getItem('qcName') || '',
        team: localStorage.getItem('qcTeam') || '',
        shift: (() => {
            const hour = new Date().getHours();
            return (hour >= 7 && hour < 19) ? 'DAY' : 'NIGHT';
        })()
    };
}

// ===== AUTO-SAVE FUNCTIONALITY =====

let autoSaveTimer = null;

function startAutoSave(callback, delaySeconds = AUTO_SAVE_CONFIG.delaySeconds) {
    if (!AUTO_SAVE_CONFIG.enableAutoSave) return;
    
    // Clear any existing timer
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
    }
    
    // Start new timer
    autoSaveTimer = setTimeout(() => {
        callback();
    }, delaySeconds * 1000);
}

function cancelAutoSave() {
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
    }
}

// ===== UI FEEDBACK FUNCTIONS =====

function showAutoSaveProgress(elementId, delaySeconds = AUTO_SAVE_CONFIG.delaySeconds) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    let remaining = delaySeconds;
    element.innerHTML = `Auto-saving in ${remaining}s...`;
    element.style.color = '#FFA500';
    
    const interval = setInterval(() => {
        remaining--;
        if (remaining > 0) {
            element.innerHTML = `Auto-saving in ${remaining}s...`;
        } else {
            clearInterval(interval);
            element.innerHTML = 'Saving...';
        }
    }, 1000);
}

function showSavedFeedback(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.innerHTML = '✓ Saved';
    element.style.color = '#00E676';
    
    setTimeout(() => {
        element.innerHTML = '';
    }, 3000);
}

function showOfflineFeedback(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.innerHTML = '📴 Offline - Will sync when online';
    element.style.color = '#FF5722';
}

// ===== AUTH TOGGLE FUNCTIONS =====

/**
 * Check if authentication is enabled in config
 * @returns {Promise<boolean>} - True if auth is enabled
 */
async function isAuthEnabled() {
    if (!db) return false;
    
    try {
        // Try to read auth_settings - if it fails due to permissions, 
        // assume auth is disabled to avoid redirect loop
        const doc = await db.collection('config').doc('auth_settings').get();
        if (doc.exists) {
            return doc.data().authEnabled === true;
        }
    } catch (e) {
        // If we can't read (permissions error when auth enabled but user not logged in),
        // assume auth is DISABLED to allow the page to load
        console.log('Cannot read auth settings, assuming auth disabled');
    }
    return false; // Default: auth disabled
}

/**
 * Require authentication - redirect to login if auth enabled and user not logged in
 * @returns {Promise<boolean>} - True if auth passes (disabled or logged in)
 */
async function requireAuth() {
    const authEnabled = await isAuthEnabled();
    
    if (!authEnabled) {
        // Auth disabled - allow access
        localStorage.setItem('userRole', 'admin'); // Full access for development
        localStorage.setItem('userEmail', 'development@local');
        return true;
    }
    
    // Auth enabled - check if user is logged in
    return new Promise((resolve) => {
        firebase.auth().onAuthStateChanged((user) => {
            if (!user) {
                // Not logged in, redirect to login
                window.location.href = 'login.html';
                resolve(false);
            } else {
                // Logged in - store user info
                localStorage.setItem('userEmail', user.email);
                localStorage.setItem('userUid', user.uid);
                resolve(true);
            }
        });
    });
}
