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
│  index.html, admin.html, level9-exec.html, bot-exec.html  │
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

**2. Protect all pages (`index.html`, `admin.html`, etc.)**

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

**In admin.html - Hide settings for non-admins:**

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
// In admin.html - Add User section

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
| `admin.html` | Add auth check, role-based UI, admin-only sections |
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

**admin.html:**
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