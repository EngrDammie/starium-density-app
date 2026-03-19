// ===== REPORT BUILDER FUNCTIONS =====

/**
 * Get list of all collections in Firestore
 */
async function getCollections() {
    if (!db) return [];
    try {
        // Firestore doesn't have a direct API to list collections
        // Return known collections for this app
        return ['qc_tests', 'shift_approvals', 'config'];
    } catch (error) {
        console.error('Error getting collections:', error);
        return [];
    }
}

/**
 * Get all documents in a collection
 */
async function getAllDocuments(collection) {
    if (!db) return [];
    try {
        const snapshot = await db.collection(collection).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting documents:', error);
        return [];
    }
}

/**
 * Query a collection with filters
 */
async function queryCollection(collection, filters = [], sort = null, limit = 100) {
    if (!db) return [];
    
    try {
        let query = db.collection(collection);
        
        // Apply filters
        filters.forEach(filter => {
            if (filter.field && filter.operator && filter.value !== '') {
                let value = filter.value;
                
                // Convert numeric values
                if (!isNaN(parseFloat(value)) && filter.operator !== 'array-contains') {
                    value = parseFloat(value);
                }
                
                // Handle operators
                switch (filter.operator) {
                    case '==':
                        query = query.where(filter.field, '==', value);
                        break;
                    case '!=':
                        query = query.where(filter.field, '!=', value);
                        break;
                    case '>':
                        query = query.where(filter.field, '>', value);
                        break;
                    case '>=':
                        query = query.where(filter.field, '>=', value);
                        break;
                    case '<':
                        query = query.where(filter.field, '<', value);
                        break;
                    case '<=':
                        query = query.where(filter.field, '<=', value);
                        break;
                    case 'array-contains':
                        query = query.where(filter.field, 'array-contains', value);
                        break;
                }
            }
        });
        
        // Apply sort
        if (sort && sort.field) {
            query = query.orderBy(sort.field, sort.direction || 'asc');
        }
        
        // Apply limit
        query = query.limit(limit);
        
        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error querying collection:', error);
        return [];
    }
}

/**
 * Perform join between collections
 * @param {Array} primaryData - Main collection data
 * @param {Array} joins - Join configurations
 * @returns {Array} - Merged data
 */
async function performJoins(primaryData, joins) {
    if (!joins || joins.length === 0) return primaryData;
    
    let result = [...primaryData];
    
    for (const join of joins) {
        if (!join.targetCollection || !join.sourceField || !join.targetDocField) continue;
        
        // Get all docs from target collection
        const targetDocs = await getAllDocuments(join.targetCollection);
        
        // Create lookup map
        const targetMap = {};
        targetDocs.forEach(doc => {
            targetMap[doc.id] = doc;
        });
        
        // Merge data
        result = result.map(item => {
            const targetDocId = item[join.sourceField];
            if (targetDocId && targetMap[targetDocId]) {
                return {
                    ...item,
                    [join.alias || join.targetCollection]: targetMap[targetDocId]
                };
            }
            return item;
        });
    }
    
    return result;
}

/**
 * Save report configuration to Firestore
 */
async function saveReportConfig(config) {
    if (!db) return false;
    
    try {
        const docRef = await db.collection('report_configs').add({
            ...config,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error saving report config:', error);
        return null;
    }
}

/**
 * Load all saved report configurations
 */
async function loadReportConfigs() {
    if (!db) return [];
    
    try {
        const snapshot = await db.collection('report_configs')
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error loading report configs:', error);
        return [];
    }
}

/**
 * Delete a saved report configuration
 */
async function deleteReportConfig(reportId) {
    if (!db) return false;
    
    try {
        await db.collection('report_configs').doc(reportId).delete();
        return true;
    } catch (error) {
        console.error('Error deleting report config:', error);
        return false;
    }
}

/**
 * Export data to CSV
 */
function exportToCSV(data, filename = 'report.csv') {
    if (!data || data.length === 0) return;
    
    // Get all unique keys from all objects
    const allKeys = new Set();
    data.forEach(item => {
        Object.keys(item).forEach(key => {
            // Skip nested objects - flatten them
            if (typeof item[key] !== 'object') {
                allKeys.add(key);
            } else if (item[key] && typeof item[key] === 'object') {
                // Flatten nested objects with prefix
                Object.keys(item[key]).forEach(nestedKey => {
                    allKeys.add(`${key}.${nestedKey}`);
                });
            }
        });
    });
    
    const headers = Array.from(allKeys);
    
    // Build CSV rows
    const rows = data.map(item => {
        return headers.map(header => {
            let value;
            
            if (header.includes('.')) {
                // Handle nested properties
                const [parent, child] = header.split('.');
                value = item[parent]?.[child] ?? '';
            } else {
                value = item[header] ?? '';
            }
            
            // Handle timestamps
            if (value && value.toDate) {
                value = value.toDate().toISOString();
            }
            
            // Escape quotes and wrap in quotes if contains comma
            value = String(value);
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                value = '"' + value.replace(/"/g, '""') + '"';
            }
            
            return value;
        });
    });
    
    // Combine headers and rows
    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    // Download file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

/**
 * Export data to JSON
 */
function exportToJSON(data, filename = 'report.json') {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

/**
 * Get field names from a collection (sample documents)
 */
async function getCollectionFields(collection) {
    const docs = await getAllDocuments(collection);
    if (docs.length === 0) return [];
    
    const fields = new Set();
    docs.forEach(doc => {
        Object.keys(doc).forEach(key => {
            if (typeof doc[key] !== 'object') {
                fields.add(key);
            }
        });
    });
    
    return Array.from(fields).sort();
}

// Built-in report templates
const REPORT_TEMPLATES = [
    {
        id: 'template-tests-with-approvals',
        name: 'Tests with Approvals',
        description: 'Join qc_tests with shift_approvals to see test data with approval status',
        collections: ['qc_tests'],
        joins: [
            {
                sourceField: 'approvalDocId',
                targetCollection: 'shift_approvals',
                targetDocField: 'id',
                alias: 'approval'
            }
        ],
        filters: [
            { field: 'mode', operator: '==', value: 'level9' }
        ],
        sort: { field: 'createdAt', direction: 'desc' },
        limit: 100
    },
    {
        id: 'template-all-level9',
        name: 'All Level 9 Tests',
        description: 'All Level 9 density tests',
        collections: ['qc_tests'],
        filters: [
            { field: 'mode', operator: '==', value: 'level9' }
        ],
        sort: { field: 'createdAt', direction: 'desc' },
        limit: 100
    },
    {
        id: 'template-all-bot',
        name: 'All BOT Tests',
        description: 'All BOT density tests',
        collections: ['qc_tests'],
        filters: [
            { field: 'mode', operator: '==', value: 'bot' }
        ],
        sort: { field: 'createdAt', direction: 'desc' },
        limit: 100
    },
    {
        id: 'template-today-tests',
        name: "Today's Tests",
        description: 'All tests from today',
        collections: ['qc_tests'],
        filters: [],
        sort: { field: 'createdAt', direction: 'desc' },
        limit: 100
    }
];
