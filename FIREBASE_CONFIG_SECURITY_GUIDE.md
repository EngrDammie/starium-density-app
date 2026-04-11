# Firebase Configuration Security Guide

## Starium Density App — Hiding Your Firebase API Key

---

## Table of Contents

1. [Understanding the Problem](#understanding-the-problem)
2. [Quick Win: API Key Domain Restrictions](#quick-win-api-key-domain-restrictions)
3. [Main Solution: GitHub Secrets + GitHub Actions](#main-solution-github-secrets--github-actions)
4. [Optional: Firebase App Check](#optional-firebase-app-check)
5. [Implementation Checklist](#implementation-checklist)
6. [Rollback Instructions](#rollback-instructions)
7. [FAQ](#faq)

---

## Understanding the Problem

### What's Currently Exposed

Your Firebase configuration is hardcoded in `firebase-storage.js` (lines 2-8):

```javascript
window.firebaseConfig = window.firebaseConfig || {
    apiKey: "AIzaSyBO3Yrns0NibOzcM5EVUdQ62Std95ltZBk",
    authDomain: "starium-rafa-app.firebaseapp.com",
    projectId: "starium-rafa-app",
    storageBucket: "starium-rafa-app.firebasestorage.app",
    messagingSenderId: "743583982928",
    appId: "1:743583982928:web:e331aaa0b9e741a1537855"
};
```

Anyone can view this by opening your website and looking at the source code.

### Your Current Setup

| Component | Status |
|-----------|--------|
| Firestore Security Rules | ✅ Deployed |
| Authentication | ✅ Email/Password enabled |
| Role-based Access | ✅ Configured |
| Config Security | ❌ Exposed in source code |

### Why This Matters

While your Firestore rules protect the database, hiding the config is important because:

1. **Professional Best Practice** - Never commit secrets to code
2. **API Key Restrictions** - You can limit which domains can use your key
3. **Key Rotation** - Easier to change keys without modifying source
4. **Prevent Abuse** - Stops others from using your Firebase on their sites

---

## Quick Win: API Key Domain Restrictions ⭐ Do This First!

This takes **5 minutes** and provides immediate protection.

### Important: You Must Use Google Cloud Console

The Firebase Console no longer hosts API key settings. You must use **Google Cloud Console** instead.

### Steps

1. **Go to Google Cloud Console**:
   - Visit: https://console.cloud.google.com/
   - Select project: **starium-rafa-app**

2. **Navigate to API Keys**:
   - In the search bar, type "API Keys" or go to **APIs & Services** → **Credentials**

3. **Find your Browser API Key**:
   - Look for "Browser key (auto-created by Firebase)" 
   - Click on the key name to edit it

4. **Set Application Restrictions** (Critical Step!):
   - Under "Application restrictions", select **HTTP referrers (websites)**

5. **Add Website Restrictions** (Most People Miss This!):
   - For each domain, you **must add TWO URLs**:
     - Domain without wildcard: `yourdomain.example.com`
     - Domain with wildcard: `yourdomain.example.com/*`
   
   - Add all eight for your app (including local testing):
     ```
     engrdammie.github.io
     engrdammie.github.io/*
     starium-density-app.firebaseapp.com
     starium-density-app.firebaseapp.com/*
     127.0.0.1
     127.0.0.1/*
     localhost
     localhost/*
     ```

6. **Click Save**

7. **Wait 5 minutes** for changes to propagate

### Result
Even if someone steals your API key, they **cannot** use it on their own websites (for Auth API). 

### Limitations
- HTTP referrer restrictions **can be spoofed** by determined attackers
- They mainly work for Firebase Auth; Firestore may not enforce them
- This is a useful layer but not bulletproof protection

### For Maximum Security
Combine this with the GitHub Secrets approach (below) to remove the API key from your source code entirely, then add Firebase App Check for additional protection.

---

## Main Solution: GitHub Secrets + GitHub Actions

This is the recommended approach. Here's why:

| Aspect | Before | After |
|--------|--------|-------|
| API Key in git | ❌ Visible | ✅ Never appears |
| Deployment | Manual | ✅ Fully automatic |
| Effort per deploy | None (already automated) | ✅ Same |
| Security | Low | High |

### How It Works

1. Store your Firebase config as encrypted "secrets" in GitHub
2. When you push code, GitHub Actions runs automatically
3. It **creates** `firebase-config.js` with the secrets injected
4. Then deploys everything to GitHub Pages

The key **never touches git** - it's added only during the deployment process.

---

## Implementation Steps

### Step 1: Add Secrets to GitHub

1. Go to: `https://github.com/EngrDammie/starium-density-app/settings/secrets/actions`
2. Click **New repository secret** and add each of these:

| Secret Name | Value |
|-------------|-------|
| FIREBASE_API_KEY | `AIzaSyBO3Yrns0NibOzcM5EVUdQ62Std95ltZBk` |
| FIREBASE_AUTH_DOMAIN | `starium-rafa-app.firebaseapp.com` |
| FIREBASE_PROJECT_ID | `starium-rafa-app` |
| FIREBASE_STORAGE_BUCKET | `starium-rafa-app.firebasestorage.app` |
| FIREBASE_MESSAGING_SENDER_ID | `743583982928` |
| FIREBASE_APP_ID | `1:743583982928:web:e331aaa0b9e741a1537855` |

### Step 2: Update .gitignore

Create or edit `.gitignore` in your repo root:

```
# Firebase config (created during deployment)
firebase-config.js
```

### Step 3: Modify firebase-storage.js

Edit `firebase-storage.js` - replace lines 2-9 from:

```javascript
window.firebaseConfig = window.firebaseConfig || {
    apiKey: "AIzaSyBO3Yrns0NibOzcM5EVUdQ62Std95ltZBk",
    authDomain: "starium-rafa-app.firebaseapp.com",
    projectId: "starium-rafa-app",
    storageBucket: "starium-rafa-app.firebasestorage.app",
    messagingSenderId: "743583982928",
    appId: "1:743583982928:web:e331aaa0b9e741a1537855"
};
```

To:

```javascript
// Config is loaded from firebase-config.js (created by GitHub Actions)
// This file should NOT contain the actual config values
if (!window.firebaseConfig) {
    console.error('Firebase config not found!');
    window.firebaseConfig = {
        apiKey: "PLACEHOLDER",
        authDomain: "PLACEHOLDER",
        projectId: "PLACEHOLDER",
        storageBucket: "PLACEHOLDER",
        messagingSenderId: "PLACEHOLDER",
        appId: "PLACEHOLDER"
    };
}
```

### Step 4: Create/Update GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Create Firebase Config File
        run: |
          cat > firebase-config.js << 'EOF'
          window.firebaseConfig = {
            apiKey: "${{ secrets.FIREBASE_API_KEY }}",
            authDomain: "${{ secrets.FIREBASE_AUTH_DOMAIN }}",
            projectId: "${{ secrets.FIREBASE_PROJECT_ID }}",
            storageBucket: "${{ secrets.FIREBASE_STORAGE_BUCKET }}",
            messagingSenderId: "${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}",
            appId: "${{ secrets.FIREBASE_APP_ID }}"
          };
          EOF

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Step 5: Update All HTML Files

In every HTML file, ensure the config loads **before** firebase-storage.js:

```html
<!-- DO THIS - load config first -->
<script src="firebase-config.js"></script>
<script src="firebase-storage.js"></script>
```

Files that need updating:
- index.html
- level9-exec.html
- bot-exec.html
- admin.html
- reports.html
- login.html
- user-management.html
- change-password.html
- machine-admin.html

### Step 6: Test

1. Make a small change to any file
2. Commit and push to main
3. Go to GitHub → Actions tab
4. Watch the deployment run
5. Once complete, visit your deployed site
6. Verify everything works

---

## Optional: Firebase App Check (Extra Security)

This adds **another layer of protection** beyond Firestore rules and API key restrictions.

### How It Works
Firebase App Check verifies that requests come from your legitimate app. Even if someone steals your API key, they can't make requests without passing App Check.

### Steps

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project **starium-rafa-app**
3. On the left sidebar, click **App Check** (under "Build")
4. Click **Get Started**
5. Under "Web", click **Register**
6. Enter your site name: `Starium Density App`
7. For "Public API Key", enter: `AIzaSyBO3Yrns0NibOzcM5EVUdQ62Std95ltZBk`
8. Under "Provider configuration", select "reCAPTCHA v3"
9. Click **Register**
10. (Optional) Click **Enforce** after testing

### Add to Your Code

In `firebase-storage.js`, after Firebase initialization:

```javascript
// Add App Check (after Firebase init)
if (window.app) {
    firebase.appCheck().activate(
        'your-site-key-from-firebase-console',
        true  // Set to false in production after testing
    );
}
```

### Important Notes
- App Check has a **free tier** (10K invocations/month)
- If users report issues, you can temporarily "pause enforcement"
- Test thoroughly before enforcing in production

---

## Implementation Checklist

| Step | Action | Time |
|------|--------|------|
| ☐ 1 | Add API Key Domain Restrictions (Quick Win) | 2 min |
| ☐ 2 | Add GitHub Secrets (6 secrets) | 5 min |
| ☐ 3 | Update firebase-storage.js | 2 min |
| ☐ 4 | Create/update deploy.yml | 5 min |
| ☐ 5 | Update all HTML files (9 files) | 5 min |
| ☐ 6 | Test deployment | 5 min |

**Total: ~24 minutes**

---

## Rollback Instructions

If something goes wrong:

### Quick Rollback
```bash
git revert HEAD
git push origin main
```

### Manual Fix
1. Edit `firebase-storage.js` to add back the hardcoded config
2. Commit and push

### Disable GitHub Actions
1. Go to GitHub → Settings → Pages
2. Under "Build and deployment", select "Deploy from a branch"
3. Choose your main branch and folder (/)

---

## FAQ

### Q: Will this break my existing deployment?

A: No, if done correctly. The workflow creates the config during deployment, so your site will work exactly as before - just more secure.

### Q: Can I use different configs for development and production?

A: Yes! You can set up GitHub environments with different secrets.

### Q: Does this affect my Firestore rules?

A: No. Your existing Firestore security rules continue to work exactly the same.

### Q: How do I know it's working?

A:
1. Check GitHub Actions after push - should succeed
2. Visit your site - should work normally
3. Check git history - should NOT see API key
4. Check browser DevTools → Sources - WILL see API key (that's expected in browser)

### Q: What if I need to rotate my API key?

A: Just update the secret in GitHub and push again. No code changes needed!

---

## Summary

By following this guide, you will:

1. ✅ **Block API key abuse** on other websites (Quick Win)
2. ✅ **Remove API key from git history** (GitHub Secrets)
3. ✅ **Fully automate deployment** with no manual steps
4. ✅ **Optionally add maximum security** (App Check)

---

*Guide created for Starium Density App*
*Last updated: March 2026*
