# Starium Density App: Duplicate Shift Approval Document Investigation

**Document Version:** 2.0  
**Date Updated:** March 28, 2026  
**Author:** BumbleBee (AI Solutions Architect)  
**Purpose:** Updated root cause analysis with corrected understanding

---

## 🔄 Important Clarification

**This document has been revised based on testing and user feedback.**

### What IS Correct Behavior:
- **Separate mode = Separate approval ID** ✅
- Level 9 and BOT are different QC workflows running simultaneously
- Each mode SHOULD have its own approval document for the same shift
- Example: `level9_DAY_2026-03-28` AND `bot_DAY_2026-03-28` are BOTH valid

### What IS the Bug:
- **Same mode + Same shift = Multiple approval IDs** ❌
- If you're in Level 9 mode, you should only have ONE approval doc per shift
- But somehow a second `level9_DAY_*` document is being created

---

## 📋 Executive Summary

**Problem:** During an active shift, a second `shift_approvals` document is created for the **same mode**, causing QC test records to be split across two approval documents.

**Root Cause Identified:** The **NIGHT shift midnight boundary issue** is the primary cause:

1. NIGHT shift runs from 7:00 PM to 7:00 AM (spans two calendar days)
2. At midnight, the date changes but the shift is logically the same
3. Code uses current date → creates new document with new date in ID
4. Result: Two documents for the same mode, same shift

---

## 🔍 Detailed Root Cause Analysis

### PRIMARY CAUSE: NIGHT Shift Midnight Boundary 🔴

**How it happens:**

The NIGHT shift runs from **7:00 PM (19:00) to 7:00 AM (07:00)** — it spans two calendar days:

```
NIGHT Shift Timeline (March 28-29):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mar 28    Mar 28    Mar 29    Mar 29
  7pm →   11pm  →   1am   →   7am
  ↓                    ↓
shift starts          shift ends

Date in code: 2026-03-28  →  2026-03-29  ← Changes at midnight!
```

**Current problematic code:**

```javascript
async function getCurrentShiftApproval(mode) {
    const now = new Date();
    
    // PROBLEM: Uses current calendar date
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;  // Changes at midnight!
    
    // Shift is correct (NIGHT from 7pm-7am)
    const hour = now.getHours();
    const shift = (hour >= 7 && hour < 19) ? 'DAY' : 'NIGHT';
    
    return getOrCreateShiftApproval(mode, shift, date);
}
```

**The issue in detail:**

| Time | Hour | Calculated Shift | Date Used | Document Created |
|------|------|-----------------|-----------|-------------------|
| Mar 28, 11:00 PM | 23 | NIGHT | 2026-03-28 | `level9_NIGHT_2026-03-28` ✅ |
| Mar 29, 12:30 AM | 0 | NIGHT | 2026-03-29 | `level9_NIGHT_2026-03-29` ❌ DUPLICATE! |
| Mar 29, 1:00 AM | 1 | NIGHT | 2026-03-29 | `level9_NIGHT_2026-03-29` |
| Mar 29, 6:00 AM | 6 | NIGHT | 2026-03-29 | `level9_NIGHT_2026-03-29` |

**At midnight:**
- Before midnight: Creates `level9_NIGHT_2026-03-28`
- After midnight: Creates `level9_NIGHT_2026-03-29`

Both are for the **same NIGHT shift** but the code treats them as different!

---

### SECONDARY CAUSE: Client Clock Skew

If a user's device has an incorrect system clock (off by hours or days):

```javascript
const now = new Date();  // Uses device's system clock
```

**Examples:**
- Device thinks it's March 27, but it's actually March 28
- Device date is wrong, causing wrong document IDs
- Timezone mismatch between device and server

---

### What is NOT a Bug (Confirmed by Testing)

**Mode switching DOES create new documents — this is CORRECT behavior:**

```
User in Level 9 mode:
1. Start in Level 9   → creates: level9_DAY_2026-03-28  ✅
2. Switch to BOT      → creates: bot_DAY_2026-03-28     ✅ (expected!)
3. Switch back        → uses existing docs              ✅
```

This is correct because Level 9 and BOT are separate QC workflows requiring separate approvals.

---

## 🏗️ Current Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TIME: March 28, 11pm                        │
│                        Shift: NIGHT                                 │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     firebase-storage.js                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ getCurrentShiftApproval(mode)                               │   │
│  │                                                              │   │
│  │ const date = `${year}-${month}-${day}`;  // "2026-03-28"   │   │
│  │ const shift = (hour >= 7 && hour < 19) ? 'DAY' : 'NIGHT'; │   │
│  │                                                              │   │
│  │ return getOrCreateShiftApproval(mode, shift, date);       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Firestore                                       │
│  Collection: shift_approvals                                        │
│  Documents:                                                         │
│    - level9_NIGHT_2026-03-28  ✅ Created at 11pm                   │
└─────────────────────────────────────────────────────────────────────┘

                    ↓ MIDNIGHT CROSSING ↓

┌─────────────────────────────────────────────────────────────────────┐
│                        TIME: March 29, 1am                          │
│                        Shift: NIGHT (still!)                       │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     firebase-storage.js                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ getCurrentShiftApproval(mode)                               │   │
│  │                                                              │   │
│  │ const date = `${year}-${month}-${day}`;  // "2026-03-29"   │   │
│  │ // ↑ CHANGED! Even though shift is still NIGHT             │   │
│  │                                                              │   │
│  │ return getOrCreateShiftApproval(mode, shift, date);        │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Firestore                                       │
│  Collection: shift_approvals                                        │
│  Documents:                                                         │
│    - level9_NIGHT_2026-03-28  ✅ Created at 11pm                   │
│    - level9_NIGHT_2026-03-29  ❌ NEW DOC CREATED! (BUG)            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ✅ Definitive Solution

### Solution Design

The fix needs to ensure that for the **same mode + same shift**, only **ONE** document exists — regardless of the date changing at midnight.

**Key Insight:** For NIGHT shifts, we should use the **START date** of the shift, not the current date.

```
NIGHT shift logic:
- If it's currently 19:00-23:59 (after 7pm), shift started TODAY
- If it's currently 00:00-06:59 (before 7am), shift started YESTERDAY
```

---

### Implementation Steps

#### Step 1: Fix Date Calculation for NIGHT Shift

Add a helper function to get the correct shift and date:

```javascript
function getShiftDateInfo() {
    const now = new Date();
    const hour = now.getHours();
    let shift, date;
    
    if (hour >= 7 && hour < 19) {
        // DAY shift (7am - 6:59pm) - shift started today
        shift = 'DAY';
        date = formatDate(now);
    } else {
        // NIGHT shift (7pm - 6:59am)
        shift = 'NIGHT';
        if (hour >= 19) {
            // After 7pm (7pm-11:59pm) - shift started TODAY
            date = formatDate(now);
        } else {
            // Before 7am (12am-6:59am) - shift started YESTERDAY
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            date = formatDate(yesterday);
        }
    }
    
    return { shift, date };
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
```

#### Step 2: Update getCurrentShiftApproval

Replace the current date calculation with the new function:

```javascript
async function getCurrentShiftApproval(mode) {
    // Use the new function that handles midnight correctly
    const { shift, date } = getShiftDateInfo();
    
    return getOrCreateShiftApproval(mode, shift, date);
}
```

#### Step 3: Also Fix initApprovalLink in index.html

The same fix needs to be applied to the frontend code:

```javascript
async function initApprovalLink() {
    const mode = modeSelect.value;
    
    // Use the new function
    const { shift, date } = getShiftDateInfo();
    
    try {
        const approval = await getOrCreateShiftApproval(mode, shift, date);
        currentApprovalDocId = approval.id;
    } catch (error) {
        console.error('Failed to initialize approval link:', error);
    }
}
```

#### Step 4: Update Executive Pages

The same `getShiftDateInfo()` function needs to be available in:
- `level9-exec.html`
- `bot-exec.html`
- `admin.html`

---

## 📝 Implementation Plan

### Phase 1: Code Changes
1. Add `getShiftDateInfo()` function to `firebase-storage.js`
2. Update `getCurrentShiftApproval()` to use the new function
3. Add the function to all HTML pages that use approval docs

### Phase 2: Data Cleanup (IMPORTANT!)
Before deploying, you MUST clean up existing duplicate data:

1. **Find duplicates** - Query for documents where same mode + shift has multiple dates
2. **Merge approvals** - Combine approver data from both docs
3. **Update qc_tests** - Change approvalDocId in all tests to point to the correct (earlier) doc
4. **Delete duplicates** - Remove the extra documents

### Phase 3: Testing
1. Simulate midnight crossing during NIGHT shift
2. Verify no new document created after midnight
3. Test both DAY and NIGHT shifts

---

## 🔧 Files That Need Modification

| File | Changes Required |
|------|-----------------|
| `firebase-storage.js` | Add `getShiftDateInfo()`, update `getCurrentShiftApproval()` |
| `index.html` | Add `getShiftDateInfo()` function, update `initApprovalLink()` |
| `level9-exec.html` | Add `getShiftDateInfo()` function |
| `bot-exec.html` | Add `getShiftDateInfo()` function |
| `admin.html` | Add `getShiftDateInfo()` function |

---

## ⚠️ Important Data Cleanup Notes

**Before the fix goes live:**

1. Run a Firestore query to find all duplicate approval documents:
   ```
   Collection: shift_approvals
   Where: mode == "level9" AND shift == "NIGHT"
   Order by: date
   ```

2. For any date pairs (e.g., `level9_NIGHT_2026-03-28` AND `level9_NIGHT_2026-03-29`) that are actually the same shift:
   - Keep the earlier date (shift start)
   - Move all approval data to it
   - Update all `qc_tests` with the old doc ID to point to the correct doc
   - Delete the duplicate

---

## 📊 Testing Scenarios

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| 1 | NIGHT shift at 11pm (before midnight) | Creates `mode_NIGHT_2026-03-28` |
| 2 | NIGHT shift at 1am (after midnight) | Should use SAME doc (`mode_NIGHT_2026-03-28`) |
| 3 | NIGHT shift at 7am (shift ends) | Uses same doc as start of shift |
| 4 | DAY shift any time | Uses correct date (no change needed) |

---

## ✅ Conclusion

**Root Cause:** The NIGHT shift spans midnight, but the code uses current calendar date in the document ID. At midnight, a new date triggers creation of a new document — even though it's the same shift.

**Fix:** For NIGHT shifts, calculate the date based on when the shift STARTED (before 7am = yesterday, after 7pm = today).

This is a production-critical fix that should be tested thoroughly before deployment, with data cleanup done beforehand.

---

*Document updated by BumbleBee*  
*For: Engr. Dammie Optimus*  
*Project: Starium Density App*