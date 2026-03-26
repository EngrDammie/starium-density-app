# Firebase Security Setup Guide — Starium Density App

## Project Info
- **Project:** `starium-rafa-app`
- **Admin Email:** dammieoptimus@gmail.com
- **Auth Type:** Email/Password
- **Special Feature:** Toggleable auth via `config/auth_settings` Firestore document

---

## 📋 STEP 1: Enable Email/Password Authentication (Manual — Firebase Console)

### Action Required By: Human

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project **`starium-rafa-app`**
3. Navigate to **Build → Authentication → Sign-in method**
4. Click **"Add new provider"** (or enable if already listed)
5. Select **"Email/Password"**
6. Toggle **Enable**
   - Enable "Email link (passwordless sign-in)" if you want magic links too
7. Click **Save**

✅ **Done when:** Email/Password shows as enabled in the sign-in providers list.

---

## 📋 STEP 2: Create the `config/auth_settings` Document (Manual — Firebase Console)

### Action Required By: Human

This document **controls whether auth is enforced**. Start with it set to `true` (auth enabled).

1. In Firebase Console, go to **Firestore Database**
2. Make sure you're in **Native mode**
3. Click **"Start collection"**
4. Set:
   - **Collection ID:** `config`
   - **Document ID:** `auth_settings`
5. Add field:
   - Field: `authEnabled`
   - Type: `boolean`
   - Value: `true`
6. Click **Save**

✅ **Done when:** `config/auth_settings` exists with `authEnabled: true`.

---

## 📋 STEP 3: Create the `user_roles` Collection with Admin Document (Manual — Firebase Console)

### Action Required By: Human

This grants admin privileges to `dammieoptimus@gmail.com`.

1. In Firestore, click **"Start collection"**
2. Set:
   - **Collection ID:** `user_roles`
3. When prompted for a Document ID, click **"Auto-ID"** or type a custom one
4. Click **Add field**, add:
   - Field: `email`
   - Type: `string`
   - Value: `dammieoptimus@gmail.com`
5. Add another field:
   - Field: `role`
   - Type: `string`
   - Value: `admin`
6. Click **Save**

> 💡 **Alternative:** You can also set the document ID to the user's UID after they register (via Admin SDK or Firebase Console after first sign-up).

---

## 📋 STEP 4: Deploy Firestore Security Rules (Below)

### Action Required By: Human (Copy-paste into Firebase Console)

Go to **Firestore Database → Rules** and replace everything with:

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ─── Helper Functions ───────────────────────────────────

    // Check if auth is globally enabled via config collection
    function isAuthEnabled() {
      return get(/databases/$(database)/documents/config/auth_settings).data.authEnabled == true;
    }

    // Check if the current user is signed in
    function isAuthenticated() {
      return request.auth != null;
    }

    // Get the current user's email
    function currentEmail() {
      return request.auth.token.email;
    }

    // Check if the current user has the 'admin' role in user_roles
    function isAdmin() {
      return isAuthenticated() &&
        get(/databases/$(database)/documents/user_roles/$(request.auth.uid)).data.role == 'admin';
    }

    // Fallback: also check by email (handles case where doc ID ≠ UID)
    function isAdminByEmail() {
      return isAuthenticated() &&
        exists(/databases/$(database)/documents/user_roles/$(currentEmail())) ||
        (resource.data.email == currentEmail() && resource.data.role == 'admin');
    }

    // ─── config collection ──────────────────────────────────
    // Only admins can write to config. Auth rule depends on toggle.
    match /config/{docId} {
      allow read: if !isAuthEnabled() || isAuthenticated();
      allow write: if !isAuthEnabled() || isAdmin();
    }

    // ─── user_roles collection ─────────────────────────────
    match /user_roles/{userId} {
      // Anyone can read roles (needed for client-side role checks)
      allow read: if !isAuthEnabled() || isAuthenticated();
      // Only admins can manage roles (or anyone if auth is disabled)
      allow write: if !isAuthEnabled() || isAdmin();
    }

    // ─── Default catch-all ─────────────────────────────────
    // When auth is DISABLED → full access
    // When auth is ENABLED  → read: authenticated, write: admin only
    match /{document=**} {
      allow read: if !isAuthEnabled() || isAuthenticated();
      allow write: if !isAuthEnabled() || isAdmin();
    }
  }
}
```

### How the Toggle Works

| `config/auth_settings.authEnabled` | Auth Behavior |
|---|---|
| `false` | **All access allowed** — no login needed |
| `true` | **Auth enforced** — reads need login, writes need admin |

### What Admins Can Do (always)
- Read/write **everything** regardless of toggle
- Modify `config/auth_settings` (to toggle auth on/off)
- Manage `user_roles`

### What Regular Users Can Do (only when `authEnabled == true`)
- **Read** any document (unless you add specific read restrictions)
- **Cannot write** anything (admin-only writes)

---

## 📋 STEP 5: Deploy Rules via Firebase CLI (Optional/Alternative)

If you prefer CLI over the Console:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Switch to project
firebase use starium-rafa-app

# Initialize (if not already)
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

Create a `firestore.rules` file in your project:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthEnabled() {
      return get(/databases/$(database)/documents/config/auth_settings).data.authEnabled == true;
    }
    function isAuthenticated() {
      return request.auth != null;
    }
    function currentEmail() {
      return request.auth.token.email;
    }
    function isAdmin() {
      return isAuthenticated() &&
        get(/databases/$(database)/documents/user_roles/$(request.auth.uid)).data.role == 'admin';
    }

    match /config/{docId} {
      allow read: if !isAuthEnabled() || isAuthenticated();
      allow write: if !isAuthEnabled() || isAdmin();
    }
    match /user_roles/{userId} {
      allow read: if !isAuthEnabled() || isAuthenticated();
      allow write: if !isAuthEnabled() || isAdmin();
    }
    match /{document=**} {
      allow read: if !isAuthEnabled() || isAuthenticated();
      allow write: if !isAuthEnabled() || isAdmin();
    }
  }
}
```

---

## ✅ Status Summary

| Task | Status | Who Does It |
|---|---|---|
| Enable Email/Password Auth | ⏳ **Manual** — needs human via Firebase Console | Human |
| Create `config/auth_settings` doc | ⏳ **Manual** — needs human via Firestore Console | Human |
| Create `user_roles` with admin | ⏳ **Manual** — needs human via Firestore Console | Human |
| Firestore Security Rules | ✅ **Ready** — copy-paste above | Human (copy-paste) |
| Deploy via CLI | ✅ **Optional** — alternative to Console | Human |

---

## 🔐 Security Notes

1. **Start with `authEnabled: true`** — so the app defaults to secure mode
2. **Protect the `user_roles` collection** — only admins should modify it
3. **Protect the `config` collection** — only admins should toggle auth settings
4. **Consider adding rate limiting** — Firebase rules alone can't rate-limit; consider Cloud Functions for sensitive operations
5. **UID-based roles** — once dammieoptimus@gmail.com signs in for the first time, get their UID from Authentication → Users, then update the `user_roles` document ID to match their UID for cleaner rules

---

*Guide created by Spark — Firebase Security Specialist for Starium Density App*