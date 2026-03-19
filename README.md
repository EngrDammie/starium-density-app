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
9. [User Preferences](#user-preferences)
10. [Shift Timing](#shift-timing)
11. [Network Status Indicator](#network-status-indicator)
12. [Configurable Constants](#configurable-constants)
13. [Color Coding](#color-coding)
14. [Browser Support](#browser-support)
15. [Troubleshooting](#troubleshooting)

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
- **Deployment:** GitHub Pages (automatic on push to main)

---

## Application Structure

### Files

| File | Purpose |
|------|---------|
| `index.html` | Main QC data entry page (Level 9 + BOT modes) |
| `level9-exec.html` | Executive view for Level 9 - monitoring & approvals |
| `bot-exec.html` | Executive view for BOT - monitoring & approvals |
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

**Required Approvals (4):**
1. Buggy Supervisor
2. PLC Operator
3. Production Manager
4. QC Manager

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

**Required Approvals (3):**
1. PLC Operator
2. Production Manager
3. QC Manager

**Additional Fields:**
- Appearance (Acceptable/Unacceptable)
- Flow Property (Free Flowing / Not Free Flowing)

---

## 30 Machines with Specifications

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

1. Click your role button (Buggy Supervisor, PLC Operator, Production Manager, or QC Manager)
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

## Network Status Indicator

All pages display online/offline status in the top-right corner:

- 🟢 **Online** (green) - Connected to Firestore
- 📴 **Offline** (red) - No internet connection

---

## Configurable Constants

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
