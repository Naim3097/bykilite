# BYKI LITE Data Migration - Step-by-Step Manual Guide

## 🚀 Quick Start Options

You have several options to run the data migration. Choose the one that works best for your setup:

### Option 1: Browser-Based Migration Tool (Recommended for most users)

1. **Open the migration tool:**
   ```bash
   # Option A: Using Python (if available)
   python -m http.server 8080
   # Then open: http://localhost:8080/migration-tool.html
   
   # Option B: Direct file access
   # Simply open migration-tool.html in your browser
   ```

2. **Run the migration:**
   - Click "Start Migration" in the web interface
   - Monitor progress and logs
   - Validate results when complete

### Option 2: Browser Console Migration (For developers)

1. **Open BYKI app in browser**
2. **Open Developer Console (F12)**
3. **Copy and paste the migration-console.js script**
4. **Run:** `await runBykiMigration()`

### Option 3: Node.js Migration Script (For advanced users)

1. **Set up Firebase Admin:**
   ```bash
   # Install dependencies
   npm install firebase-admin
   
   # Set up authentication (one of these methods):
   # Method A: Service Account Key
   # Download service account key from Firebase Console
   # Save as serviceAccountKey.json in project root
   
   # Method B: Environment Variable
   set GOOGLE_APPLICATION_CREDENTIALS=path\to\serviceAccountKey.json
   
   # Method C: Default credentials (if running on Google Cloud)
   # Uses default service account
   ```

2. **Run migration:**
   ```bash
   node simple-migration.js
   ```

## 📋 Pre-Migration Checklist

Before running any migration:

- [ ] **Backup your data** (Firebase Console > Firestore > Export)
- [ ] **Verify demo user exists:** demo@byki.com with password: demo123456
- [ ] **Test app functionality** to ensure it's working
- [ ] **Have rollback plan ready** (keep backup files)

## 🔍 What the Migration Does

1. **Finds the demo user** (demo@byki.com) and gets their UID
2. **Exports all global collections:**
   - parts, customers, mechanics, workOrders
   - suppliers, purchaseOrders, expenses, payments
   - invoices, stockCounts, scheduleEvents

3. **Migrates data to user-scoped structure:**
   - FROM: `/parts/{docId}`
   - TO: `/users/{demoUserId}/parts/{docId}`

4. **Validates migration** by comparing document counts

## ✅ Post-Migration Validation

After migration completes:

1. **Test with demo user:**
   - Login with demo@byki.com / demo123456
   - Verify all data is visible and functional
   - Test CRUD operations (create, read, update, delete)

2. **Test with new user:**
   - Create a new user account
   - Verify they see empty collections (data isolation)
   - Test creating new data for the new user

3. **Verify data structure:**
   - Check Firestore console
   - Confirm data is under `/users/{userId}/...`
   - Original global collections should still exist (until cleanup)

## 🔄 Rollback Procedure

If something goes wrong:

1. **Using migration tools:**
   ```javascript
   // In browser console after loading migration-console.js
   await rollbackBykiMigration('DEMO_USER_ID_HERE')
   
   // Or in migration tool web interface
   // Click "Rollback Migration" button
   ```

2. **Manual rollback:**
   - Delete the `/users/{demoUserId}` document and all subcollections
   - Original global data remains untouched

3. **From backup:**
   - Use Firebase Console import feature
   - Restore from the backup files created before migration

## 🛡️ Security Rules Update

After successful migration and testing, update Firestore rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User-scoped data access
    match /users/{userId}/{collection}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Deny access to global collections (optional - for cleanup phase)
    match /{collection}/{document=**} {
      allow read, write: if false; // Deny all access to global collections
    }
  }
}
```

## 🧹 Cleanup (Optional)

After confirming everything works:

1. **Delete global collections** (if desired)
2. **Remove old demo data** that's no longer needed
3. **Update documentation** to reflect new structure

## ⚠️ Troubleshooting

### Common Issues:

1. **Demo user not found:**
   - Create demo user: demo@byki.com / demo123456
   - Use the demoAccountSetup.js utility

2. **Permission denied:**
   - Check Firebase project access
   - Verify authentication setup
   - Update security rules if needed

3. **Migration incomplete:**
   - Check console logs for specific errors
   - Use validation tools to identify missing data
   - Consider partial re-migration of specific collections

4. **Rate limiting:**
   - Migration includes delays to avoid rate limits
   - If issues persist, increase delays in the migration script

### Getting Help:

- Check browser console for detailed error messages
- Verify Firebase project configuration
- Ensure all dependencies are installed
- Test with a small dataset first if possible

## 📞 Support

If you encounter issues:

1. Check the detailed logs in the migration tool
2. Verify all prerequisites are met
3. Try the browser-based migration tool first (simplest option)
4. Keep backups until migration is fully validated

---

**Remember: This migration is designed to be safe with proper backups, but always test thoroughly before deploying to production!**
