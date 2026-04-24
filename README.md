# Starium Rafa Quality Control Tool

A web-based quality control application for a detergent factory that records powder density tests, monitors production machines, and tracks shift approvals. The app works offline and automatically syncs when internet is restored!

**Live URL:** https://engrdammie.github.io/starium-density-app/

**GitHub Repository:** https://github.com/EngrDammie/starium-density-app

---

## Quick Start Guide

### For QC Staff (Main Page)
1. Open `index.html`
2. Select your **Mode** (Level 9 or BOT)
3. Select your **Team** (A, B, or C)
4. Enter your **Name**
5. Enter the **Powder Weight** in grams
6. View the calculated **Density** and matching machines
7. Click machines to assign the buggy
8. Click **Save Test** - Done! ✓

### For Supervisors/Managers (Executive Pages)
1. Open `level9-exec.html` (for Level 9) or `bot-exec.html` (for BOT)
2. View real-time density and machine status
3. Click your role button and enter your name to approve the shift
4. View recent tests in the table below

---

## Table of Contents

1. [Overview](#overview)
2. [Application Structure](#application-structure)
3. [Two Modes of Operation](#two-modes-of-operation)
4. [Machines with Specifications](#machines-with-specifications)
5. [How to Use the Main Page](#how-to-use-the-main-page)
6. [How to Use Executive Pages](#how-to-use-executive-pages)
7. [User Management](#user-management)
8. [Reports](#reports)
9. [Firestore Data Structure](#firestore-data-structure)
10. [Offline Support - Never Lose Data!](#offline-support---never-lose-data)
11. [Settings & Configuration](#settings--configuration)
12. [Machine Admin Panel](#machine-admin-panel)
13. [User Preferences](#user-preferences)
14. [Shift Timing](#shift-timing)
15. [Auto-Reload on Shift Change](#auto-reload-on-shift-change)
16. [GitHub Actions Deployment](#github-actions-deployment)
17. [Network Status Indicator](#network-status-indicator)
18. [Configurable Constants](#configurable-constants)
19. [Color Coding](#color-coding)
20. [Browser Support](#browser-support)
21. [Troubleshooting](#troubleshooting)

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
| `index.html` | Main QC data entry page (Level 9 + BOT modes) - Where QC staff record tests |
| `level9-exec.html` | Executive view for Level 9 - Real-time monitoring & approvals |
| `bot-exec.html` | Executive view for BOT - Real-time monitoring & approvals |
| `machine-management.html` | **Machine Admin Panel** - Manage machines, lines, gram specs, grid settings |
| `user-management.html` | **User Management** - Assign roles (admin, manager, staff) and approval permissions |
| `reports.html` | **Reports** - Build custom reports and export data (CSV/JSON) |
| `login.html` | User login page (if authentication is enabled) |
| `change-password.html` | Password change page |
| `firebase-storage.js` | Firestore backend logic (shared by all pages) |
| `reports.js` | Report building and export functions |
| `firestore.indexes.json` | Firestore database indexes configuration |

### How Pages Connect

```
                        ┌─────────────────────┐
                        │    Main QC Page    │
                        │   (index.html)      │
                        └──────────┬──────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Level 9 Exec    │    │    BOT Exec      │    │   Reports Page   │
│ (level9-exec)    │    │   (bot-exec)     │    │   (reports.html) │
└──────────────────┘    └──────────────────┘    └──────────────────┘
         │
         ▼
┌──────────────────┐    ┌──────────────────┐
│ Machine Admin    │    │  User Management │
│ Panel            │    │                   │
└──────────────────┘    └───────────────────┘
```

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

## Machines with Specifications (Default Configuration)

The factory has machines organized into production lines. You can add more using the Machine Admin Panel!

### Line Organization

| Line | Machines (Example) | Gram Settings |
|------|-----------------|---------------|
| 1A | 1, 2, 3, 4, 5 | 125g, 85g |
| 1B | 6, 7, 8, 9, 10 | 125g, 85g, 850g, 22g |
| 2A | 11, 12, 13, 14, 15 | 85g |
| 2B | 16, 17, 18, 19, 20 | 850g, 85g |
| 3A | 21, 22, 23, 24, 25 | 850g, 45g |
| 3B | 26, 27, 28, 29, 30 | 850g, 45g |

*You can add machines 31, 32, 33, 34... using the Machine Admin Panel!*

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

## Reports

The Reports page lets you generate printable reports for QC tests. Access it by clicking "Reports" from the main page or navigating to `reports.html`.

### How to Use

1. Click **QC Density Tests Report** button
2. Select **Date** from the date picker
3. Choose **Mode** (Level 9 or BOT)
4. Choose **Shift** (DAY or NIGHT)
5. Click **Generate Report**

### Report Contents

Each report includes:

1. **Report Header** - Title, Mode, Shift, Date, Total Tests, QC Staff, Team
2. **Shift Approvers** - Names of everyone who approved this shift
3. **Density Trend Chart** - Line chart showing density over time
4. **High/Low Distribution** - Doughnut chart showing Normal/Low/High counts
5. **Data Table** - All test details with columns for:
   - Time, Weight, Density, Status
   - Buggy number (Level 9)
   - Machines assigned (Level 9)
   - Appearance (A = Acceptable, U = Unacceptable)
   - Fragrance (Level 9, A/U)
   - Flow Property (BOT, A = Free Flowing, U = Not Free Flowing)
   - Remarks

### Printing Reports

To print a report:
1. Generate the report you want
2. Press **Ctrl+P** (or Cmd+P on Mac)
3. Only the report prints - navigation and buttons are hidden

### Responsive Design

The reports page works on phones and tablets:
- Tables scroll horizontally on small screens
- Charts stack vertically on mobile
- Touch-friendly controls

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
  createdAt: Timestamp,     // ORIGINAL save time (preserved from offline!)
  syncedAt: Timestamp,      // When it was synced to cloud
  wasOfflineQueued: true,  // Was saved while offline
  
  // For tracking offline-synced items
  // offlineSyncId: "2026-04-21T10:30:00.000Z_abc123" (unique queue ID)
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

## Offline Support - Never Lose Data!

### The Problem
Factories often have poor or intermittent internet. You need to record tests even when offline!

### The Solution
This app has a **smart offline system** that:
1. **Detects when internet is lost** - No more errors or lost data
2. **Queues data locally** - All tests are saved to your browser
3. **Shows pending count** - See how many tests are waiting to sync
4. **Auto-syncs when back online** - Data uploads automatically
5. **Preserves timestamps** - Your original save time is kept!

### How It Works

| Situation | What Happens |
|----------|------------|
| **You save while offline** | Data saved to browser with exact timestamp. Badge shows "X pending". You see "📱 Saved Offline!" |
| **Internet returns** | Orange "Syncing..." animation shows. Items sync one by one with original timestamps preserved |
| **Sync fails** | Item stays in queue for retry. Failed items tracked separately |
| **All synced** | Badge clears. Data shows in executive pages like normal |

### Visual Indicators

The sync status shows in the top-left corner:

| Status | Icon | What It Means |
|--------|------|------------|
| **Online** | 🟢 Green | Connected to internet and database |
| **Syncing** | 🔄 Orange (pulsing) | Uploading queued data |
| **Offline** | 📴 Red | No internet - data is being queued |

**Queue Badge:** When offline with pending data, shows "X pending" in orange.

### Timestamp Preservation

When you save offline, your exact save time is stored. When you sync:
- Original save time (`localCreatedAt`) becomes the test's `createdAt` in the database
- A `syncedAt` timestamp shows when it was uploaded
- `wasOfflineQueued: true` marks it as having been offline

This means your test times are accurate even if you were offline for hours!

### Technical Details

- **Storage:** Browser localStorage key: `starium_offline_queue`
- **Unique IDs:** Each queued item gets a `syncId` to prevent duplicates
- **Failed queue:** Failed syncs are tracked and retried automatically
- **Real-time:** All pages see the same pending count

### What Works Offline

| Feature | Works Offline? |
|---------|--------------|
| Recording tests | ✅ Yes - queued |
| Saving to database | ❌ No - queued |
| Viewing executive pages | ✅ Yes (shows cached data) |
| Approvals | ❌ No - requires internet |

### Pro Tips

1. **Check the badge** - If it shows pending, your data is safe
2. **Don't clear browser cache** - That removes the queue!
3. **Internet returns** - Sync happens automatically
4. **Multiple tests** - Each gets its own timestamp

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

All pages display online/offline status in the **top-left corner** (below the auth bar):

- 🟢 **Online** (green) - Connected to Firestore
- 📴 **Offline** (red) - No internet connection
- 🔄 **Syncing** (orange, pulsing) - Uploading queued data

When data is queued offline, a badge shows the count: **"3 pending"**

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

## User Roles and Permissions

The app has two different role systems that work together to control access:

### Two Types of Roles

| Role Type | Roles | What They Control |
|----------|-------|-------------|
| **Page Access Roles** | `admin`, `manager`, `staff` | Which pages a user can open |
| **Approval Roles** | `buggy_supervisor`, `plc_operator`, `production_manager`, `qc_manager`, `qc_supervisor` | Which approval buttons a user can click |

### Authentication Toggle

The app has a **flexible authentication system** that can be turned ON or OFF:

| Auth State | Behavior |
|-----------|----------|
| **ENABLED** | Users must log in to access the app. Roles and permissions are enforced. |
| **DISABLED** | Anyone can access the app without login. No authentication required. |

#### How to Toggle Authentication

1. Go to **User Management** page (user-management.html)
2. Find the **Authentication Settings** section at the top
3. Toggle the switch:
   - **ENABLED**: Users must log in
   - **DISABLED**: No login required - app works like authentication never existed

#### When Auth is DISABLED:
- ✅ No login page required
- ✅ No username/password needed
- ✅ Anyone can access any page
- ✅ All approval buttons work for everyone
- ✅ Executive pages accessible to all users

#### When Auth is ENABLED:
- ✅ Login required to access any page
- ✅ Page access based on role (admin/manager/staff)
- ✅ Approval buttons restricted by assigned approval roles
- ✅ User Management page restricted to admins only

#### Who Can Toggle Auth

- **Anyone** can turn authentication **ON**
- **Only the admin** (dammieoptimus@gmail.com) can turn authentication **OFF**

This gives工厂 flexibility - they can use full authentication for strict security, or disable it for simpler day-to-day operation.

---

## License

These roles control **which pages** a user can open when authentication is enabled:

| Role | Can Access |
|------|-----------|
| `admin` | All pages including settings and user management |
| `manager` | Executive views, reports, machine management |
| `staff` | Only the main QC entry page (index.html) |

### Approval Roles

These roles control **which buttons** a user can click on the Executive pages:

#### Level 9 Executive Page (5 buttons)

| Role ID | Button Label | Who Usually Has This Role |
|--------|------------|---------------------|
| `buggy_supervisor` | 🔧 Buggy Supervisor | Buggy operators/supervisors |
| `plc_operator` | ⚡ PLC Operator | PLC room operators |
| `production_manager` | 🏭 Production Manager | Production managers |
| `qc_manager` | ✅ QC Manager | QC managers |
| `qc_supervisor` | 🔍 QC Supervisor | QC supervisors |

#### BOT Executive Page (4 buttons)

| Role ID | Button Label | Who Usually Has This Role |
|--------|------------|---------------------|
| `plc_operator` | ⚡ PLC Operator | PLC room operators |
| `production_manager` | 🏭 Production Manager | Production managers |
| `qc_manager` | ✅ QC Manager | QC managers |
| `qc_supervisor` | 🔍 QC Supervisor | QC supervisors |

### How Roles Work Together

A user can have **BOTH** a page access role AND multiple approval roles:

**Example: John - Senior QC Supervisor**
```
Page Access Role: manager     ← Can open executive pages and reports
Approval Roles: [buggy_supervisor, plc_operator, production_manager, qc_manager, qc_supervisor]
                    ← Can click ALL approval buttons on both pages
```

**Example: Mary - PLC Operator**
```
Page Access Role: manager     ← Can open executive pages
Approval Roles: [plc_operator]
                    ← Can ONLY click PLC Operator button
```

**Example: Peter - Junior Staff**
```
Page Access Role: staff     ← Can only open main QC page
Approval Roles: []         ← Cannot click any approval button
```

### Where Roles Are Assigned

Roles are assigned in the **User Management** page by an administrator:
- Go to user-management.html
- Find the user
- Check the appropriate role boxes
- Click Save

### What Happens When a Userclicks an Approval Button

1. User clicks an approval button (e.g., "PLC Operator")
2. System checks: Does this user have the `plc_operator` role?
3. **If YES:** Opens the name input dialog → User enters name → Approval saved
4. **If NO:** Shows message: "Access Denied! You are not authorized to click this button!"

---

## License

© 2026 Dammie Optimus Solutions. All rights reserved.

---

**Built with ❤️ by Engr. Dammie Optimus**
