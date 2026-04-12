# Starium Density App: Duplicate Shift Approval Document Investigation

**Document Version:** 1.0  
**Date Created:** March 28, 2026  
**Author:** BumbleBee (AI Solutions Architect)  
**Purpose:** Root cause analysis and definitive solution for duplicate shift_approvals documents

---

## 📋 Executive Summary

**Problem:** During an active shift (DAY or NIGHT), a second `shift_approvals` document is created, causing QC test records to be split across two approval documents. This breaks data integrity and causes confusion in the executive dashboards.

**Root Cause Identified:** There are **THREE distinct scenarios** that can cause this bug:

1. **Mode Switching During Active Shift** (PRIMARY CAUSE)
2. **Midnight Boundary Issue** (NIGHT shift spanning two calendar dates)
3. **Client Clock Skew** (device time incorrect)

---

## 🔍 Detailed Root Cause Analysis

### Scenario 1: Mode Switching During Active Shift (PRIMARY CAUSE) 🔴

**How it happens:**

1. User is in **Level 9** mode during DAY shift (e.g., `level9_DAY_2026-03-28`)
2. User switches to **BOT** mode (or refreshes the page in BOT mode)
3. The function `initApprovalLink()` runs and calls:
   ```javascript
   getOrCreateShiftApproval(mode, shift, date)
   ```
4. Since `mode` is now `bot`, it tries to create: `bot_DAY_2026-03-28`
5. **A NEW document is created** even though DAY shift is still active!

**Code flow causing the issue:**

```
index.html → initApprovalLink() 
  ↓
modeSelect.addEventListener('change', ...) 
  ↓
initApprovalLink() // Called when mode changes
  ↓
getOrCreateShiftApproval('bot', 'DAY', '2026-03-28')
  ↓
Creates NEW document: bot_DAY_2026-03-28
```

**Result:** Now you have TWO documents for the same shift:
- `level9_DAY_2026-03-28` (created first)
- `bot_DAY_2026-03-28` (created when user switched mode)

All QC tests in BOT mode get linked to the new document, breaking data continuity.

---

### Scenario 2: Midnight Boundary Issue (NIGHT Shift)

**How it happens:**

The NIGHT shift runs from **7:00 PM (19:00) to 7:00 AM (07:00)**. This means it spans two calendar days:

- **NIGHT shift starting March 28, 7pm → ends March 29, 7am**

**Current logic in `getCurrentShiftApproval()`:**

```javascript
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const date = `${year}-${month}-${day}`;  // Uses current calendar date

const shift = (hour >= 7 && hour < 19) ? 'DAY' : 'NIGHT';
```

**The problem:**

| Time | Hour | Calculated Shift | Calculated Date | Issue |
|------|------|-----------------|-----------------|-------|
| Mar 28, 11:00 PM | 23 | NIGHT | 2026-03-28 | ✅ Correct |
| Mar 29, 1:00 AM | 1 | NIGHT | 2026-03-29 | ⚠️ Different date! |

At midnight during a NIGHT shift:
- Before midnight: Creates `mode_NIGHT_2026-03-28`
- After midnight: Creates `mode_NIGHT_2026-03-29`

Both documents exist for what is logically the SAME shift!

---

### Scenario 3: Client Clock Skew

**How it happens:**

If a user's device has an incorrect system clock (off by hours or days), the calculated date will differ from the actual date.

```javascript
const now = new Date();  // Uses device's system clock
```

**Examples:**
- Device thinks it's March 27, but it's actually March 28
- Device timezone is completely wrong

This can cause documents to be created with wrong dates, creating duplicates or orphaned records.

---

## 🏗️ Current Architecture (Before Fix)

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER ACTION                                  │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     index.html                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ initApprovalLink()                                          │   │
│  │   - Gets current mode from dropdown                         │   │
│  │   - Gets current date from new Date()                       │   │
│  │   - Gets current shift from hour                            │   │
│  │   - Calls getOrCreateShiftApproval(mode, shift, date)      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   firebase-storage.js                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ getOrCreateShiftApproval(mode, shift, date)                 │   │
│  │   - docId = `${mode}_${shift}_${date}`                      │   │
│  │   - Checks if document exists                               │   │
│  │   - If not, creates new document                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Firestore                                       │
│  Collection: shift_approvals                                       │
│  Documents:                                                         │
│    - level9_DAY_2026-03-28  ✅ First created                      │
│    - bot_DAY_2026-03-28     ⚠️ Duplicate created!                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ✅ Definitive Solution

### Solution Design

The core issue is that **the document ID is derived from mode + shift + date**, but:
1. Mode can change during a shift
2. Date can change during NIGHT shift
3. Client time can be wrong

**The Fix:** We need to ensure only ONE document exists per shift regardless of:
- Mode (level9 vs bot)
- User switching modes
- Midnight crossing

### Implementation Steps

#### Step 1: Fix Date Calculation for NIGHT Shift

For NIGHT shifts, we should use the **START date** of the shift, not the current date.

```
NIGHT shift logic:
- If it's currently 00:00-06:59 (NIGHT), the shift started on PREVIOUS day
- If it's currently 19:00-23:59 (NIGHT), the shift started on TODAY
```

**Code change:**
```javascript
function getShiftDateInfo() {
    const now = new Date();
    const hour = now.getHours();
    let shift, date;
    
    if (hour >= 7 && hour < 19) {
        // DAY shift (7am - 6:59pm)
        shift = 'DAY';
        date = formatDate(now);  // Today's date
    } else {
        // NIGHT shift (7pm - 6:59am)
        shift = 'NIGHT';
        if (hour >= 19) {
            // After 7pm - shift started today
            date = formatDate(now);
        } else {
            // Before 7am - shift started yesterday
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

#### Step 2: Remove Mode from Document ID

Since each shift should have ONE approval document regardless of mode:

**Change document ID from:**
```
mode_shift_date  →  e.g., level9_DAY_2026-03-28
```

**To:**
```
shift_date  →  e.g., DAY_2026-03-28
```

This means all QC tests (both Level 9 and BOT) during a shift link to the same document.

**OR** keep mode in ID but add a check to prevent creating new docs when mode changes.

#### Step 3: Add Mode Check Before Creating

Before creating a new document, check if a document exists for ANY mode for this shift:

```javascript
async function getOrCreateShiftApproval(mode, shift, date) {
    const db = window.db;
    
    // PROBLEM: Currently creates new doc for each mode!
    // FIX: Check if ANY mode document exists for this shift
    
    // First, check all existing docs for this shift+date
    // (This requires a query, which is less efficient)
    
    // BETTER FIX: Use shift_date only as doc ID (no mode)
    const docId = `${shift}_${date}`;  // e.g., DAY_2026-03-28
    
    try {
        const doc = await db.collection('shift_approvals').doc(docId).get();
        if (doc.exists) {
            return { id: doc.id, ...doc.data() };
        }
        
        // Create new doc (one per shift, not per mode)
        const newDoc = { 
            mode,  // Store current mode as a field
            shift, 
            date, 
            status: 'pending', 
            createdAt: new Date(), 
            approvedBy: [], 
            approvals: {} 
        };
        await db.collection('shift_approvals').doc(docId).set(newDoc);
        return { id: docId, ...newDoc };
    } catch (error) { 
        return null; 
    }
}
```

#### Step 4: Add Validation on Mode Change

When user changes mode, DON'T create a new approval document:

```javascript
modeSelect.addEventListener('change', () => {
    // ... existing code ...
    
    // FIX: DON'T call initApprovalLink() on mode change!
    // Instead, just get the existing approval for this shift
    // The shift is the same regardless of mode
});
```

---

## 📝 Recommended Implementation Plan

### Phase 1: Quick Fix (Minimal Code Change)
1. Modify `getShiftDateInfo()` to handle NIGHT shift correctly
2. Remove mode from document ID (use `shift_date` only)
3. Update all queries to use new document ID format

### Phase 2: Data Migration
1. Create a script to merge duplicate shift_approvals documents
2. Update all qc_tests with wrong approvalDocId to point to correct doc

### Phase 3: Testing
1. Test mode switching during active shift
2. Test midnight crossing during NIGHT shift
3. Test with different device times

---

## 🔧 Files That Need Modification

| File | Changes Required |
|------|-----------------|
| `firebase-storage.js` | Fix `getOrCreateShiftApproval()`, add `getShiftDateInfo()` |
| `index.html` | Remove `initApprovalLink()` call on mode change |
| `level9-exec.html` | Update to use new doc ID format |
| `bot-exec.html` | Update to use new doc ID format |
| `machine-management.html` | Update shift approval display |

---

## ⚠️ Data Cleanup Required

Before deploying the fix, you MUST:

1. **Audit existing data** - Find all duplicate shift_approvals documents
2. **Merge data** - Combine approvals from duplicate docs
3. **Update qc_tests** - Fix approvalDocId references to point to correct doc
4. **Delete duplicates** - Remove the extra documents

---

## 📊 Testing Scenarios

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| 1 | User in Level 9 mode, switches to BOT mode during same shift | Should use SAME approval document |
| 2 | NIGHT shift crosses midnight (11pm → 1am) | Should use SAME approval document |
| 3 | Multiple users on different devices same shift | All use SAME approval document |
| 4 | User changes mode, saves test, changes back | All tests link to ONE document |

---

## 📚 Glossary for Beginners

| Term | Meaning |
|------|---------|
| **shift_approvals** | Firestore collection storing approval status for each shift |
| **approvalDocId** | Field in qc_tests that links to the shift_approvals document |
| **mode** | Either "level9" (main production) or "bot" (base powder) |
| **shift** | Either "DAY" (7am-7pm) or "NIGHT" (7pm-7am) |
| **document ID** | The unique identifier for a Firestore document |
| **Firestore** | Google Firebase cloud database |
| **localDate** | Date based on user's device clock |

---

## ✅ Conclusion

The root cause is that **each mode (Level 9, BOT) creates its own approval document** when it should be **one document per shift**. The fix requires:

1. Using shift + date only (not mode) as document ID
2. Fixing midnight boundary for NIGHT shift
3. Preventing new documents when mode changes
4. Cleaning up existing duplicate data

This is a **production-critical fix** that should be tested thoroughly before deployment.

---

*Document prepared by BumbleBee*  
*For: Engr. Dammie Optimus*  
*Project: Starium Density App*