# Laminate/Packaging Film Waste Management System - Implementation Plan

## Objective
Track laminate/packaging film waste per machine, per shift, with reporting by shift/day/week/month to improve production efficiency.

---

## 1. Data Model (Firestore Collections)

### New Collection: `waste_records`
```javascript
{
  id: auto-generated,
  mode: 'level9' | 'bot',
  shift: 'DAY' | 'NIGHT',
  date: string,              // "YYYY-MM-DD" (from getShiftDateInfo())
  lineId: string,            // e.g., "1A", "2B" (from machine.line)
  machineId: number,         // 1-30 (optional: if waste from specific machine)
  gramSetting: number,      // 22, 45, 85, 125, 850 (current gram setting)
  wasteType: string,         // 'laminate' | 'packaging_film' | 'offcut'
  weightKg: number,          // Waste weight in kilograms
  reason: string,           // 'density_high' | 'density_low' | 'print_defect' | 'seal_failure' | 'other'
  batchNumber: string,       // Optional: production batch reference
  qcName: string,           // From localStorage (current user)
  team: string,              // 'A' | 'B' | 'C'
  shiftApprovalId: string,   // Link to shift_approvals doc (reuse pattern)
  notes: string,             // Optional notes
  createdAt: Firestore Timestamp,
  wasOfflineQueued: boolean,
  offlineSyncId: string       // Reuse offline queue pattern
}
```

### New Config in `config/settings` document:
```javascript
wasteTypes: [
  { id: 'laminate', name: 'Laminate Waste', unit: 'kg' },
  { id: 'packaging_film', name: 'Packaging Film', unit: 'kg' },
  { id: 'offcut', name: 'Offcut Waste', unit: 'kg' }
],
wasteReasons: [
  { code: 'density_high', label: 'Density Too High', autoLink: true },
  { code: 'density_low', label: 'Density Too Low', autoLink: true },
  { code: 'print_defect', label: 'Print Defect' },
  { code: 'seal_failure', label: 'Seal Failure' },
  { code: 'other', label: 'Other' }
],
wasteThresholds: {
  warningPerShift: 50,     // Warn at 50kg per shift
  criticalPerShift: 100,    // Critical at 100kg per shift
  warningPerMachine: 10    // Warn at 10kg per machine per shift
}
```

---

## 2. New Pages to Create

### A. `waste-entry.html` - Waste Recording Form
**Purpose:** QC staff record waste when it occurs

**Layout (follow `index.html` pattern):**
- **Header:** "🗑️ Waste Recording" with shift/date display
- **Auth Bar:** Same as other pages (line 945-976 in level9-exec.html)
- **Form Section:**
  - Mode selector (Level 9 / BOT) - filters machines
  - Line selector (dropdown from config.productionLines)
  - Machine selector (filtered by line, shows gram setting)
  - Waste type (Laminate / Packaging Film / Offcut)
  - Weight input (kg) with numeric keypad
  - Reason dropdown (auto-suggest if density is out of range)
  - Link to QC Test (auto-fill from latest test for that machine)
  - Notes textarea
- **Quick Actions:**
  - "📷 Auto-fill from Latest Test" button
  - "⚡ Quick Record" - saves and clears form
- **Today's Waste Summary:**
  - Total waste today (all machines)
  - Waste by line (mini bar chart)
  - Last 5 waste records table*

**Functions to add in `firebase-storage.js`:**
```javascript
async function saveWasteRecord(data) { ... }
async function getWasteByShift(mode, shift, date) { ... }
async function getWasteByDateRange(startDate, endDate) { ... }
async function getWasteByMachine(machineId, date) { ... }
async function getWasteStats(filters) { ... } // total, avg, byline, bymachine
```

---

### B. `waste-exec.html` - Executive Dashboard
**Purpose:** Real-time waste monitoring for managers

**Layout (follow `level9-exec.html` pattern):**
- **Header Stats:**
  - Today's Total Waste (kg)
  - This Shift Waste (kg)
  - Worst Performing Machine (with gram setting)
  - Waste vs. Production Ratio (%)
  
- **Main Display (2-column layout):**
  - **Left:** Laminate Usage vs Waste bar chart (Chart.js horizontal bar)
  - **Right:** Waste by Machine (horizontal bar, color-coded by gram setting)
  
- **Line-wise Breakdown:**
  - 6 production lines as cards
  - Each shows: Total waste, # of incidents, top waste reason
  - Color-coded: Green (< warning), Orange (≥ warning), Red (≥ critical)
  
- **Waste Trend Chart:**
  - Line chart: Last 7 days waste trend
  - Overlay: warning/critical threshold lines
  
- **Recent Waste Records Table:**
  - Columns: Time, Line, Machine (gram), Type, Weight, Reason
  - Status badges: "🔴 Critical" / "🟠 Warning" / "✅ Normal"
  
- **Machine Grid Overlay (new feature):**
  - Modify machine buttons to show waste indicator
  - Small badge: "12kg" if waste recorded for that machine today
  - Click machine → opens waste detail modal*

---

## 3. Reporting Integration (modify `reports.html`)

### New Report Templates:
1. **"Waste Summary Report"**
   - Filters: Date range, Mode, Shift, Line, Waste Type
   - Charts: Waste trend (line), Waste by line (doughnut), Waste by reason (bar)
   - Table: All waste records with QC name, team, notes
   
2. **"Machine Waste Efficiency"**
   - Calculates: (Waste / Estimated Production) × 100
   - Table: Machine ID, Gram Setting, Total Waste, Est. Production, Efficiency %
   - Only shows machines with waste > 0
   
3. **"Shift Waste Comparison"**
   - Compares DAY vs NIGHT shift waste
   - Chart: Side-by-side bar chart*

### Functions to add in `reports.js`:
```javascript
function generateWasteReport(filters) { ... }
function calculateWasteEfficiency(wasteData, machineData) { ... }
function exportWasteToCSV(data) { ... } // Extend existing exportToCSV
```

---

## 4. Integration with Existing Systems*

### A. Link to QC Tests
When a QC test has density **out of range**, auto-suggest waste recording:
```javascript
// In index.html, after saveQCTest():
if (density < minDensity || density > maxDensity) {
    showWasteSuggestion(testData); // "Density out of range - record waste?"
}

function showWasteSuggestion(testData) {
    // Show small popup: "Record laminate waste for Machine X?"
    // Pre-fill: machine, reason (density_high/low), link to test
}
```

### B. Link to Shift Approvals
Add waste summary to shift approval document (modify `shift_approvals` structure):
```javascript
// Add to shift_approvals document:
wasteSummary: {
  totalKg: 0,
  byLine: { "1A": 0, "1B": 0, ... },
  byType: { "laminate": 0, "packaging_film": 0, ... }
}
```

Update when waste record is saved:
```javascript
async function updateWasteSummary(approvalId, wasteRecord) {
    // Increment wasteSummary in shift_approvals
}
```

### C. Machine Management Integration
Add waste tracking settings to `machine-management.html`:
- **New Tab:** "Waste Settings"
  - Enable/disable waste tracking per machine
  - Set expected laminate usage per gram setting (kg per shift)
  - Override waste thresholds per machine*

---

## 5. Offline Support (Reuse Existing Pattern)

Extend the offline queue system in `firebase-storage.js`:
```javascript
// Reuse existing OFFLINE_QUEUE_KEY pattern
function saveWasteToLocalQueue(data) {
    // Add to starium_offline_queue with type: 'waste'
}

async function syncWasteQueue() {
    // Sync queued waste records when online
}
```

---

## 6. Firestore Indexes (update `firestore.indexes.json`)

```json
{
  "indexes": [
    // ... existing indexes ...
    {
      "collectionGroup": "waste_records",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "mode", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "waste_records",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "shiftApprovalId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 7. Navigation & Access Control*

### Add to `index.html`:
- New button in header: "🗑️ Record Waste" → links to `waste-entry.html`

### Add to exec pages (`level9-exec.html`, `bot-exec.html`):
- Mode switch button: "🗑️ Waste Dashboard" → links to `waste-exec.html`

### Access Control (reuse role system):
- **admin:** Full access to waste entry, executive dashboard, reports
- **manager:** Access to executive dashboard + reports (no delete)
- **staff:** Waste entry only (for their shift/team)

---

## 8. Data Visualization Specifications*

### Chart Types (using Chart.js as in reports.html):

| Chart | Type | Purpose |
|-------|------|---------|
| Waste Trend | Line chart | 7-day waste trend with threshold lines |
| Waste by Machine | Horizontal bar | Rank machines by waste (worst first) |
| Waste by Line | Doughnut | Proportion of waste by production line |
| Waste by Reason | Bar chart | Most common waste reasons |
| Efficiency Gauge | Doughnut (modified) | Waste % vs production target |

### Color Coding (reuse existing CSS vars):
- **Normal:** `--success` (#00E676) - below warning threshold
- **Warning:** `--warning` (#FF9800) - above warning, below critical
- **Critical:** `--danger` (#F44336) - above critical threshold*

---

## 9. Implementation Order*

1. **Phase 1 - Data Layer:**
   - Update `firebase-storage.js`: Add waste functions
   - Update `firestore.indexes.json`: Add waste indexes
   - Update config in Firestore: Add wasteTypes, wasteReasons, wasteThresholds*

2. **Phase 2 - Entry Page:**
   - Create `waste-entry.html` with form and quick actions
   - Test offline queue integration*

3. **Phase 3 - Executive Dashboard:**
   - Create `waste-exec.html` with real-time charts
   - Add machine waste indicators to existing machine grids*

4. **Phase 4 - Reporting:**
   - Update `reports.html`: Add waste report templates
   - Update `reports.js`: Add waste export functions*

5. **Phase 5 - Integration:**
   - Link waste recording to QC test out-of-range detection
   - Update shift_approvals with wasteSummary
   - Add waste settings to machine-management.html*

6. **Phase 6 - Polish:**
   - Add navigation links to all pages
   - Test auth toggle with new pages
   - Update README.md with waste management documentation*

---

## 10. Clarifying Questions*

Before implementation begins, please clarify:

1. **Laminate roll weight:** You mentioned "weight of laminate rolls assigned to each machine" - do you want to:
   - (a) Manually enter roll weight per shift?
   - (b) Calculate from production estimates (grams per machine × estimated output)?
   - (c) Just track waste weight and calculate percentage later?

2. **Waste calculation:** Should waste % be:
   - (a) `(Waste kg / Total laminate used kg) × 100`?
   - (b) Estimated from density issues (e.g., rejected powder = laminate waste)?
   - (c) Both - track actual waste + estimate from QC failures?

3. **Reporting frequency:** You want reports by shift/day/week/month - should I also add:
   - (a) Custom date range picker?
   - (b) Comparison between two periods (this week vs last week)?
   - (c) Both?

4. **Machine assignment:** Should waste be:
   - (a) Always tied to a specific machine?
   - (b) Can be "Line X general waste" without specific machine?
   - (c) Both (optional machineId)?

---

# 📱 WHATSAPP-FORMATTED VERSION (EMOJIZED)*

```
🗑️ *LAMINATE WASTE MANAGEMENT SYSTEM*
📋 *Implementation Plan for Feature Owner Review*

━━━━━━━━━━━━━━━━━━

🎯 *OBJECTIVE*
Track laminate/packaging film waste per machine 🏭, per shift 🌙☀️, with reporting by shift/day/week/month 📊 to improve production efficiency 📈.

━━━━━━━━━━━━━━━━━━

📊 *1. DATA MODEL (Firestore)*

🆕 *New Collection: waste_records*
• mode: Level9 or BOT
• shift: DAY or NIGHT
• date: YYYY-MM-DD
• lineId: e.g. "1A", "2B" 
• machineId: 1-30 (optional)
• gramSetting: 22, 45, 85, 125, or 850
• wasteType: 🗑️ laminate | 📦 packaging_film | ✂️ offcut
• weightKg: Waste weight in kg
• reason: 📈 density_high | 📉 density_low | 🖨️ print_defect | 🔒 seal_failure | ❓ other
• qcName, team, notes
• shiftApprovalId: Link to shift doc
• createdAt: Timestamp*

⚙️ *New Config in Settings:*
• wasteTypes: 🗑️ Laminate, 📦 Packaging Film, ✂️ Offcut
• wasteReasons: 📈 Density High, 📉 Density Low, 🖨️ Print Defect, 🔒 Seal Failure
• wasteThresholds: 🟠 Warn 50kg/shift, 🔴 Critical 100kg/shift*

━━━━━━━━━━━━━━━━━━

📄 *2. NEW PAGES TO CREATE*

🗑️ *A. waste-entry.html - Waste Recording*
For QC staff to record waste*

Layout:
• Header: "🗑️ Waste Recording" with shift/date
• Form: Mode, Line, Machine (with gram), Waste Type, Weight (kg), Reason
• Quick Actions: "📷 Auto-fill from Latest Test"
• Today's Summary: Total waste + by line + Last 5 records*

⚡ *Functions in firebase-storage.js:*
• saveWasteRecord()
• getWasteByShift()
• getWasteStats()*

📊 *B. waste-exec.html - Executive Dashboard*
Real-time waste monitoring for managers*

Layout:
• Header Stats: 📊 Today's Total, 🌙 This Shift, 🏭 Worst Machine, 📈 Efficiency %
• Main Charts: 📊 Usage vs Waste (bar), 🏭 Waste by Machine
• Line Cards: 6 lines showing total waste, incidents, top reason
• Trend: 📈 7-day waste trend with threshold lines
• Table: Recent waste records with status badges
• Machine Grid: 🏭 Buttons show waste badge "12kg"*

━━━━━━━━━━━━━━━━━━

📊 *3. REPORTING (update reports.html)*

New Report Templates:
1️⃣ *"Waste Summary Report"*
   📅 Filters: Date, Mode, Shift, Line, Type
   📊 Charts: Trend, by Line, by Reason
   📋 Table: All records with QC name*

2️⃣ *"Machine Waste Efficiency"*
   🧮 Calculates: (Waste / Production) × 100
   📋 Shows: Machine, Gram, Waste, Production, Efficiency %*

3️⃣ *"Shift Waste Comparison"*
   📊 Compares DAY vs NIGHT waste
   📊 Side-by-side bar chart*

━━━━━━━━━━━━━━━━━━

🔗 *4. INTEGRATION WITH EXISTING SYSTEMS*

🔴 *Link to QC Tests:*
When density is OUT OF RANGE → Auto-suggest waste recording
"📈 Density too high - Record laminate waste for Machine X?"*

📋 *Link to Shift Approvals:*
Add wasteSummary to shift_approvals doc:
• totalKg, byLine, byType*

🏭 *Machine Management:*
New Tab: "Waste Settings"
• Enable/disable per machine
• Set expected laminate usage per gram
• Override thresholds per machine*

━━━━━━━━━━━━━━━━━━

📴 *5. OFFLINE SUPPORT*
Reuse existing offline queue pattern:
• saveWasteToLocalQueue()
• syncWasteQueue() when online*

━━━━━━━━━━━━━━━━━━

📈 *6. DATA VISUALIZATION (Chart.js)*

| Chart | Type | Purpose |
|-------|------|---------|
| 📈 Waste Trend | Line | 7-day trend + thresholds |
| 🏭 Waste by Machine | Horizontal Bar | Rank by waste |
| 🔄 Waste by Line | Doughnut | Proportion by line |
| 📊 Waste by Reason | Bar | Top reasons |
| 🎯 Efficiency | Gauge | Waste % vs target |

🟢 Normal: < warning threshold
🟠 Warning: ≥ warning
🔴 Critical: ≥ critical*

━━━━━━━━━━━━━━━━━━

🏗️ *9. IMPLEMENTATION ORDER*

1️⃣ *Phase 1 - Data Layer*
   ✅ Update firebase-storage.js
   ✅ Update firestore.indexes.json
   ✅ Add config to Firestore*

2️⃣ *Phase 2 - Entry Page*
   📄 Create waste-entry.html
   🧪 Test offline support*

3️⃣ *Phase 3 - Dashboard*
   📄 Create waste-exec.html
   🏭 Add waste indicators to machine grids*

4️⃣ *Phase 4 - Reporting*
   📊 Update reports.html
   📋 Update reports.js*

5️⃣ *Phase 5 - Integration*
   🔗 Link to QC tests
   📋 Update shift_approvals
   ⚙️ Add to machine-management.html*

6️⃣ *Phase 6 - Polish*
   🔗 Add navigation links
   🧪 Test auth toggle
   📄 Update README.md*

━━━━━━━━━━━━━━━━━━

❓ *10. CLARIFYING QUESTIONS*

Please answer before implementation:

1️⃣ *Laminate roll weight:*
   (a) Manually enter roll weight per shift? 📝
   (b) Calculate from production estimates? 🧮
   (c) Just track waste weight? ✂️

2️⃣ *Waste % calculation:*
   (a) (Waste kg / Total used kg) × 100? 📊
   (b) Estimate from density issues? 📈
   (c) Both? 🔄

3️⃣ *Reporting options:*
   (a) Custom date range? 📅
   (b) Compare periods? 🔄
   (c) Both? ✅

4️⃣ *Machine assignment:*
   (a) Always specific machine? 🏭
   (b) Line general waste? 🔄
   (c) Both (optional)? ✅*

━━━━━━━━━━━━━━━━━━

✅ *Ready to implement once questions are answered!*
```

---

**File saved to:** `/home/dammieoptimus/Documents/starium-density-app/LAMINATE_WASTE_PLAN.md`

You can now review the plan and answer the clarifying questions. Once you provide your answers, I'll proceed with the implementation in the order specified in Phase 1-6.*
