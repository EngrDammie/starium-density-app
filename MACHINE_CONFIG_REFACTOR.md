# Machine Configuration Refactor Plan

> This document outlines how to move machine data from hardcoded arrays to Firestore config.

---

## Current Problem

Machine data (ID, gram setting, min/max density) is hardcoded in 3 places:
- `index.html` (lines ~993-1022)
- `level9-exec.html` (lines ~946-975)
- `bot-exec.html`

**Pain points:**
- Adding/changing machines = edit 3 files
- Gram setting changes = edit code
- No real-time updates across devices
- Risk of typos/inconsistencies

---

## Solution: Store Machine Config in Firestore

---

### Phase 1: Update firebase-storage.js

**File:** `/root/.openclaw/workspace/starium-density-app/firebase-storage.js`

#### Step 1.1: Extend DEFAULT_CONFIG

Add machine configurations after existing config (around line 163):

```javascript
// ===== APP CONFIG =====
const DEFAULT_CONFIG = {
    // EXISTING (keep these):
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
    
    // NEW: Machine configurations
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
    
    // NEW: Gram setting specifications (density ranges per gram)
    gramSpecs: {
        "22": { min: 0.200, max: 0.310, piecesPerCarton: 162 },
        "45": { min: 0.210, max: 0.310, piecesPerCarton: 84 },
        "85": { min: 0.240, max: 0.300, piecesPerCarton: 52 },
        "125": { min: 0.200, max: 0.270, piecesPerCarton: 31 },
        "850": { min: 0.200, max: 0.270, piecesPerCarton: 7 }
    }
};
```

#### Step 1.2: Add Helper Functions

Add these functions after `subscribeToConfig()` (around line 260):

```javascript
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
 * @returns {Array} - Array of matching machines
 */
function getMatchingMachines(density, mode = 'level9') {
    const config = getConfig();
    const machines = config.machines || [];
    
    const minDensity = mode === 'bot' ? config.botMinDensity : config.level9MinDensity;
    const maxDensity = mode === 'bot' ? config.botMaxDensity : config.level9MaxDensity;
    
    return machines.filter(m => 
        density >= m.min && 
        density <= m.max &&
        density >= minDensity &&
        density <= maxDensity
    );
}

/**
 * Get a single machine by ID
 * @param {number} id - Machine ID
 * @returns {Object|null} - Machine object or null
 */
function getMachineById(id) {
    const machines = getMachines();
    return machines.find(m => m.id === id) || null;
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
 * Get all unique production lines
 * @returns {Array} - Array of line identifiers
 */
function getLines() {
    const machines = getMachines();
    const lines = [...new Set(machines.map(m => m.line))];
    return lines.sort();
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
```

---

### Phase 2: Update index.html

**File:** `/root/.openclaw/workspace/starium-density-app/index.html`

#### Step 2.1: Remove Hardcoded machineData

Find and remove (around line 993):
```javascript
// DELETE THIS:
const machineData = [
    { id: 1, gram: 125, min: 0.200, max: 0.270 },
    // ... all 30 machines
];
```

#### Step 2.2: Replace with Dynamic Loading

Add after the Firebase initialization section:
```javascript
// Add near the top where other variables are defined
let machineData = [];

// In the init function or after config loads:
async function loadMachineData() {
    await loadConfig(); // Ensure config is loaded
    machineData = getMachines();
    console.log('Machines loaded:', machineData.length);
}
```

#### Step 2.3: Update renderMachineGrid()

Find `renderMachineGrid()` function and update:
```javascript
// OLD:
const machineData = [... hardcoded array ...];

// NEW:
const machines = machineData.length > 0 ? machineData : getMachines();
```

#### Step 2.4: Update getMatchingMachines() Call

Find where density matching happens:
```javascript
// OLD:
const matchingMachines = machineData.filter(m => density >= m.min && density <= m.max);

// NEW:
const matchingMachines = getMatchingMachines(density, currentMode);
```

---

### Phase 3: Update level9-exec.html

**File:** `/root/.openclaw/workspace/starium-density-app/level9-exec.html`

Same changes as Phase 2:
1. Remove hardcoded `machineData` array (around line 946)
2. Load from config via `getMachines()`
3. Use helper functions for matching

#### Step 3.1: Remove Hardcoded Array

Delete (lines ~946-975):
```javascript
const machineData = [
    { id: 1, gram: 125, min: 0.200, max: 0.270 },
    // ... all 30
];
```

#### Step 3.2: Add Load Function

Add after other variable declarations:
```javascript
let machineData = [];

// In init() or add:
await loadConfig();
machineData = getMachines();
```

#### Step 3.3: Update renderMachineGrid Call

Find where `renderMachineGrid()` is called and ensure machineData is loaded first.

---

### Phase 4: Update bot-exec.html

**File:** `/root/.openclaw/workspace/starium-density-app/bot-exec.html`

Same approach - remove hardcoded array, use `getMachines()`.

---

### Phase 5: Test & Deploy

1. **Local Test:**
   - Open index.html
   - Verify machines load from config
   - Test density matching works

2. **Deploy:**
   ```bash
   git add -A
   git commit -m "Refactor: Load machine config from Firestore"
   git push
   ```

3. **Verify:**
   - Check live site works
   - Machines still display correctly
   - Density matching works

---

### Phase 6: Optional - Add Admin UI

Create a simple admin interface in settings or new page to:
- View all machines
- Add new machine (ID, gram, min, max, line, name)
- Edit existing machine
- Delete machine
- Edit gram specifications

This would allow non-technical staff to update machines without touching code.

---

## Summary of Files to Change

| File | Changes |
|------|---------|
| `firebase-storage.js` | Add machines + gramSpecs to DEFAULT_CONFIG, add 6 helper functions |
| `index.html` | Remove hardcoded machineData, load from config |
| `level9-exec.html` | Remove hardcoded machineData, load from config |
| `bot-exec.html` | Remove hardcoded machineData, load from config |

---

## Benefits

| Benefit | How |
|---------|-----|
| **Single source of truth** | All machines defined once in Firestore |
| **Real-time sync** | Changes propagate to all devices instantly |
| **No code changes** | Add machines via admin UI, not code |
| **Version control** | Config history in Firestore |
| **Offline support** | Already handled by existing Firestore cache |
| **Gram spec reuse** | Define density ranges once, reference by gram |

---

## Enhanced Features for Full Scalability

### 1. Dynamic Grid Columns

To support any number of machines, add configurable grid columns:

**In DEFAULT_CONFIG:**
```javascript
    // NEW: Grid configuration
    machineGridColumns: 6,
```

**Add helper function:**
```javascript
/**
 * Get grid column count
 * @returns {number} - Number of columns for machine grid
 */
function getMachineGridColumns() {
    return getConfig().machineGridColumns || 6;
}
```

**In HTML files, update CSS dynamically:**
```javascript
// Set grid columns from config
function updateGridColumns() {
    const columns = getMachineGridColumns();
    const grid = document.querySelector('.machine-grid');
    if (grid) {
        grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    }
}

// Call after config loads and when config changes
```

---

### 2. Dynamic Production Lines

The current plan assumes 6 fixed lines (1A, 1B, 2A, 2B, 3A, 3B). To make lines fully dynamic:

**Option A: Derive from Machines (Recommended)**
Lines are automatically discovered from the `line` property of each machine:

```javascript
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
 * Get all machines in a specific line
 * @param {string} line - Line identifier
 * @returns {Array} - Machines in that line
 */
function getMachinesByLine(line) {
    const machines = getMachines();
    return machines.filter(m => m.line === line);
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
```

**Option B: Define Lines Explicitly**
If you want to control line order and metadata:

```javascript
    // NEW: Explicit production lines configuration
    productionLines: [
        { id: "1A", name: "Line 1A", order: 1 },
        { id: "1B", name: "Line 1B", order: 2 },
        { id: "2A", name: "Line 2A", order: 3 },
        { id: "2B", name: "Line 2B", order: 4 },
        { id: "3A", name: "Line 3A", order: 5 },
        { id: "3B", name: "Line 3B", order: 6 }
    ],

/**
 * Get production lines in order
 * @returns {Array} - Sorted production lines
 */
function getProductionLines() {
    const config = getConfig();
    return (config.productionLines || getLines()).sort((a, b) => a.order - b.order);
}
```

---

### 3. Dynamic Layout Rendering

Instead of hardcoded column order, render machines grouped by line:

**HTML Structure:**
```html
<div class="machine-grid-container">
    <div class="line-group" data-line="1A">
        <div class="line-header">Line 1A</div>
        <div class="machines-row">
            <!-- Machines for Line 1A -->
        </div>
    </div>
    <div class="line-group" data-line="1B">
        <!-- ... -->
    </div>
</div>
```

**JavaScript:**
```javascript
/**
 * Render machines grouped by production line
 */
function renderMachinesByLine() {
    const machinesByLine = getMachinesByLines();
    const lines = getLines();
    const container = document.getElementById('machineGrid');
    
    let html = '';
    lines.forEach(line => {
        const machines = machinesByLine[line] || [];
        html += `<div class="line-group" data-line="${line}">`;
        html += `<div class="line-header">${line}</div>`;
        html += '<div class="machines-row">';
        machines.forEach(m => {
            html += `<button class="machine-btn" data-id="${m.id}">M${m.id}</button>`;
        });
        html += '</div></div>';
    });
    
    container.innerHTML = html;
}
```

**CSS:**
```css
.line-group {
    margin-bottom: 20px;
    padding: 15px;
    background: var(--bg-dark);
    border-radius: 10px;
}

.line-header {
    color: var(--primary);
    font-size: 1rem;
    margin-bottom: 10px;
    font-weight: bold;
}

.machines-row {
    display: grid;
    grid-template-columns: repeat(var(--machine-grid-columns, 6), 1fr);
    gap: 8px;
}
```

---

### 4. Complete Dynamic Config Structure

Here's the full enhanced config:

```javascript
const DEFAULT_CONFIG = {
    // Density Settings (existing)
    level9MinDensity: 0.200,
    level9MaxDensity: 0.310,
    botMinDensity: 0.200,
    botMaxDensity: 0.240,
    level9Divisor: 1580,
    botDivisor: 1680,
    
    // Shift Settings (existing)
    dayShiftStart: 7,
    nightShiftStart: 19,
    
    // UI Settings (existing)
    showSettingsBtnIndex: true,
    showSettingsBtnLevel9Exec: true,
    showSettingsBtnBotExec: true,
    
    // NEW: Grid Configuration
    machineGridColumns: 6,
    
    // NEW: Production Lines (Optional - auto-discovered if not provided)
    productionLines: [
        { id: "1A", name: "Line 1A", order: 1 },
        { id: "1B", name: "Line 1B", order: 2 },
        { id: "2A", name: "Line 2A", order: 3 },
        { id: "2B", name: "Line 2B", order: 4 },
        { id: "3A", name: "Line 3A", order: 5 },
        { id: "3B", name: "Line 3B", order: 6 }
    ],
    
    // NEW: Machines (ANY NUMBER)
    machines: [
        // Example with current 30 machines - but can add more!
        { id: 1, gram: 125, min: 0.200, max: 0.270, line: "1A", name: "Machine 1" },
        { id: 2, gram: 85, min: 0.240, max: 0.300, line: "1A", name: "Machine 2" },
        // ... any number of machines ...
        { id: 99, gram: 85, min: 0.240, max: 0.300, line: "4A", name: "Machine 99" } // New line 4A!
    ],
    
    // NEW: Gram Specifications
    gramSpecs: {
        "22": { min: 0.200, max: 0.310, piecesPerCarton: 162 },
        "45": { min: 0.210, max: 0.310, piecesPerCarton: 84 },
        "85": { min: 0.240, max: 0.300, piecesPerCarton: 52 },
        "125": { min: 0.200, max: 0.270, piecesPerCarton: 31 },
        "850": { min: 0.200, max: 0.270, piecesPerCarton: 7 }
    }
};
```

---

### 5. What Becomes Fully Dynamic

| Feature | Before | After (Dynamic) |
|---------|--------|-----------------|
| Number of machines | Fixed (30) | Any number |
| Machine properties | Hardcoded | Configurable |
| Production lines | Fixed (6) | Auto-discovered or configured |
| Line order | Hardcoded | Configurable |
| Grid columns | Fixed (6) | Configurable |
| Gram settings | Hardcoded | Configurable |
| Density ranges | Hardcoded | Configurable |

---

### 6. Adding New Machines (Future)

Once implemented, adding a new machine only requires:

```javascript
// In Firestore console or admin UI, add to machines array:
{
    id: 31,
    gram: 125,
    min: 0.200,
    max: 0.270,
    line: "4A",  // New production line!
    name: "Machine 31"
}
```

And if adding a new line:

```javascript
// Add to productionLines:
{ id: "4A", name: "Line 4A", order: 7 }

// Update grid columns if needed:
machineGridColumns: 8
```

All devices update automatically — no code changes needed!

---

## Backup Tags

- `snapshot-2026-03-20-before-machines-refactor` - Backup before refactor

---

*Document updated: 2026-03-20*
*Added: Dynamic grid columns, dynamic production lines, dynamic layout rendering*
