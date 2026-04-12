# Machine Layout Flexible System - Implementation Plan

## Problem Statement

The current machine layout implementation in the application is **rigid and inflexible**. The machine grid on:
- `index.html` (Level 9 mode)
- `level9-exec.html`

...uses hardcoded `columnOrder` arrays that don't dynamically adapt when machines are added, removed, or modified in `admin.html`.

### Goal
Make the machine layout on display pages **automatically reflect** whatever is configured in the admin page, while preserving the current visual arrangement that matches reality.

---

## Current Implementation Analysis

### Current Data Structure (firebase-storage.js)

```javascript
productionLines: [
    { id: "1A", name: "Line 1A", order: 1 },
    { id: "1B", name: "Line 1B", order: 2 },
    { id: "2A", name: "Line 2A", order: 3 },
    { id: "2B", name: "Line 2B", order: 4 },
    { id: "3A", name: "Line 3A", order: 5 },
    { id: "3B", name: "Line 3B", order: 6 }
]

machines: [
    { id: 1, gram: 125, min: 0.200, max: 0.270, line: "1A", name: "Machine 1" },
    // ... 30 machines total
]
```

### NEW: Machine Display Number System

To allow flexible renumbering without breaking historical data:

```javascript
machines: [
    { id: 1, displayNumber: 1, gram: 125, min: 0.200, max: 0.270, line: "1A", name: "Machine 1" },
    { id: 31, displayNumber: 6, gram: 85, min: 0.240, max: 0.300, line: "1A", name: "Machine 31" },
    // ... all machines
]
```

**Key concepts:**
- `id` - Internal unique identifier (never changes once assigned). Used in database references (tests, approvals).
- `displayNumber` - Human-readable number shown in the UI. Can be changed anytime for renumbering.
- `name` - Optional friendly name for the machine

### Current Hardcoded Column Order (index.html & level9-exec.html)

```javascript
const columnOrder = [26, 21, 16, 11, 6, 1, 27, 22, 17, 12, 7, 2, 28, 23, 18, 13, 8, 3, 29, 24, 19, 14, 9, 4, 30, 25, 20, 15, 10, 5];
```

This creates a visual layout where:
- Lines run **right to left**: 1A → 1B → 2A → 2B → 3A → 3B
- Within each line, machines are ordered **top to bottom** (lowest ID at top)
- Total: 6 columns, 5 rows = 30 machines

### Real-World Arrangement (per user)

```
Lines arranged RIGHT TO LEFT: 1A | 1B | 2A | 2B | 3A | 3B

Within each line, machines numbered TOP TO BOTTOM:
- Line 1A: M1 (top), M2, M3... (bottom)
- Line 1B: M6 (top), M7, M8... (bottom)
- etc.
```

---

## Key Requirements

1. **Dynamic Rendering**: Pages must automatically display whatever machines exist in the database
2. **Preserve Arrangement**: The current right-to-left line order and top-to-bottom machine order must be maintained
3. **Admin-Controlled**: All configuration happens in admin.html
4. **No Breaking Changes**: Existing correct layout must not be disrupted
5. **Renumberable**: Machines can be renumbered without orphaning historical data
6. **Removable**: Machines can be removed and layout adapts automatically

---

## Proposed Solutions Explored

### Option A: Add displayOrder Field

**Approach**: Add a `displayOrder` field to each machine that controls its position within its line.

**Data Model**:
```javascript
{ id: 1, gram: 125, min: 0.200, max: 0.270, line: "1A", name: "Machine 1", displayOrder: 1 }
```

**Pros**:
- Maximum flexibility
- User controls exact order

**Cons**:
- Requires updating all existing machines with displayOrder values
- More complex admin UI

---

### Option B: Auto-Sort by ID (Recommended)

**Approach**: Use machine `id` for ordering within lines. Since IDs are already sequential within lines (1-5 for 1A, 6-10 for 1B, etc.), this naturally produces the correct top-to-bottom order.

**How it works**:
1. Group machines by line
2. Sort each line's machines by ID (ascending)
3. Render in column-major order (one line at a time, top to bottom)

**Pros**:
- No data changes needed
- Simple implementation
- IDs already reflect real-world order

**Cons**:
- Less flexible if user wants custom order

---

### Option C: Display Number System (NEW - Recommended for Renumbering)

**Approach**: Add a `displayNumber` field separate from `id` to allow flexible renumbering.

**Data Model**:
```javascript
{ id: 1, displayNumber: 1, gram: 125, min: 0.200, max: 0.270, line: "1A", name: "Machine 1" }
// When renumbered to be 6th machine in line 1A:
// { id: 1, displayNumber: 6, gram: 125, min: 0.200, max: 0.270, line: "1A", name: "Machine 1" }
```

**How it works**:
1. All machines have a unique internal `id` (never changes, used in database references)
2. All machines have a `displayNumber` (can be changed anytime for renumbering)
3. Display pages show `displayNumber` but internal logic uses `id` for database lookups
4. Sort by `displayNumber` within each line for ordering

**Pros**:
- Maximum flexibility - can renumber anytime without breaking historical data
- Can remove machines without orphaning data
- Clean consecutive numbering possible

**Cons**:
- Requires adding new field to data structure
- Requires updating admin.html to allow editing displayNumber
- Requires updating display pages to show displayNumber instead of id

---

### Option C: Hybrid (Auto-sort with override option)

**Approach**: Default to ID-based ordering, but allow `displayOrder` override when needed.

---

## Recommended Implementation

### Approach: Display Number System with Dynamic Rendering

This approach adds `displayNumber` field to enable:
1. **Flexible renumbering** - Change display numbers anytime without breaking historical data
2. **Machine removal** - Remove machines and layout adapts automatically
3. **Dynamic rendering** - Grid reflects actual database state

**Workflow:**
1. Add `displayNumber` field to each machine
2. Initialize `displayNumber = id` for existing machines (backward compatible)
3. Group machines by line → sort by `displayNumber` → render grid
4. Update admin.html to allow editing `displayNumber`
5. Update display pages to show `displayNumber` in UI

### Implementation Steps

#### Step 0: Data Migration (If Needed)

For existing machines without `displayNumber`, the system will default to using `id` as display number:

```javascript
// In helper functions, handle missing displayNumber:
function getMachineDisplayNumber(machine) {
    return machine.displayNumber !== undefined ? machine.displayNumber : machine.id;
}
```

#### Step 1: Add Helper Functions to firebase-storage.js

Add functions after `getMachinesByLines()`:

```javascript
// Get machines for a specific line, sorted by displayNumber (top to bottom)
function getMachinesByLine(lineId) {
    const config = getConfig();
    return (config.machines || [])
        .filter(m => m.line === lineId)
        .sort((a, b) => {
            const aNum = a.displayNumber !== undefined ? a.displayNumber : a.id;
            const bNum = b.displayNumber !== undefined ? b.displayNumber : b.id;
            return aNum - bNum;
        });
}

// Get all machine IDs in display order:
// - Lines ordered by productionLine.order (1A, 1B, 2A, 2B, 3A, 3B = right to left)
// - Within each line, machines ordered by displayNumber (ascending = top to bottom)
function getMachinesInDisplayOrder() {
    const config = getConfig();
    const lines = [...(config.productionLines || [])].sort((a, b) => a.order - b.order);
    
    const result = [];
    lines.forEach(line => {
        const lineMachines = getMachinesByLine(line.id);
        lineMachines.forEach(m => result.push({
            id: m.id,
            displayNumber: m.displayNumber !== undefined ? m.displayNumber : m.id
        }));
    });
    
    return result;
}
```

#### Step 2: Update index.html

**Location**: Around line 1859 (where `columnOrder` is defined)

**Change**:
```javascript
// OLD (hardcoded):
const columnOrder = [26, 21, 16, 11, 6, 1, 27, 22, 17, 12, 7, 2, 28, 23, 18, 13, 8, 3, 29, 24, 19, 14, 9, 4, 30, 25, 20, 15, 10, 5];

// NEW (dynamic):
// Get display order from config (returns array of {id, displayNumber} objects)
const displayOrder = getMachinesInDisplayOrder();

// Render machines using displayNumber for display, id for internal logic
displayOrder.forEach(machine => {
    const id = machine.id;
    const displayNum = machine.displayNumber;
    const machine = getMachineById(id);
    if (!machine) return;
    
    // Show displayNumber in button, but use id for data attributes
    html += `<button class="${btnClass}" data-id="${id}">M${displayNum}</button>`;
});
```

With dynamic:
```javascript
const columnOrder = getMachinesInDisplayOrder();
```

Also ensure `getMachines()` is called to load config before rendering.

#### Step 3: Update level9-exec.html

**Location**: Around line 1133 (where `columnOrder` is defined)

**Same changes as index.html**:
```javascript
// Replace hardcoded columnOrder with dynamic function
const displayOrder = getMachinesInDisplayOrder();
grid.innerHTML = displayOrder.map(m => {
    const machine = getMachineById(m.id);
    return machine ? `<button class="machine-btn" id="machine-${machine.id}" data-display="${m.displayNumber}">M${m.displayNumber}</button>` : '';
}).join('');
```

Also update CSS similarly.

#### Step 4: Update admin.html - Add displayNumber Field

Add displayNumber input to machine form (add/edit modal):

```html
<!-- In machine modal -->
<div class="form-group">
    <label>Display Number (shown in UI)</label>
    <input type="number" id="machineDisplayNumber" required>
</div>
```

Add to save function:

```javascript
async function saveMachine(e) {
    e.preventDefault();
    
    const id = parseInt(document.getElementById('machineIdInput').value);
    const displayNumber = parseInt(document.getElementById('machineDisplayNumber').value);
    const name = document.getElementById('machineName').value;
    const line = document.getElementById('machineLine').value;
    const gram = parseInt(document.getElementById('machineGram').value);
    const min = parseFloat(document.getElementById('machineMin').value);
    const max = parseFloat(document.getElementById('machineMax').value);

    const machineData = { 
        id, 
        displayNumber,  // NEW FIELD
        name, 
        line, 
        gram, 
        min, 
        max 
    };
    
    // ... rest of save logic
}
```

Also show displayNumber in machine table listing.

#### Step 5: Test with New Machines

When user adds new machines (e.g., 4 new on Line 1A, 4 new on Line 3B):
- They get assigned IDs (31, 32, 33, 34, 35, 36, 37, 38)
- They automatically appear at the bottom of their respective lines
- Grid dynamically expands to accommodate

---

## Handling Edge Cases

### 1. Empty Lines
If a line has no machines, skip that line in display.

### 2. Non-Sequential IDs / displayNumbers
If machine displayNumbers aren't sequential within a line, sort by displayNumber anyway - the visual order will match displayNumber order.

### 3. Different Number of Machines per Line
The grid naturally accommodates - each line fills left-to-right, top-to-bottom.

### 4. Maximum Grid Columns
Add configuration for max columns (default 6). If more machines exist, create additional rows.

### 5. Machine Removal
When a machine is deleted in admin.html:
- It no longer appears in getMachinesInDisplayOrder()
- Grid automatically shrinks/updates
- No orphaned data (historical tests still reference machine by id, not displayNumber)

### 6. Duplicate displayNumbers
Allow duplicate displayNumbers within a line? **Recommendation**: NO - add validation to prevent duplicates within the same line.

---

## Files to Modify

| File | Changes |
|------|---------|
| `firebase-storage.js` | Add `getMachinesByLine()`, `getMachinesInDisplayOrder()` (use displayNumber for sorting) |
| `index.html` | Replace hardcoded columnOrder with dynamic function call, show displayNumber in UI |
| `level9-exec.html` | Same as index.html |
| `admin.html` | Add displayNumber field to machine form and table, add validation for duplicates |

---

## Questions & Decisions Pending

1. **Do we need manual displayOrder?** - ~~Current plan uses auto-sort by ID. Is this sufficient, or do we need manual override capability?~~ **DECISION: No manual displayOrder needed. Auto-sort by ID is sufficient.**

2. ~~How to handle the 4 new machines on Line 1A and 3B?~~ - **User will add machine details themselves in admin.html**

3. ~~Should we add validation~~ to prevent duplicate machine IDs when adding new machines? - **Add validation in admin.html save function**

4. ~~Mobile responsiveness~~ - Should we add a setting to control columns on mobile vs desktop? - **Use existing machineGridColumns setting**

---

## Implementation Steps - DETAILED

### Step 1: Add Helper Functions to firebase-storage.js

Add two new functions after `getMachinesByLines()`:

```javascript
// Get machines for a specific line, sorted by ID (ascending - top to bottom in real-world)
function getMachinesByLine(lineId) {
    const config = getConfig();
    return (config.machines || [])
        .filter(m => m.line === lineId)
        .sort((a, b) => a.id - b.id);
}

// Get all machine IDs in display order:
// - Lines ordered by productionLine.order (1A, 1B, 2A, 2B, 3A, 3B = right to left)
// - Within each line, machines ordered by ID (ascending = top to bottom)
function getMachinesInDisplayOrder() {
    const config = getConfig();
    const lines = [...(config.productionLines || [])].sort((a, b) => a.order - b.order);
    
    const result = [];
    lines.forEach(line => {
        const lineMachines = getMachinesByLine(line.id);
        lineMachines.forEach(m => result.push(m.id));
    });
    
    return result;
}
```

### Step 2: Update CSS for Flexibility (index.html, level9-exec.html)

**Current issue**: Grid has `max-width: 600px` and `grid-template-columns: repeat(6, 1fr)` - hardcoded for exactly 30 machines (5 rows × 6 columns).

**Solution**: Make grid responsive - allow it to grow based on number of machines.

```css
/* OLD */
.machine-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 12px;
    margin-top: 20px;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
}

/* NEW */
.machine-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr); /* Keep 6 columns as default */
    gap: 12px;
    margin-top: 20px;
    max-width: 800px; /* Increased to accommodate more machines */
    margin-left: auto;
    margin-right: auto;
}

/* Add auto-wrap for many machines */
@media (min-width: 1200px) {
    .machine-grid {
        grid-template-columns: repeat(8, 1fr); /* More columns on wide screens */
    }
}
```

### Step 3: Update index.html

**Location**: Around line 1859 (where `columnOrder` is defined)

**Change**:
```javascript
// OLD (hardcoded):
const columnOrder = [26, 21, 16, 11, 6, 1, 27, 22, 17, 12, 7, 2, 28, 23, 18, 13, 8, 3, 29, 24, 19, 14, 9, 4, 30, 25, 20, 15, 10, 5];

// NEW (dynamic):
// Get display order from config (lines right-to-left, machines top-to-bottom within line)
const columnOrder = getMachinesInDisplayOrder();

// Also update the rendering to handle machines that might not exist:
columnOrder.forEach(id => {
    const machine = getMachineById(id);
    if (!machine) return; // Skip if machine doesn't exist
    
    // ... rest of rendering code
});
```

**Important**: Must ensure config is loaded. The page already calls `loadConfig()` at startup, so this should work. But for safety, we can add:
```javascript
// Ensure we have config loaded before getting display order
const config = getConfig();
if (!config.machines || config.machines.length === 0) {
    // Fallback to default order if no config
    const columnOrder = [26, 21, 16, 11, 6, 1, ...];
} else {
    const columnOrder = getMachinesInDisplayOrder();
}
```

### Step 4: Update level9-exec.html

**Location**: Around line 1133 (where `columnOrder` is defined)

**Same changes as index.html**:
```javascript
// Replace hardcoded columnOrder with dynamic function
const machines = getMachines();
grid.innerHTML = getMachinesInDisplayOrder().map(id => {
    const m = machines.find(m => m.id === id);
    return m ? `<button class="machine-btn" id="machine-${m.id}">M${m.id}</button>` : '';
}).join('');
```

Also update CSS similarly.

### Step 5: Ensure Real-Time Updates

The pages already subscribe to config changes via `subscribeToConfig()`. When machines are updated in admin.html:

1. Config is saved to Firestore
2. `subscribeToConfig` callback fires on all open pages
3. But current code only updates density settings, not machine grid

**Need to update** the subscribe callback to also re-render machine grid:

```javascript
subscribeToConfig((config) => {
    // Update density settings
    CONFIG.DENSITY_TOO_LOW = config.level9MinDensity;
    // ... other settings
    
    // RE-RENDER machine grid if function exists
    if (typeof renderMachineGrid === 'function') {
        renderMachineGrid();
    }
    if (typeof renderResults === 'function') {
        // Re-render results to show updated machines
        renderResults();
    }
});
```

---

## CSS Flexibility Considerations

### Current Fixed Layout (Problem)
- 6 columns fixed
- max-width: 600px
- Assumes exactly 30 machines in 5 rows

### Proposed Flexible Layout (Solution)
- 6 columns default
- max-width: 800px (accommodate more machines)
- Auto-expand vertically as machines increase
- Responsive breakpoints for more columns on wider screens

### Grid Behavior After Changes

| Scenario | Grid Behavior |
|----------|---------------|
| 30 machines (current) | 5 rows × 6 cols, 600px width |
| 38 machines (after adding 8) | 7 rows × 6 cols, 700px width |
| Many machines (>48) | 8 cols on wide screens |

---

## Admin.html Considerations

### Duplicate ID Validation
Add validation in `saveMachine()` to prevent duplicate IDs:

```javascript
async function saveMachine(e) {
    e.preventDefault();
    
    const id = parseInt(document.getElementById('machineIdInput').value);
    const existingMachine = machines.find(m => m.id === id && m.id !== parseInt(document.getElementById('machineId').value));
    
    if (existingMachine) {
        showToast('Error: Machine ID ' + id + ' already exists!', true);
        return;
    }
    // ... rest of save logic
}
```

### Auto-Suggest Next Available ID
When adding new machine, auto-suggest next available ID:

```javascript
function openAddMachineModal() {
    // Find max ID and suggest next
    const maxId = Math.max(...machines.map(m => m.id), 0);
    document.getElementById('machineIdInput').value = maxId + 1;
    // ... rest of modal setup
}
```

---

## How It Will Work After Implementation

### Adding a Machine
1. **User adds new machine in admin.html**:
   - Assigns unique internal `id` (e.g., 31, 32...)
   - Sets `displayNumber` (e.g., 6 for 6th machine in line)
   - Selects line (e.g., "1A")
   - Saves to Firestore

2. **Display pages**:
   - Call `getMachinesInDisplayOrder()`
   - New machine appears in its line at its displayNumber position
   - Grid expands if needed

### Removing a Machine
1. **User deletes machine in admin.html**:
   - Machine is removed from machines array in Firestore
   
2. **Display pages**:
   - Machine no longer appears in grid
   - Grid shrinks automatically
   - **Historical test data is preserved** - tests still reference machine by internal `id`, not displayNumber

### Renumbering Machines
1. **User edits displayNumber in admin.html**:
   - Changes displayNumber from 31 to 6 (for example)
   
2. **Display pages**:
   - Machine now shows new displayNumber in UI
   - Internal `id` unchanged - all historical data intact

---

## Testing Plan

After implementation, you can test by:
1. Opening admin.html and adding a test machine (e.g., ID 99, Line 1A)
2. Opening index.html in another tab
3. Refreshing index.html → new machine should appear at bottom of Line 1A
4. With real-time update: change in admin.html reflects immediately in index.html without refresh

---

## Notes

- User confirmed: Lines arranged right-to-left (1A→1B→2A→2B→3A→3B)
- User confirmed: Machines numbered top-to-bottom within each line
- User confirmed: Current visual arrangement matches reality - goal is to make it dynamic
- User wants to test by adding 4 new machines to Line 1A and Line 3B