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

// Enable offline persistence
if (db) {
    db.enableIndexedDBPersistence(db, { synchronizeTabs: true })
        .catch((err) => {
            if (err.code == 'failed-precondition') {
                console.warn('Persistence failed: Multiple tabs open');
            } else if (err.code == 'unimplemented') {
                console.warn('Persistence not available in this browser');
            }
        });
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
    
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();
    
    const docRef = await db.collection('qc_tests').add({
        ...testData,
        createdAt: timestamp,
        syncStatus: 'synced'
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
        ? ['plcOperator', 'productionManager', 'qcManager']
        : ['buggySupervisor', 'plcOperator', 'productionManager', 'qcManager'];
    
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

/**
 * Get recent QC tests for a mode
 * @param {string} mode - 'level9' or 'bot'
 * @param {number} limit - Number of records to fetch
 * @returns {Promise<Array>} - Array of QC test documents
 */
async function getRecentTests(mode, limit = 10) {
    const querySnapshot = await db.collection('qc_tests')
        .where('mode', '==', mode)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
    
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get the latest QC test for a mode (efficient single query)
 * @param {string} mode - 'level9' or 'bot'
 * @returns {Promise<Object|null>} - Latest test document or null
 */
async function getLatestTest(mode) {
    const querySnapshot = await db.collection('qc_tests')
        .where('mode', '==', mode)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
    
    if (querySnapshot.empty) return null;
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
}

/**
 * Get real-time listener for latest test
 * @param {string} mode - 'level9' or 'bot'
 * @param {Function} callback - Callback function receiving test data
 * @returns {Function} - Unsubscribe function
 */
function subscribeToLatestTest(mode, callback) {
    return db.collection('qc_tests')
        .where('mode', '==', mode)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .onSnapshot((snapshot) => {
            if (!snapshot.empty) {
                const test = snapshot.docs[0].data();
                callback({ id: snapshot.docs[0].id, ...test });
            } else {
                callback(null);
            }
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
    // Debug: just count all tests for this mode first
    console.log('getTestsTodayCount called for mode:', mode);
    
    // Get all tests for this mode - no date filter
    const querySnapshot = await db.collection('qc_tests')
        .where('mode', '==', mode)
        .get();
    
    console.log('Total tests for mode', mode, ':', querySnapshot.size);
    return querySnapshot.size;
}

/**
 * Subscribe to tests today count
 * @param {string} mode - 'level9' or 'bot'
 * @param {Function} callback - Callback function receiving count
 * @returns {Function} - Unsubscribe function
 */
function subscribeToTestsTodayCount(mode, callback) {
    console.log('subscribeToTestsTodayCount called for mode:', mode);
    
    // Simple approach: get all and count - no date filter
    return db.collection('qc_tests')
        .where('mode', '==', mode)
        .onSnapshot((snapshot) => {
            console.log('Subscription got snapshot, size:', snapshot.size);
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
