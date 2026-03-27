# Audit Trail - What It Is and How We'll Build It

## 🎯 Introduction

Welcome! This document explains what an **Audit Trail** is and how we'll add it to the Starium Density App. We'll explain everything in simple terms, assuming you have little to no technical background.

---

## 🤔 What is an Audit Trail?

### Simple Explanation

Imagine you have a **security camera** in a building. The camera records:

- **Who** entered (a person)
- **When** they entered (time)
- **What** they did (action)
- **Where** they went (location)

An **Audit Trail** is like a digital security camera for your app. It keeps a record of:

- **WHO** did something (which user)
- **WHEN** they did it (date and time)
- **WHAT** they did (the action)
- **WHERE** in the app (which page/feature)
- **WHAT WAS CHANGED** (old value → new value)

### Real-World Example

Let's say your QC Staff member "John" submits a QC test:

**Without Audit Trail (Current):**
- You see: "A test was submitted at 2:30 PM"
- You DON'T know: WHO submitted it

**With Audit Trail:**
- You see: "John (staff) submitted a QC test at 2:30 PM on March 27, 2026"
- You also see: The test details (density: 0.255, machine: 5, mode: level9)

### Why Do You Need One?

1. **Accountability** — Know WHO did WHAT
2. **Problem Solving** — If something goes wrong, trace what happened
3. **Compliance** — Some industries require audit logs by law
4. **Security** — Detect unusual activity or unauthorized changes
5. **Training** — Review how staff are using the app

---

## 🔍 What Actions Will Be Tracked?

We'll track these actions in the Starium app:

### 1. QC Test Submissions
- Who submitted a test
- What machine/density/buggy number
- When it was submitted

### 2. Approvals
- Who approved a shift
- Which approver (Buggy Supervisor, PLC Operator, etc.)
- When approval was given

### 3. User Management
- Who created a new user
- What role was assigned
- Who deleted or changed a user

### 4. Configuration Changes
- Who changed machine settings
- What density thresholds were modified
- When settings were updated

### 5. Authentication
- Who logged in
- When they logged in/out
- Failed login attempts

---

## 🏗️ How We'll Build It (Technical Details)

### Architecture Overview

We'll create a new **collection** in Firestore called `audit_logs`. Every time someone does something important, we'll add a record to this collection.

```
Firebase Firestore
├── qc_tests (existing)
├── shift_approvals (existing)
├── user_roles (existing)
├── config (existing)
└── audit_logs (NEW!)
    └── Each document = one action
```

### Data Structure

Each audit log entry will contain:

```json
{
  "timestamp": "2026-03-27T14:30:00Z",
  "userEmail": "john@company.com",
  "userRole": "staff",
  "action": "qc_test_submitted",
  "page": "index.html",
  "details": {
    "machineId": 5,
    "density": 0.255,
    "mode": "level9"
  },
  "ipAddress": "optional - for advanced security"
}
```

### How It Works (Step by Step)

#### Step 1: Create the Logging Function

We'll create a JavaScript function called `logAudit()` that can be called from anywhere in the app:

```javascript
// Example of how we'll call it
logAudit({
  action: 'qc_test_submitted',
  details: { 
    machineId: 5, 
    density: 0.255 
  }
});
```

#### Step 2: Add Logging to Key Actions

**When QC test is submitted (index.html):**
```javascript
async function submitTest() {
  // ... existing save code ...
  
  // NEW: Add audit log
  logAudit({
    action: 'qc_test_submitted',
    details: {
      machineId: selectedMachine,
      density: calculatedDensity,
      mode: currentMode
    }
  });
}
```

**When someone approves (level9-exec.html):**
```javascript
async function confirmApproval() {
  // ... existing approval code ...
  
  // NEW: Add audit log
  logAudit({
    action: 'shift_approved',
    details: {
      approverType: currentApproverType,
      approverName: enteredName,
      approvalId: currentApprovalId
    }
  });
}
```

**When user logs in (login.html):**
```javascript
async function loginUser() {
  // ... existing login code ...
  
  // NEW: Add audit log
  logAudit({
    action: 'user_login',
    details: { success: true }
  });
}
```

#### Step 3: Create Audit Log Viewer

We'll add a new section in the **Admin Panel** to view audit logs:

- Filter by date range
- Filter by user
- Filter by action type
- Search for specific actions
- Export audit logs to CSV

---

## 📋 Implementation Plan

### Phase 1: Core Functionality (1-2 days)

1. **Create audit logging function**
   - Add `logAudit()` to firebase-storage.js
   - Function saves to `audit_logs` collection

2. **Add logging to existing actions**
   - QC test submissions
   - Approvals
   - User logins/logouts

### Phase 2: User Management (1 day)

3. **Add logging to user management**
   - New user created
   - User role changed
   - User deleted

### Phase 3: Configuration (1 day)

4. **Add logging to admin settings**
   - Machine settings changed
   - Density thresholds modified

### Phase 4: Admin View (1-2 days)

5. **Create Audit Log Viewer**
   - New section in admin panel
   - Filter by date/user/action
   - Search functionality
   - Export to CSV

---

## 💡 Benefits Summary

| Benefit | Description |
|---------|-------------|
| **Know WHO** | Every action is tied to a specific user |
| **Know WHEN** | Exact timestamps for everything |
| **Know WHAT** | Detailed记录 of what changed |
| **Know WHY** | Can trace problems back to source |
| **Stay Secure** | Detect unauthorized access |
| **Stay Compliant** | Meet industry requirements |

---

## 🔒 Privacy Note

The audit trail stores:
- User email (for identification)
- User role (for context)
- Actions performed (for accountability)

We will **NOT** store:
- Passwords
- Sensitive personal information
- Financial data (unless explicitly needed)

---

## ⚙️ Technical Requirements

To implement this, we need:

1. **Firestore** (already have)
2. **JavaScript** (already have)
3. **Admin Panel access** (already have)
4. **User authentication** (already have)

**No additional services or costs required!**

---

## 📅 Timeline

| Phase | Description | Est. Time |
|-------|-------------|-----------|
| Phase 1 | Core logging function + main actions | 1-2 days |
| Phase 2 | User management logging | 1 day |
| Phase 3 | Configuration logging | 1 day |
| Phase 4 | Audit log viewer in admin | 1-2 days |

**Total: ~4-6 days of development**

---

## ✅ Next Steps

1. **Approve this plan** — Let us know if this makes sense
2. **Start Phase 1** — Begin implementing the core logging
3. **Test** — Verify it works correctly
4. **Deploy** — Roll out to production
5. **Train** — Show admin how to use the audit viewer

---

## ❓ Questions?

If you have any questions about:
- What the audit trail stores
- How to view the logs
- What actions are tracked
- Privacy concerns

Please ask! We're here to help make this work for you.