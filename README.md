# Starium Rafa Quality Control Tool

A web-based quality control application for a detergent factory that records powder density tests, monitors production machines, and tracks shift approvals.

**Live URL:** https://engrdammie.github.io/starium-density-app/

**GitHub Repository:** https://github.com/EngrDammie/starium-density-app

---

## Table of Contents

1. [Overview](#overview)
2. [Application Structure](#application-structure)
3. [Two Modes of Operation](#two-modes-of-operation)
4. [30 Machines with Specifications](#30-machines-with-specifications)
5. [How to Use the Main Page](#how-to-use-the-main-page)
6. [How to Use Executive Pages](#how-to-use-executive-pages)
7. [Firestore Data Structure](#firestore-data-structure)
8. [Offline Support](#offline-support)
9. [Settings & Configuration](#settings--configuration)
10. [Machine Admin Panel](#machine-admin-panel)
11. [User Preferences](#user-preferences)
12. [Shift Timing](#shift-timing)
13. [Auto-Reload on Shift Change](#auto-reload-on-shift-change)
14. [GitHub Actions Deployment](#github-actions-deployment)
15. [Network Status Indicator](#network-status-indicator)
16. [Configurable Constants](#configurable-constants)
17. [Color Coding](#color-coding)
18. [Browser Support](#browser-support)
19. [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose
The Starium Rafa Quality Control Tool is used in a detergent factory to:

- Record quality control tests for powder density
- Monitor production machines and assign powder deliveries
- Track shift approvals from supervisors
- Provide real-time data to executive/management personnel

### Production Environment
- **Backend:** Firebase Firestore (cloud database)
- **Deployment:** GitHub Pages via GitHub Actions (automatic on push to main)
- **Firebase Config:** Dynamically generated at deployment time via GitHub Actions secrets

---

## GitHub Actions Deployment

The application uses GitHub Actions to automatically deploy to GitHub Pages while keeping Firebase configuration secure:

### How It Works

1. **Secrets Storage**: Firebase configuration (apiKey, authDomain, projectId, etc.) stored as GitHub Secrets
2. **Workflow**: On push to main, GitHub Actions workflow:
   - Creates `firebase-config.js` with secrets injected
   - Uploads all files to GitHub Pages artifact
   - Deploys to live URL

### Security

- **Never committed to git**: `firebase-config.js` is in `.gitignore`
- **Secrets in GitHub**: Firebase credentials stored in GitHub repository secrets
- **Generated at build time**: Config file created during deployment, not in source code

### Configuration

To update Firebase config:
1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Update these secrets:
   - `FIREBASE_API_KEY`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_STORAGE_BUCKET`
   - `FIREBASE_MESSAGING_SENDER_ID`
   - `FIREBASE_APP_ID`

The next push to main will deploy with the new configuration.

---

## Application Structure

### Files

| File | Purpose |
|------|---------|
| `index.html` | Main QC data entry page (Level 9 + BOT modes) |
| `level9-exec.html` | Executive view for Level 9 - monitoring & approvals |
| `bot-exec.html` | Executive view for BOT - monitoring & approvals |
| `machine-management.html` | **Machine Admin Panel** - Manage machines, lines, and settings |
| `firebase-storage.js` | Firestore backend logic (shared by all pages) |
| `firestore.indexes.json` | Firestore database indexes configuration |

---

## Two Modes of Operation

### Level 9 Mode (Silo Densities)

- **Purpose:** Main production line testing
- **Divisor:** 1580 (weight ÷ 1580 = density)
- **Density Range (Normal):** 0.200 - 0.310 g/mL
- **Too Low:** < 0.200 g/mL
- **Too High:** > 0.310 g/mL

**Required Approvals (5):**
1. Buggy Supervisor
2. PLC Operator
3. Production Manager
4. QC Manager
5. Quality Control Supervisor

**Additional Fields:**
- Buggy Number (e.g., B001)
- Silo/Machine Numbers (1-30)
- Appearance (Acceptable/Unacceptable)
- Fragrance (Acceptable/Unacceptable)

---

### BOT Mode (Base Powder)

- **Purpose:** Testing base powder material
- **Divisor:** 1680 (weight ÷ 1680 = density)
- **Density Range (Normal):** 0.200 - 0.240 g/mL
- **Too Low:** < 0.200 g/mL
- **Too High:** > 0.240 g/mL

**Required Approvals (4):**
1. PLC Operator
2. Production Manager
3. QC Manager
4. Quality Control Supervisor

**Additional Fields:**
- Appearance (Acceptable/Unacceptable)
- Flow Property (Free Flowing / Not Free Flowing)

---

## Machine Admin Panel

A powerful web-based admin interface for managing machines, production lines, gram specifications, and grid settings. All configurations are stored in Firestore and sync automatically to all devices.

**Access:** Click the ⚙️ Settings button on any page, then click "Open Machine Admin Panel"

**URL:** `machine-management.html`

---

### Features

#### 1. Machine Management
- **Add new machines** with ID, displayNumber, name, line, and gram setting
- **Edit existing machines** - change name, displayNumber, line, or gram setting
- **Delete machines** - remove machines from the system
- **Search** - quickly find machines by name or ID
- **Filter** - view machines by production line
- **Auto-suggest** - next available ID and displayNumber suggested when adding

#### 2. Production Lines Management
- **Add new production lines** with custom ID, name, and display order
- **Edit lines** - update name and order
- **Delete lines** - remove lines (machines will need reassignment)
- **Auto-count** - shows how many machines are on each line

#### 3. Gram Specifications
- **Define density ranges** for each gram setting (22g, 45g, 85g, 125g, 850g)
- **Set pieces per carton** for packaging calculations
- **Auto-apply** - machines automatically use these ranges (no manual per-machine updates!)

#### 4. Grid Settings
- **Configure columns** - set how many columns in the machine grid display
- **Real-time update** - changes apply immediately across all devices

#### 5. Import/Export
- **Export Configuration** - download all settings as JSON backup
- **Import Configuration** - restore from a previous backup
- **Reset to Defaults** - restore factory default settings

---

### How Machine Configuration Works

Instead of hardcoding machine specs in the app, all configuration is stored in Firestore:

```javascript
// Firestore: config/settings document
{
  machines: [
    { id: 1, displayNumber: 1, gram: 125, min: 0.200, max: 0.270, line: "1A", name: "Machine 1" },
    { id: 2, displayNumber: 2, gram: 85, min: 0.240, max: 0.300, line: "1A", name: "Machine 2" },
    // ... any number of machines, each with displayNumber
  ],
  
  productionLines: [
    { id: "1A", name: "Line 1A", order: 1 },
    { id: "1B", name: "Line 1B", order: 2 },
    { id: "2A", name: "Line 2A", order: 3 },
    { id: "2B", name: "Line 2B", order: 4 },
    { id: "3A", name: "Line 3A", order: 5 },
    { id: "3B", name: "Line 3B", order: 6 }
  ],
  
  gramSpecs: {
    "22": { min: 0.200, max: 0.310, piecesPerCarton: 162, piecesBreakdown: "27 strings * 6 pcs" },
    "45": { min: 0.210, max: 0.310, piecesPerCarton: 84, piecesBreakdown: "14 strings * 6 pcs" },
    "85": { min: 0.240, max: 0.300, piecesPerCarton: 52, piecesBreakdown: "8 strings * 6 pcs + 4 pcs" },
    "125": { min: 0.200, max: 0.270, piecesPerCarton: 31, piecesBreakdown: "7 strings * 4 pcs + 3 pcs" },
    "850": { min: 0.200, max: 0.270, piecesPerCarton: 7 }
  },
  
  machineGridColumns: 6,
  dayShiftStart: 7,
  nightShiftStart: 19
}
```

**Key Fields:**
- `id` - Unique internal identifier (never changes, used in database references)
- `displayNumber` - Human-readable number shown in UI (can be changed anytime for renumbering)
- `name` - Friendly machine name
- `line` - Production line (1A, 1B, 2A, 2B, 3A, 3B)
- `order` - Determines column position (1A=rightmost, 6=3B=leftmost)

**Benefits:**
- **Single source of truth** - All devices share the same configuration
- **Real-time sync** - Changes propagate instantly
- **No code changes** - Add machines/lines via admin panel
- **Scalable** - Add any number of machines or lines
- **Inheritance** - Machines automatically use gram spec ranges (update gram = updates all machines!)

---

### Workflow: Adding a New Machine

1. Open the **Machine Admin Panel** (from Settings)
2. Go to **Gram Settings** tab → ensure gram setting exists with correct density range
3. Go to **Production Lines** tab → create the line if it doesn't exist
4. Go to **Machines** tab → click "+ Add Machine"
5. Enter:
   - **Machine ID** (e.g., 31) - Internal ID, never changes
   - **Display Number** (e.g., 6) - Shown in UI, can be changed anytime
   - **Machine Name** (e.g., Machine 6 or M6)
   - **Production Line** (select from dropdown)
   - **Gram Setting** (select - min/max auto-fills from Gram Settings)
6. Click **Save**

The new machine immediately appears in the display pages!

---

### Flexible Machine Layout System

The application features a dynamic machine layout that adapts to reality:

- **6 Production Lines** displayed as 6 vertical columns (left to right: 3B, 3A, 2B, 2A, 1B, 1A)
- **Variable machines per line** - Each line can have any number of machines
- **Machines grow downward** - New machines appear below existing ones in their line
- **Real-time updates** - Changes in machine-management.html immediately reflect on display pages without refresh

This flexible system ensures the app mirrors the physical factory layout exactly.

---

### Renumbering Machines

Each machine has two identifiers:

| Field | Purpose | Can Change? |
|-------|---------|--------------|
| **id** | Internal database reference (used in test records) | Never |
| **displayNumber** | Shown in UI (e.g., M1, M2...) | Anytime |
| **name** | Friendly name (e.g., "Machine 1", "Silo 1") | Anytime |

This allows you to renumber machines (e.g., change displayNumber from 31 to 6) without breaking historical test data, which references the internal `id`.

---

## 30 Machines with Specifications (Default Configuration)

The factory has 30 machines organized into 3 production lines:

### Line Organization

| Line | Machines | Gram Settings |
|------|----------|---------------|
| 1A | 1, 2, 3, 4, 5 | 125g, 85g |
| 1B | 6, 7, 8, 9, 10 | 125g, 85g, 850g, 22g |
| 2A | 11, 12, 13, 14, 15 | 85g |
| 2B | 16, 17, 18, 19, 20 | 850g, 85g |
| 3A | 21, 22, 23, 24, 25 | 850g, 45g |
| 3B | 26, 27, 28, 29, 30 | 850g, 45g |

### Machine Density Ranges

Each machine has a specific density range it can accept:

| Gram Setting | Density Range (g/mL) |
|--------------|---------------------|
| 22g | 0.200 - 0.310 |
| 45g | 0.210 - 0.310 |
| 85g | 0.240 - 0.300 |
| 125g | 0.200 - 0.270 |
| 850g | 0.200 - 0.270 |

### Carton Content (Packaging)

| Gram Setting | Pieces per Carton |
|--------------|-------------------|
| 22g | 162 pieces (27 strings × 6 pcs) |
| 45g | 84 pieces (14 strings × 6 pcs) |
| 85g | 52 pieces (8 strings × 6 pcs + 4 pcs) |
| 125g | 31 pieces (7 strings × 4 pcs + 3 pcs) |
| 850g | 7 pieces of detergents |

---

## How to Use the Main Page

### Step 1: Select Mode
Choose "Level 9 Silo Densities" or "BOT Densities" from the Mode dropdown.

### Step 2: Select Team
Choose Team A, B, or C from the Team dropdown.

### Step 3: Enter Your Name
Type your name in the Name field. This is saved to localStorage for future visits.

### Step 4: Enter Powder Weight
Enter the weight of the powder sample in grams. The app automatically calculates density based on the selected mode.

### Step 5: View Results

**Level 9 Mode:**
- See calculated density displayed prominently
- 30 machine buttons appear, color-coded:
  - **Green (highlighted):** Machine accepts this density
  - **Yellow (selected):** You've assigned this buggy to the machine
  - **Gray (dimmed):** Machine cannot accept this density
- Click a machine to see details and assign

**BOT Mode:**
- See density with status: NORMAL, TOO LOW, or TOO HIGH
- Color-coded result box (green = normal, red = out of range)

### Step 6: Select Machine (Level 9 only)
Click matching machines to assign the buggy. You can override and assign to non-matching machines if needed.

### Step 7: Save Test
Click "💾 Save Test" to save to Firestore. Confirmation shows "✅ Saved!"

---

## How to Use Executive Pages

### Access
- Level 9 Executive: Open `level9-exec.html`
- BOT Executive: Open `bot-exec.html`

### Features

1. **Current Density Display** - Shows the most recent test result with color-coded status
2. **Machine Status** - Level 9 shows which machines match current density
3. **QC Staff Info** - Shows who performed the latest test (name, shift, team)
4. **Approval Buttons** - Supervisors can approve the shift
5. **Recent Tests** - Shows last 10 tests in a scrollable table
6. **Online Status** - Shows connection status in top-right corner

### Approval Process

Each shift (DAY/NIGHT) requires approval from specific personnel:

1. Click your role button (Buggy Supervisor, PLC Operator, Production Manager, QC Manager, or Quality Control Supervisor)
2. Enter your name in the modal
3. Click Confirm
4. Button changes to show approval status with your name

Once all required approvers have approved, the shift status changes to "completed".

---

## Firestore Data Structure

### Collection: `qc_tests`

Each document represents one QC test:

```javascript
{
  mode: "level9" | "bot",
  approvalDocId: "shift_approvals document ID",
  weight: 316,           // grams
  density: 0.200,        // g/mL
  shift: "DAY" | "NIGHT",
  team: "A" | "B" | "C",
  qcName: "John Doe",
  
  // Level 9 specific
  buggyNumber: "B001",
  machines: [1, 2, 3],  // Array of machine IDs
  appearance: "A" | "U",
  fragrance: "A" | "U",
  
  // BOT specific
  flowProperty: "FF" | "NFF",
  
  remarks: "Density too LOW (0.200 g/mL)",
  createdAt: Timestamp,
  syncedFromOffline: true | false
}
```

---

### Collection: `shift_approvals`

Each document represents one shift's approval status:

```javascript
{
  mode: "level9" | "bot",
  shift: "DAY" | "NIGHT",
  date: "2026-03-19",
  
  buggySupervisor: { name: "John", approvedAt: Timestamp } | null,
  plcOperator: { name: "Jane", approvedAt: Timestamp } | null,
  productionManager: { name: "Bob", approvedAt: Timestamp } | null,
  qcManager: { name: "Alice", approvedAt: Timestamp } | null,
  qcSupervisor: { name: "Mike", approvedAt: Timestamp } | null,
  
  status: "pending" | "completed",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  completedAt: Timestamp | null
}
```

---

## Offline Support

### How It Works

1. When the user is offline (no internet connection), saving queues data to localStorage
2. User sees "📱 Saved Offline!" message
3. When internet returns, data automatically syncs to Firestore
4. Synced data is marked with `syncedFromOffline: true`

### Technical Implementation

- Uses localStorage with key: `starium_offline_queue`
- Listens for `online` event to trigger sync
- Syncs one item at a time in chronological order

### Limitations

- Only saves to Firestore when online
- Approval workflow requires internet
- Real-time updates require internet connection

---

## Settings & Configuration

The app includes a Settings dialog that allows users to view and modify configuration values. All settings are stored in Firestore and automatically synced across all devices and browser tabs in real-time.

> **Advanced Configuration:** For managing machines, production lines, gram specifications, and grid settings, use the **Machine Admin Panel** (accessible from Settings → Open Machine Admin Panel).

### Accessing Settings

Click the ⚙️ gear button located at the bottom-left corner of any page.

### Configurable Settings

#### Level 9 Density

| Setting | Default | Description |
|---------|---------|-------------|
| Minimum Density | 0.200 | Lower threshold for acceptable density (g/mL) |
| Maximum Density | 0.310 | Upper threshold for Level 9 density (g/mL) |
| Volume (Divisor) | 1580 | Divisor used in calculation: density = weight ÷ divisor |

#### BOT Density

| Setting | Default | Description |
|---------|---------|-------------|
| Minimum Density | 0.200 | Lower threshold for acceptable density (g/mL) |
| Maximum Density | 0.240 | Upper threshold for BOT density (g/mL) |
| Volume (Divisor) | 1680 | Divisor used in calculation: density = weight ÷ divisor |

#### Shift Times

| Setting | Default | Description |
|---------|---------|-------------|
| Day Shift Start | 7 | Hour (0-23) when DAY shift begins |
| Night Shift Start | 19 | Hour (0-23) when NIGHT shift begins |

### Firestore Storage

Settings are stored in a `config` collection with document ID `settings`:

```javascript
{
  // Density Settings
  level9MinDensity: 0.200,
  level9MaxDensity: 0.310,
  level9Divisor: 1580,
  botMinDensity: 0.200,
  botMaxDensity: 0.240,
  botDivisor: 1680,
  
  // Shift Settings
  dayShiftStart: 7,
  nightShiftStart: 19,
  
  // UI Settings
  showSettingsBtnIndex: true,
  showSettingsBtnLevel9Exec: true,
  showSettingsBtnBotExec: true,
  
  // Machine Configuration (Dynamic - managed via Machine Admin Panel)
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
    // ... all machines
  ],
  
  gramSpecs: {
    "22": { min: 0.200, max: 0.310, piecesPerCarton: 162 },
    "45": { min: 0.210, max: 0.310, piecesPerCarton: 84 },
    "85": { min: 0.240, max: 0.300, piecesPerCarton: 52 },
    "125": { min: 0.200, max: 0.270, piecesPerCarton: 31 },
    "850": { min: 0.200, max: 0.270, piecesPerCarton: 7 }
  },
  
  updatedAt: Timestamp
}
```

### Features

- **Real-time Sync:** Changes made in one tab/device instantly reflect in all others
- **Validation:** Prevents saving invalid configurations (e.g., min >= max)
- **Default Values:** If no config exists in Firestore, default values are created automatically
- **Persistent:** Settings survive browser cache clearing (stored in Firestore)
- **Auto-merge:** When code updates add new config fields, they are automatically added to existing Firestore documents

---

## User Preferences

The app saves user preferences locally using browser localStorage:

| Key | Description |
|-----|-------------|
| `qcName` | QC staff name |
| `qcTeam` | Selected team (A, B, or C) |

---

## Shift Timing

| Shift | Time Range |
|-------|------------|
| DAY | 7:00 AM - 7:00 PM |
| NIGHT | 7:00 PM - 7:00 AM |

The app automatically detects the current shift based on the system time.

---

## Auto-Reload on Shift Change

Executive pages (level9-exec.html and bot-exec.html) automatically reload when a new shift begins:

- **DAY shift starts at 7:00 AM** - Page reloads to create new approval record
- **NIGHT shift starts at 7:00 PM** - Page reloads to create new approval record

This ensures:
1. New approval records are created for each shift
2. Managers/admins always see data from the current shift
3. No manual refresh needed when shift changes

The auto-reload happens within 1 minute of the shift change (pages check every 60 seconds).

---

## Network Status Indicator

All pages display online/offline status in the top-right corner:

- 🟢 **Online** (green) - Connected to Firestore
- 📴 **Offline** (red) - No internet connection

---

## Configurable Constants

> **Note:** These constants can now be modified via the Settings dialog (⚙️ button). For advanced configuration (machines, production lines, gram specs), use the **Machine Admin Panel**.

In `index.html` JavaScript, these constants control density calculations:

```javascript
const CONFIG = {
  DENSITY_TOO_LOW: 0.200,
  DENSITY_TOO_HIGH: 0.310,    // Level 9 maximum
  LEVEL9_DIVISOR: 1580,
  BOT_DIVISOR: 1680,
  BOT_NORMAL_MAX: 0.240       // BOT maximum
};
```

To change basic settings, click the ⚙️ Settings button at the bottom-left of any page.

To change machines, production lines, gram specifications, or grid columns, use the **Machine Admin Panel** (accessible from Settings).

---

## Color Coding

| Color | Hex Code | Meaning |
|-------|----------|---------|
| Cyan | #00BCD4 | Primary brand color, headers, buttons |
| Green | #00E676 | Normal density, success states, matching machines |
| Orange | #FF9800 | Warning, pending states, saving |
| Red | #FF1744 | Too low/high density, errors |
| Gold | #FFD700 | Selected/assigned machines |

---

## Browser Support

- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Requires internet for Firestore sync (offline localStorage works partially)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Save stuck at "Saving..." | Check internet connection; data may be queued for sync |
| "No matching machines" | Density is outside all machine ranges; use override feature |
| Approval buttons not working | Refresh page; check network connection |
| Offline indicator shows wrong status | Refresh the page |
| Data not syncing after going online | Check browser console for errors; try manual refresh |

---

## Backup and Recovery

Current backup: `backup-pre-offline-queue-20260319-055204`

Previous backups can be restored using:
```bash
git checkout <backup-tag-name>
```

To list all backup tags:
```bash
git tag -l
```

---

## License

© 2026 Dammie Optimus Solutions. All rights reserved.

---

**Built with ❤️ by Engr. Dammie Optimus**
