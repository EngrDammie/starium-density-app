# Starium Density App - Complete Security Implementation Guide

This document provides a **complete, end-to-end** guide to implementing authentication and authorization for the Starium Density App.

---

## Table of Contents

1. [Current Security State](#current-security-state)
2. [What We Need to Build](#what-we-need-to-build)
3. [System Architecture](#system-architecture)
4. [Authentication Implementation](#authentication-implementation)
5. [Authorization Implementation](#authorization-implementation)
6. [Security Rules (Database Level)](#security-rules-database-level)
7. [User Roles and Permissions](#user-roles-and-permissions)
8. [Files to Modify](#files-to-modify)
9. [Step-by-Step Implementation Plan](#step-by-step-implementation-plan)
10. [User Experience Changes](#user-experience-changes)
11. [What Happens If We Don't Do This](#what-happens-if-we-dont-do-this)

---

## 1. Current Security State

### What's Happening Now (Insecure)

```
User's Browser                    Firebase (Database)
      |                                 |
      |--- JavaScript + API Key ------>|
      |                                 |
      |--- Read ALL data ------------->| ✅ Allowed
      |--- Write ANY data ------------->| ✅ Allowed  
      |--- Delete EVERYTHING --------->| ✅ Allowed
      |--- Change settings ----------->| ✅ Allowed
```

**Problems:**
- API Key is visible in JavaScript code
- Anyone with the URL can use the app
- No way to know WHO submitted a test
- Anyone can change machine settings
- No audit trail of who did what

---

## 2. What We Need to Build

### The Goal (Secure)

```
User's Browser                    Firebase (Database)
      |                                 |
      |------- Login ----------------->|
      |    (email + password)          |
      |                                 |
      |--- "I'm logged in as John" --->|
      |                                 |
      |--- Read QC tests -------------->| ✅ Allowed (logged in)
      |--- Submit QC test ------------->| ✅ Allowed (staff role)
      |--- Approve shift --------------->| ✅ Allowed (manager role)
      |--- Change machine settings ---->| ❌ BLOCKED (admin only)
      |--- Delete data ---------------->| ❌ BLOCKED (admin only)
```

---

## 3. System Architecture

### Components We'll Add

```
┌─────────────────────────────────────────────────────────────┐
│                     USER'S BROWSER                         │
├─────────────────────────────────────────────────────────────┤
│  login.html                                                 │
│  ├── Login form (email + password)                         │
│  ├── "Forgot password" link                                │
│  └── Check credentials → redirect to main app              │
├─────────────────────────────────────────────────────────────┤
│  index.html, machine-management.html, level9-exec.html, bot-exec.html  │
│  ├── Check if user is logged in                             │
│  ├── Show user's name in top corner                         │
│  ├── "Logout" button                                        │
│  └── Role-based UI (hide admin features for regular staff)  │
├─────────────────────────────────────────────────────────────┤
│  firebase-storage.js (UPDATED)                              │
│  ├── firebase.auth() - handles login                        │
│  ├── checkAuth() - checks if logged in                     │
│  ├── loginUser() - logs user in                             │
│  ├── logoutUser() - logs user out                           │
│  └── getUserRole() - returns user's role (staff/manager/admin)│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       FIREBASE                              │
├─────────────────────────────────────────────────────────────┤
│  Authentication                                             │
│  ├── User accounts (email + password)                       │
│  ├── Login sessions                                         │
│  └── Password reset                                        │
├─────────────────────────────────────────────────────────────┤
│  Firestore Security Rules                                   │
│  ├── qc_tests collection - read/write for logged in users  │
│  ├── shift_approvals - read/write for logged in users      │
│  ├── config - read for all, write for admins only          │
│  └── machines - read for all, write for admins only        │
├─────────────────────────────────────────────────────────────┤
│  Custom Claims (User Roles)                                │
│  ├── admin = true/false                                     │
│  ├── manager = true/false                                  │
│  └── staff = true/false                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Authentication Implementation

### What is Authentication?

**Authentication** = "Prove who you are"
- Like showing an ID card at the door
- User must provide email + password
- System verifies it's correct
- Creates a "session" (like a visitor badge)

### Where to Implement

**1. Create `login.html`**

```html
<!DOCTYPE html>
<html>
<head>
    <title>Login - Starium QC</title>
    <style>
        /* Same dark theme as rest of app */
        body { background: #0a0a0a; color: #fff; font-family: system-ui; }
        .login-box { 
            max-width: 400px; margin: 100px auto; 
            background: #12121a; padding: 40px; border-radius: 12px;
            text-align: center;
        }
        input { 
            width: 100%; padding: 12px; margin: 10px 0;
            background: #1a1a25; border: 1px solid #2a2a3a;
            color: #fff; border-radius: 8px;
        }
        button {
            width: 100%; padding: 14px; background: #FF6B00;
            color: #fff; border: none; border-radius: 8px;
            cursor: pointer; font-weight: bold;
        }
        .error { color: #FF1744; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="login-box">
        <h2>🔐 Starium QC Login</h2>
        <p>Enter your credentials to access the app</p>
        
        <form id="loginForm">
            <input type="email" id="email" placeholder="Email" required>
            <input type="password" id="password" placeholder="Password" required>
            <button type="submit">Login</button>
        </form>
        
        <div class="error" id="error"></div>
    </div>

    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
    <script>
        // Firebase config (same as firebase-storage.js)
        const firebaseConfig = {
            apiKey: "AIzaSyBO3Yrns0NibOzcM5EVUdQ62Std95ltZBk",
            authDomain: "starium-rafa-app.firebaseapp.com",
            projectId: "starium-rafa-app",
            storageBucket: "starium-rafa-app.firebasestorage.app",
            messagingSenderId: "743583982928",
            appId: "1:743583982928:web:e331aaa0b9e741a1537855"
        };
        
        firebase.initializeApp(firebaseConfig);
        
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorEl = document.getElementById('error');
            
            try {
                await firebase.auth().signInWithEmailAndPassword(email, password);
                // Success - redirect to main app
                window.location.href = 'index.html';
            } catch (err) {
                errorEl.textContent = 'Invalid email or password';
            }
        });
    </script>
</body>
</html>
```

**2. Protect all pages (`index.html`, `machine-management.html`, etc.)**

Add this at the very top of each HTML file (before any other JavaScript):

```javascript
// firebase-storage.js - Add at the end

// Check if user is logged in on every page load
function requireAuth() {
    firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
            // Not logged in, go to login page
            window.location.href = 'login.html';
        } else {
            // Logged in - store user info
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('userUid', user.uid);
        }
    });
}

// Call this when page loads
requireAuth();

// Also add logout function
function logout() {
    firebase.auth().signOut().then(() => {
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userUid');
        window.location.href = 'login.html';
    });
}
```

---

## 5. Authorization Implementation

### What is Authorization?

**Authorization** = "What are you allowed to do?"
- Like a hotel: guests can only enter their room, staff can enter all rooms
- Different roles have different permissions
- Enforced at TWO levels:
  1. **Frontend** - Hide buttons/features for non-permitted actions
  2. **Backend (Firebase)** - Block even if someone tries to hack

### User Roles

| Role | What they can do |
|------|-----------------|
| **Admin** (Engr. Optimus) | - Submit QC tests<br>- Approve shifts<br>- Edit machine settings<br>- Edit config<br>- Delete data<br>- Add/remove users |
| **Manager** | - Submit QC tests<br>- Approve shifts<br>- View reports<br>- Cannot edit settings |
| **Staff** (QC Operators) | - Submit QC tests only<br>- Cannot approve<br>- Cannot edit anything |

### How Roles Work

**Option A: Using Firebase Custom Claims (Recommended)**

Custom claims are stored in the user's authentication token. They persist across sessions and are verified by the server.

```javascript
// Set admin claim for the owner
// Run this ONCE in a Node.js script or Firebase Cloud Function

const admin = require('firebase-admin');
const functions = require('firebase-functions');

// Cloud Function to set admin role
exports.setAdminRole = functions.https.onCall((data, context) => {
    // Verify the caller is already an admin
    if (context.auth.token.admin !== true) {
        throw new functions.https.HttpsError(
            'permission-denied', 
            'Only admins can set roles'
        );
    }
    
    return admin.auth().setCustomUserClaims(data.uid, { 
        admin: true,
        manager: true,
        staff: true 
    });
});
```

**Option B: Simple roles in Firestore (Easier)**

Store roles in a collection in the database.

```javascript
// In firebase-storage.js

// Get user's role from Firestore
async function getUserRole(userId) {
    const doc = await db.collection('user_roles').doc(userId).get();
    if (doc.exists) {
        return doc.data();
    }
    return { role: 'staff' }; // Default role
}

// Check if user can do something
function canEditSettings() {
    const role = localStorage.getItem('userRole');
    return role === 'admin' || role === 'manager';
}
```

### Frontend Role-Based UI

**In machine-management.html - Hide settings for non-admins:**

```javascript
// In firebase-storage.js or inline script
async function checkPermissions() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    // Get role (from custom claim or Firestore)
    const roleDoc = await db.collection('user_roles').doc(user.uid).get();
    const role = roleDoc.exists ? roleDoc.data().role : 'staff';
    
    localStorage.setItem('userRole', role);
    
    // Hide admin-only elements
    if (role !== 'admin') {
        document.getElementById('adminPanelLink').style.display = 'none';
        document.getElementById('machineSettingsBtn').style.display = 'none';
    }
    
    // Show user name and logout
    document.getElementById('userNameDisplay').textContent = user.email;
}
```

---

## 6. Security Rules (Database Level)

### What are Security Rules?

Security rules are **firewall rules** at the database level. Even if someone tries to hack the app, the database will reject their request.

### Where to Configure

1. Go to Firebase Console
2. Select project `starium-rafa-app`
3. Click **Firestore Database**
4. Click **Rules** tab
5. Paste the rules below
6. Click **Publish**

### Complete Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ========================================
    // QC TESTS COLLECTION
    // ========================================
    // Stores all quality control test results
    match /qc_tests/{testId} {
      // Anyone logged in can read tests
      allow read: if request.auth != null;
      
      // Anyone logged in can create (submit) new tests
      // We verify the data is valid
      allow create: if request.auth != null 
                    && request.resource.data.qcName != null
                    && request.resource.data.density != null;
      
      // Only admins can edit or delete
      allow update, delete: if request.auth.token.admin == true;
    }
    
    // ========================================
    // SHIFT APPROVALS COLLECTION  
    // ========================================
    // Stores approval status for each shift
    match /shift_approvals/{approvalId} {
      // Anyone logged in can read approvals
      allow read: if request.auth != null;
      
      // Anyone logged in can create new approvals
      allow create: if request.auth != null;
      
      // Anyone logged in can update (add their approval)
      // We verify the approver name is set
      allow update: if request.auth != null 
                    && request.resource.data[request.resource.data.approverField] != null;
      
      // Only admins can delete
      allow delete: if request.auth.token.admin == true;
    }
    
    // ========================================
    // CONFIG COLLECTION
    // ========================================
    // Stores app settings, machine configs, etc.
    match /config/{docId} {
      // Anyone logged in can read settings
      allow read: if request.auth != null;
      
      // ONLY ADMINS can change settings
      // This checks for custom claim "admin: true"
      allow write: if request.auth.token.admin == true;
    }
    
    // ========================================
    // MACHINES COLLECTION
    // ========================================
    // Stores machine configurations
    match /machines/{machineId} {
      // Anyone logged in can read machines
      allow read: if request.auth != null;
      
      // ONLY ADMINS can change machines
      allow write: if request.auth.token.admin == true;
    }
    
    // ========================================
    // USER ROLES COLLECTION
    // ========================================
    // Maps user IDs to roles (if using Firestore-based roles)
    match /user_roles/{userId} {
      // Users can read their own role
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Only admins can change roles
      allow write: if request.auth.token.admin == true;
    }
    
  }
}
```

### What Each Rule Means

| Rule | Meaning |
|------|---------|
| `request.auth != null` | User must be logged in |
| `request.auth.token.admin == true` | User must have admin badge |
| `request.resource.data` | The data being written |
| `allow read` | Can view data |
| `allow create` | Can add new data |
| `allow update` | Can modify existing data |
| `allow delete` | Can remove data |
| `if false` | Always blocked |

---

## 7. User Roles and Permissions

### Complete Permission Matrix

| Action | Admin | Manager | Staff |
|--------|-------|---------|-------|
| **Login to app** | ✅ | ✅ | ✅ |
| **Submit QC test** | ✅ | ✅ | ✅ |
| **View own tests** | ✅ | ✅ | ✅ |
| **View all tests** | ✅ | ✅ | ❌ |
| **Approve shift** | ✅ | ✅ | ❌ |
| **View reports** | ✅ | ✅ | ❌ |
| **Use admin panel** | ✅ | ❌ | ❌ |
| **Edit machines** | ✅ | ❌ | ❌ |
| **Edit gram specs** | ✅ | ❌ | ❌ |
| **Edit config** | ✅ | ❌ | ❌ |
| **Delete tests** | ✅ | ❌ | ❌ |
| **Manage users** | ✅ | ❌ | ❌ |

### Initial User Setup

1. **Engr. Optimus** (You) → Admin role
2. **Managers** → Manager role (you create their accounts)
3. **QC Staff** → Staff role (you create their accounts)

### How to Create Users

**Option 1: Firebase Console (Manual)**

1. Go to Firebase Console → Authentication
2. Click **Add User**
3. Enter email + password
4. Click Add
5. Go to User Roles collection in Firestore
6. Create document with their UID
7. Set role: `staff` or `manager`

**Option 2: In the App (Admin only)**

Create an "Add User" page in the admin panel:

```javascript
// In machine-management.html - Add User section

async function createUser(email, password, role) {
    // Only admins can do this
    if (localStorage.getItem('userRole') !== 'admin') {
        alert('Only admins can create users');
        return;
    }
    
    try {
        // Create user in Firebase Auth
        const userRecord = await firebase.auth().createUser({
            email: email,
            password: password
        });
        
        // Set role in Firestore
        await db.collection('user_roles').doc(userRecord.uid).set({
            email: email,
            role: role,
            createdAt: new Date(),
            createdBy: firebase.auth().currentUser.uid
        });
        
        alert('User created successfully!');
    } catch (err) {
        alert('Error: ' + err.message);
    }
}
```

---

## 8. Files to Modify

### New Files to Create

| File | Purpose |
|------|---------|
| `login.html` | Login page with email/password form |

### Files to Modify

| File | Changes |
|------|---------|
| `firebase-storage.js` | Add auth functions, role checking |
| `index.html` | Add auth check, user display, logout button |
| `machine-management.html` | Add auth check, role-based UI, admin-only sections |
| `level9-exec.html` | Add auth check, approval permission check |
| `bot-exec.html` | Add auth check |
| `reports.html` | Add auth check, role-based visibility |

### Changes Summary by File

**firebase-storage.js:**
```javascript
// ADD:
- checkAuth() - verify logged in
- loginUser(email, password) - log in
- logoutUser() - log out
- getUserRole() - get user's role
- canEditSettings() - check if user can edit
```

**index.html:**
```html
<!-- ADD in header -->
<div id="userInfo" style="display:none;">
    <span id="userEmail"></span>
    <button onclick="logoutUser()">Logout</button>
</div>

<!-- ADD at top of script -->
requireAuth();
```

**machine-management.html:**
```javascript
// ADD:
// - Check if admin before showing admin features
// - Hide machine edit if not admin
// - Show "Add User" only if admin
```

---

## 9. Step-by-Step Implementation Plan

### Phase 1: Firebase Setup (10 minutes)

1. **Enable Firebase Auth**
   - Go to Firebase Console → Authentication
   - Enable "Email/Password" sign-in method
   
2. **Set Security Rules**
   - Go to Firestore → Rules
   - Paste the security rules (from Section 6)
   - Click Publish

3. **Create User Roles Collection**
   - Go to Firestore → Data
   - Create collection: `user_roles`
   - Add your document with your UID and role: `admin`

### Phase 2: Create Login Page (15 minutes)

1. Create `login.html` with login form
2. Add Firebase Auth scripts
3. Test login flow

### Phase 3: Protect All Pages (10 minutes)

1. Add `requireAuth()` to each page
2. Add logout button
3. Add user name display

### Phase 4: Add Role-Based Access (10 minutes)

1. Add role checking to `firebase-storage.js`
2. Hide admin-only features for non-admins
3. Test different user roles

### Phase 5: Create Admin User Management (Optional, 10 minutes)

1. Add "Add User" feature in admin panel
2. Add role selector when creating users

---

## 10. User Experience Changes

### Before (No Login)

1. User opens `index.html`
2. Immediately sees the app
3. Enters data, clicks save
4. Done - no accountability

### After (With Login)

1. User opens `index.html`
2. **Redirected to `login.html`**
3. Enters email + password
4. If correct → goes to main app
5. Sees their email in top corner
6. Can click "Logout" when done

### What Staff Will See

```
┌─────────────────────────────────────────────────────────┐
│ 🔵 Starium QC    │  john@company.com  │  [Logout]      │
└─────────────────────────────────────────────────────────┘
│                                                         │
│  [Mode: Level 9 ▼] [Team: A ▼]  Name: John             │
│                                                         │
│  Weight: [316g] → Density: 0.200 (NORMAL)              │
│                                                         │
│  [💾 Save Test]                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
   ▲ No admin panel link, no settings access
```

### What Admin Will See

```
┌─────────────────────────────────────────────────────────┐
│ 🔵 Starium QC    │  admin@company.com │  [Logout]       │
└─────────────────────────────────────────────────────────┘
│  ⚙️ [Admin Panel]  📊 [Reports]                         │
└─────────────────────────────────────────────────────────┘
   ▲ Full access to everything
```

---

## 11. What Happens If We Don't Do This

### Current Risks

| Risk | Impact |
|------|--------|
| **Anyone can read data** | Competitors see your QC data |
| **Anyone can change settings** | Someone breaks your machine config |
| **No accountability** | Can't tell who submitted bad data |
| **Data deletion** | Someone wipes all history |
| **Fake data injection** | Someone floods DB with fake tests |

### After Implementation

| Benefit | Impact |
|---------|--------|
| **Only authorized users** | Strangers can't access |
| **Role-based access** | Staff can't break settings |
| **Audit trail** | Know who did what |
| **Data integrity** | Only valid data accepted |
| **Peace of mind** | Your data is safe |

---

## Quick Summary

- **Authentication:** Users log in with email/password (login.html)
- **Authorization:** Different roles see/do different things
- **Security Rules:** Database blocks unauthorized requests even if app is compromised
- **Implementation:** ~45 minutes total, all free

This gives you enterprise-grade security at no cost!

---

## 12. Toggleable Authentication (Enable/Disable Auth)

This section adds a **master toggle** to enable or disable authentication. When disabled, the app works like before (no login required). When enabled, full auth kicks in.

### Why This Matters

- **Development:** Test features without constant login
- **Production flexibility:** Enable auth when ready
- **Gradual rollout:** Enable for different teams incrementally

### Implementation

**Step 1: Add Config Setting**

In Firestore `config` collection, add a document:

```json
{
  "id": "auth_settings",
  "authEnabled": false
}
```

**Step 2: Update firebase-storage.js**

```javascript
// Check if auth is enabled
async function isAuthEnabled() {
    try {
        const doc = await db.collection('config').doc('auth_settings').get();
        if (doc.exists) {
            return doc.data().authEnabled === true;
        }
    } catch (e) {
        console.log('Config not found, defaulting to auth disabled');
    }
    return false; // Default: auth disabled
}

// Check auth with toggle support
async function requireAuth() {
    const authEnabled = await isAuthEnabled();
    
    if (!authEnabled) {
        // Auth disabled - allow access
        localStorage.setItem('userRole', 'admin'); // Full access
        localStorage.setItem('userEmail', 'development@local');
        return;
    }
    
    // Auth enabled - enforce login
    firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = 'login.html';
        } else {
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('userUid', user.uid);
        }
    });
}
```

**Step 3: Update Security Rules**

```javascript
// In Firestore rules - handle both modes
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Get the auth toggle setting
    function isAuthEnabled() {
      return get(/databases/$(database)/documents/config/auth_settings).data.authEnabled == true;
    }
    
    // QC Tests
    match /qc_tests/{testId} {
      allow read:   if !isAuthEnabled() || request.auth != null;
      allow create: if !isAuthEnabled() || request.auth != null;
      allow update: if !isAuthEnabled() || request.auth != null;
      allow delete: if !isAuthEnabled() || request.auth.token.admin == true;
    }
    
    // Shift Approvals
    match /shift_approvals/{approvalId} {
      allow read:   if !isAuthEnabled() || request.auth != null;
      allow create: if !isAuthEnabled() || request.auth != null;
      allow update: if !isAuthEnabled() || request.auth != null;
      allow delete: if !isAuthEnabled() || request.auth.token.admin == true;
    }
    
    // Config (admin only when enabled)
    match /config/{docId} {
      allow read: if !isAuthEnabled() || request.auth != null;
      allow write: if !isAuthEnabled() || request.auth.token.admin == true;
    }
    
    // Machines (admin only when enabled)
    match /machines/{machineId} {
      allow read: if !isAuthEnabled() || request.auth != null;
      allow write: if !isAuthEnabled() || request.auth.token.admin == true;
    }
    
    // User Roles
    match /user_roles/{userId} {
      allow read: if !isAuthEnabled() || (request.auth != null && request.auth.uid == userId);
      allow write: if !isAuthEnabled() || request.auth.token.admin == true;
    }
  }
}
```

**Step 4: Add Toggle UI in machine-management.html**

```html
<!-- Add in admin panel -->
<div class="admin-section">
    <h3>🔐 Authentication Settings</h3>
    <label class="toggle">
        <input type="checkbox" id="authToggle" onchange="toggleAuth(this.checked)">
        <span class="slider"></span>
    </label>
    <p id="authStatus">Auth is currently: DISABLED</p>
</div>

<script>
// Admin email - only this user can disable auth when enabled
const ADMIN_EMAIL = 'dammieoptimus@gmail.com';

async function toggleAuth(enabled) {
    // Check current state
    const doc = await db.collection('config').doc('auth_settings').get();
    const currentState = doc.exists ? doc.data().authEnabled : false;
    
    // If trying to DISABLE (ON → OFF), only admin can do it
    if (!enabled && currentState) {
        const userEmail = localStorage.getItem('userEmail');
        if (userEmail !== ADMIN_EMAIL) {
            alert('Only admin can disable authentication');
            document.getElementById('authToggle').checked = true;
            return;
        }
    }
    
    // Anyone can enable (OFF → ON), only admin can disable
    await db.collection('config').doc('auth_settings').set({
        authEnabled: enabled,
        updatedAt: new Date()
    });
    
    document.getElementById('authStatus').textContent = 
        'Auth is currently: ' + (enabled ? 'ENABLED' : 'DISABLED');
    alert('Auth ' + (enabled ? 'enabled' : 'disabled') + '! Refresh the page.');
}

async function loadAuthSettings() {
    const doc = await db.collection('config').doc('auth_settings').get();
    if (doc.exists) {
        const enabled = doc.data().authEnabled;
        document.getElementById('authToggle').checked = enabled;
        document.getElementById('authStatus').textContent = 
            'Auth is currently: ' + (enabled ? 'ENABLED' : 'DISABLED');
    }
}
</script>

<style>
.toggle { position: relative; display: inline-block; width: 60px; height: 34px; }
.toggle input { opacity: 0; width: 0; height: 0; }
.slider {
    position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
    background-color: #ccc; transition: .4s; border-radius: 34px;
}
.slider:before {
    position: absolute; content: ""; height: 26px; width: 26px;
    left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%;
}
input:checked + .slider { background-color: #FF6B00; }
input:checked + .slider:before { transform: translateX(26px); }
</style>
```

### How to Use

1. **Default:** Auth is DISABLED (app works like before)
2. **Enable:** Go to Admin Panel → Toggle Auth ON → Confirm
3. **Effect:** All pages now require login
4. **Disable again:** Toggle OFF to return to open mode

### Quick Toggle via URL (Development)

For quick testing, add this to any page:

```javascript
// Quick toggle for dev - add in firebase-storage.js
if (new URLSearchParams(window.location.search).get('auth') === 'force') {
    requireAuth();
}
```

Use: `index.html?auth=force` to test auth on any page

---

## Multi-Role System: Page Roles + Approval Roles

This section explains how the app implements a two-layer role system for maximum flexibility.

### The Problem We Are Solving

**Before:** Each user had only ONE role (staff, manager, or admin). This meant:
- Users couldn't click approval buttons they're authorized for
- All managers had the same permissions
- No way to give granular approval authority

**After:** Each user has:
1. One **Page Access Role** (controls which pages they can open)
2. Multiple **Approval Roles** (controls which buttons they can click)

### Two Types of Roles

#### 1. Page Access Roles (Controls Page Access)

These determine **which pages** a user can open:

| Role | Pages They Can Open |
|------|---------------------|
| `admin` | All pages (including user management) |
| `manager` | Executive views, reports, machine management |
| `staff` | Only the main QC entry page |

#### 2. Approval Roles (Controls Button Clicks)

These determine **which approval buttons** a user can click on Executive pages:

**Level 9 Executive Page:**
| Role ID | Button |
|---------|--------|
| `buggy_supervisor` | 🔧 Buggy Supervisor |
| `plc_operator` | ⚡ PLC Operator |
| `production_manager` | 🏭 Production Manager |
| `qc_manager` | ✅ QC Manager |
| `qc_supervisor` | 🔍 QC Supervisor |

**BOT Executive Page:**
| Role ID | Button |
|---------|--------|
| `plc_operator` | ⚡ PLC Operator |
| `production_manager` | 🏭 Production Manager |
| `qc_manager` | ✅ QC Manager |
| `qc_supervisor` | 🔍 QC Supervisor |

### How Roles Are Stored in the Database

In Firestore, user roles are stored in the `user_roles` collection:

```
Collection: user_roles
Document: user's UID
Fields:
{
  role: "manager",              ← Page access role
  approvalRoles: [              ← Array of approval roles
    "plc_operator",
    "qc_manager"
  ]
}
```

**Key points:**
- `role` is a single string (admin/manager/staff)
- `approvalRoles` is an ARRAY (can have multiple values)

### How to Assign Roles (User Management Page)

An administrator can assign roles to users:

1. Go to user-management.html
2. Find the user
3. Set their page access role (dropdown)
4. Check the approval roles they should have (checkboxes)
5. Click Save

### How the App Checks Roles

#### Checking Page Access (When Opening a Page)

```javascript
// In firebase-storage.js
async function checkPageAccess() {
    const user = firebase.auth().currentUser;
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const roleDoc = await db.collection('user_roles').doc(user.uid).get();
        const userRole = roleDoc.exists ? roleDoc.data().role : 'staff';
        localStorage.setItem('userRole', userRole);

        // Check if user can access this page
        if (userRole === 'staff' && window.location.href.includes('exec')) {
            // Staff trying to open executive page - DENIED
            showAccessDenied();
        }
    } catch (e) {
        showAccessDenied();
    }
}
```

#### Checking Approval Roles (When Clicking a Button)

```javascript
// When user clicks an approval button
async function checkApprovalAccess(buttonRole) {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert('Please log in first');
        return;
    }

    try {
        const roleDoc = await db.collection('user_roles').doc(user.uid).get();
        const userData = roleDoc.exists ? roleDoc.data() : {};
        const approvalRoles = userData.approvalRoles || [];

        // Check if user has this role
        if (approvalRoles.includes(buttonRole)) {
            // User HAS the role - allow them
            openApprovalModal(buttonRole);
        } else {
            // User does NOT have the role - deny access
            alert('Access Denied! You are not authorized to click this button!');
        }
    } catch (e) {
        alert('Access Denied! You are not authorized to click this button!');
    }
}
```

### Example User Configurations

Here are common examples of how roles can be set up:

**Example 1: Senior Supervisor (Can do everything)**
```
Page Access Role: manager
Approval Roles: [buggy_supervisor, plc_operator, production_manager, qc_manager, qc_supervisor]
```

**Example 2: PLC Operator only**
```
Page Access Role: manager
Approval Roles: [plc_operator]
```

**Example 3: Production Manager**
```
Page Access Role: manager
Approval Roles: [production_manager]
```

**Example 4: Junior Staff (No approvals)**
```
Page Access Role: staff
Approval Roles: []
```

### What Users See

#### When Accessing a Page Without Permission

Page: Executive View
User: Staff member

```
┌────────────────────────────────────┐
│  ⛔ Access Denied                   │
│                                    │
│  Only administrators and managers    │
│  can access executive views.         │
│                                    │
│  ← Back to App                  │
└────────────────────────────────────┘
```

#### When Clicking a Button Without Permission

Page: Level 9 Executive
User: John (has only `qc_manager` role)
Action: Trying to click "Buggy Supervisor" button

```
Alert/Message:
┌────────────────────────────────────┐
│  ⚠ Access Denied!                  │
│                                    │
│  You are not authorized to         │
│  click this button!              │
│                                    │
│         [OK]                     │
└────────────────────────────────────┘
```

### Implementation Checklist

To implement this multi-role system, these files need to be updated:

| File | What to Change |
|------|-------------|
| `firebase-storage.js` | Add function to get user's approval roles |
| `user-management.html` | Add checkboxes for approval roles, save as array |
| `level9-exec.html` | Check role before opening approval modal |
| `bot-exec.html` | Check role before opening approval modal |

### Benefits of This System

1. **Flexibility** - Give users exactly the permissions they need
2. **Security** - Prevent unauthorized button clicks
3. **Scalability** - Easy to add new approval roles
4. **Clarity** - Clear distinction between page access and button permissions
5. **Audit trail** - Know who approved what shift