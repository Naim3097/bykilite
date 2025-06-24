# 🔄 BYKI LITE - Data Migration Guide
## User-Scoped Data Migration Strategy

---

## 📋 Table of Contents
1. [Migration Overview](#migration-overview)
2. [Pre-Migration Checklist](#pre-migration-checklist)
3. [Demo User Identification](#demo-user-identification)
4. [Migration Steps](#migration-steps)
5. [Validation & Testing](#validation--testing)
6. [Rollback Procedures](#rollback-procedures)
7. [Post-Migration Tasks](#post-migration-tasks)

---

## 📖 Migration Overview

### **Current State**
- All data exists in **global collections** (`/parts/*`, `/customers/*`, etc.)
- All users see the **same shared data**
- Code has been updated to use **user-scoped collections** (`/users/{userId}/collections/*`)

### **Migration Goal**
- Move existing global data to **demo user scope** (`/users/{demoUserId}/collections/*`)
- Preserve all existing functionality for demo account
- Enable perfect data isolation for new users

### **Migration Architecture**
```
BEFORE (Global Data):
/parts/{partId} ← Existing data here
/customers/{customerId} ← Existing data here
/workOrders/{workOrderId} ← Existing data here
... (all collections)

AFTER (User-Scoped Data):
/users/{demoUserId}/parts/{partId} ← Data moved here
/users/{demoUserId}/customers/{customerId} ← Data moved here
/users/{demoUserId}/workOrders/{workOrderId} ← Data moved here
... (all collections)
```

---

## ✅ Pre-Migration Checklist

### **1. Code Verification**
- [ ] ✅ **Phase 1-5 Complete**: All dataService transformations implemented
- [ ] ✅ **Migration Helpers Created**: `src/utils/migrationHelpers.js` exists
- [ ] ⚠️ **Security Rules**: Keep current permissive rules (DO NOT UPDATE YET)
- [ ] 🔍 **Testing Environment**: Ensure testing on development/staging first

### **2. Data Backup**
- [ ] **Export Global Collections**: Backup all existing data
- [ ] **Document Collection Counts**: Record number of documents per collection
- [ ] **Create Restore Plan**: Prepare rollback data if needed

### **3. Firebase Auth Setup**
- [ ] **Demo User Identification**: Find actual Firebase Auth UID for demo account
- [ ] **Admin Access**: Ensure Firebase admin access for migration scripts
- [ ] **Database Permissions**: Verify write access to user-scoped paths

---

## 🔍 Demo User Identification

### **Method 1: Firebase Console**
1. Go to **Firebase Console** → **Authentication** → **Users**
2. Identify the demo account (usually first registered user)
3. Copy the **User UID** (e.g., `abc123def456ghi789`)

### **Method 2: Application Query**
```javascript
// Run this in browser console while logged in as demo user
import { auth } from './src/config/firebaseConfig';
console.log('Demo User UID:', auth.currentUser?.uid);
```

### **Method 3: Admin Query**
```javascript
// For admin access
import { getAuth } from 'firebase-admin/auth';
const listAllUsers = async () => {
  const listUsersResult = await getAuth().listUsers(1000);
  listUsersResult.users.forEach((userRecord) => {
    console.log('User:', userRecord.uid, userRecord.email);
  });
};
```

### **Demo User UID Storage**
```javascript
// Store identified demo user UID
const DEMO_USER_UID = "PASTE_DEMO_USER_UID_HERE"; // Replace with actual UID
```

---

## 🚀 Migration Steps - IMPLEMENTED TOOLS

### **Available Migration Tools**

I've implemented three migration tools for you to choose from:

#### **Tool 1: Browser-Based Migration Tool (RECOMMENDED)**
- **File**: `migration-tool.html`
- **Features**: Complete GUI interface with progress tracking, validation, and rollback
- **Usage**:
  1. Open `migration-tool.html` in any modern browser
  2. Click "Start Migration" 
  3. Monitor progress in real-time
  4. Use validation and rollback features as needed

#### **Tool 2: Browser Console Script**
- **File**: `migration-console.js`
- **Features**: Console-based migration with detailed logging
- **Usage**:
  1. Open BYKI app in browser
  2. Open Developer Console (F12)
  3. Paste the contents of `migration-console.js`
  4. Run: `await runBykiMigration()`

#### **Tool 3: Node.js Migration Script**
- **File**: `simple-migration.js`
- **Features**: Server-side migration with Firebase Admin SDK
- **Requirements**: Firebase Admin SDK setup
- **Usage**: `node simple-migration.js`

### **Quick Start Instructions**

#### **Step 1: Test Demo User**
```javascript
// Copy and paste contents of test-demo-user.js in browser console
// This verifies demo@byki.com exists and gets the UID
```

#### **Step 2: Run Migration (Choose one method)**

**Method A - Browser Tool (Easiest):**
```bash
# Option 1: Local server
python -m http.server 8080
# Then open: http://localhost:8080/migration-tool.html

# Option 2: Direct file
# Simply double-click migration-tool.html
```

**Method B - Console Script:**
```javascript
// 1. Open BYKI app in browser
// 2. Open console (F12)
// 3. Paste migration-console.js content
// 4. Run:
await runBykiMigration()
```

**Method C - Node.js:**
```bash
npm install firebase-admin
node simple-migration.js
```

### **What the Migration Does**

1. **Authenticates** as demo user (demo@byki.com)
2. **Exports** all global collections:
   - parts, customers, mechanics, workOrders
   - suppliers, purchaseOrders, expenses, payments
   - invoices, stockCounts, scheduleEvents

3. **Migrates** data to user-scoped structure:
   - FROM: `/collectionName/{docId}`
   - TO: `/users/{demoUserId}/collectionName/{docId}`

4. **Validates** migration success by comparing counts
5. **Provides** rollback capability if needed

### **Migration Results**

After successful migration:
- All demo user data will be accessible under `/users/{demoUserId}/`
- Original global collections remain untouched (for safety)
- New users will see empty collections (data isolation achieved)
- Migration tool provides detailed success/failure reporting
          const userDocRef = doc(db, 'users', DEMO_USER_UID, collectionName, docSnap.id);
          batch.set(userDocRef, docSnap.data());
        });
        
        await batch.commit();
        migratedCount += batchDocs.length;
        console.log(`   📦 Batch ${Math.floor(i/batchSize) + 1}: ${batchDocs.length} documents`);
      }
      
      migrationResults[collectionName] = { 
        count: migratedCount, 
        status: 'success',
        originalCount: docs.length
      };
      
      console.log(`✅ ${collectionName}: ${migratedCount} documents migrated`);
      
    } catch (error) {
      console.error(`❌ ${collectionName} migration failed:`, error);
      migrationResults[collectionName] = { 
        count: 0, 
        status: 'failed', 
        error: error.message 
      };
    }
  }
  
  return migrationResults;
};
```

#### **2.2: Migration Execution**
```javascript
const runMigration = async () => {
  console.log('🚀 STARTING DATA MIGRATION');
  console.log(`📍 Demo User UID: ${DEMO_USER_UID}`);
  console.log('⏰ Started at:', new Date().toISOString());
  
  try {
    const results = await migrateToUserScoped();
    
    console.log('\n📊 MIGRATION RESULTS:');
    Object.keys(results).forEach(collection => {
      const result = results[collection];
      const status = result.status === 'success' ? '✅' : 
                    result.status === 'empty' ? '⚪' : '❌';
      console.log(`${status} ${collection}: ${result.count} documents (${result.status})`);
    });
    
    const totalMigrated = Object.values(results)
      .filter(r => r.status === 'success')
      .reduce((sum, r) => sum + r.count, 0);
    
    console.log(`\n🎯 TOTAL MIGRATED: ${totalMigrated} documents`);
    console.log('⏰ Completed at:', new Date().toISOString());
    
    return results;
    
  } catch (error) {
    console.error('💥 MIGRATION FAILED:', error);
    throw error;
  }
};
```

### **Step 3: Post-Migration Validation**

#### **3.1: Data Integrity Check**
```javascript
const validateMigration = async () => {
  console.log('\n🔍 VALIDATING MIGRATION...');
  
  const collections = [
    'parts', 'customers', 'mechanics', 'workOrders', 
    'suppliers', 'purchaseOrders', 'invoices', 'orderItems',
    'schedules', 'stockCounts', 'expenses', 'commissions'
  ];
  
  const validation = {};
  
  for (const collectionName of collections) {
    // Count original documents
    const originalSnapshot = await getDocs(collection(db, collectionName));
    const originalCount = originalSnapshot.size;
    
    // Count migrated documents
    const userSnapshot = await getDocs(collection(db, 'users', DEMO_USER_UID, collectionName));
    const migratedCount = userSnapshot.size;
    
    validation[collectionName] = {
      original: originalCount,
      migrated: migratedCount,
      match: originalCount === migratedCount
    };
    
    const status = validation[collectionName].match ? '✅' : '❌';
    console.log(`${status} ${collectionName}: ${originalCount} → ${migratedCount}`);
  }
  
  const allMatch = Object.values(validation).every(v => v.match);
  console.log(`\n${allMatch ? '✅' : '❌'} MIGRATION VALIDATION: ${allMatch ? 'PASSED' : 'FAILED'}`);
  
  return validation;
};
```

#### **3.2: Sample Data Verification**
```javascript
const verifySampleData = async () => {
  console.log('\n🔬 SAMPLE DATA VERIFICATION...');
  
  try {
    // Check a few sample documents
    const sampleChecks = [
      { collection: 'parts', field: 'name' },
      { collection: 'customers', field: 'name' },
      { collection: 'workOrders', field: 'description' }
    ];
    
    for (const check of sampleChecks) {
      const userSnapshot = await getDocs(collection(db, 'users', DEMO_USER_UID, check.collection));
      if (!userSnapshot.empty) {
        const sampleDoc = userSnapshot.docs[0];
        const data = sampleDoc.data();
        console.log(`✅ ${check.collection} sample:`, {
          id: sampleDoc.id,
          [check.field]: data[check.field],
          hasData: Object.keys(data).length > 0
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Sample verification failed:', error);
  }
};
```

---

## 🧪 Validation & Testing

### **Test 1: Demo Account Functionality**
```javascript
// Test demo account can access migrated data
const testDemoAccount = async () => {
  console.log('\n🧪 TESTING DEMO ACCOUNT...');
  
  // Login as demo user (manual step)
  // Then run these checks in browser console:
  
  // Test data access
  import { getParts, getCustomers, getWorkOrders } from './src/services/dataService';
  
  try {
    const parts = await getParts();
    const customers = await getCustomers();
    const workOrders = await getWorkOrders();
    
    console.log('✅ Demo account data access:');
    console.log(`   Parts: ${parts.length}`);
    console.log(`   Customers: ${customers.length}`);
    console.log(`   Work Orders: ${workOrders.length}`);
    
    return parts.length > 0 || customers.length > 0 || workOrders.length > 0;
    
  } catch (error) {
    console.error('❌ Demo account test failed:', error);
    return false;
  }
};
```

### **Test 2: New User Isolation**
```javascript
// Test new user sees empty workspace
const testNewUserIsolation = async () => {
  console.log('\n🧪 TESTING NEW USER ISOLATION...');
  
  // Create new test account (manual step)
  // Login as new user and run:
  
  import { getParts, getCustomers } from './src/services/dataService';
  
  try {
    const parts = await getParts();
    const customers = await getCustomers();
    
    const isEmpty = parts.length === 0 && customers.length === 0;
    console.log(`${isEmpty ? '✅' : '❌'} New user isolation:`, {
      parts: parts.length,
      customers: customers.length,
      isolated: isEmpty
    });
    
    return isEmpty;
    
  } catch (error) {
    console.error('❌ New user test failed:', error);
    return false;
  }
};
```

### **Test 3: Cross-User Data Creation**
```javascript
// Test users can create their own data without interference
const testUserDataCreation = async () => {
  console.log('\n🧪 TESTING USER DATA CREATION...');
  
  // As User A: Create a part
  // As User B: Check they don't see User A's part
  // As User A: Check they still see their part
  
  // Implementation depends on having test accounts set up
  // Manual verification recommended for this test
};
```

---

## 🔙 Rollback Procedures

### **Emergency Rollback Plan**

#### **Option 1: Code Rollback (Recommended)**
```javascript
// Revert dataService.js to global collection access
// Keep user-scoped data intact for future use
// Restore original functionality immediately

const rollbackDataService = () => {
  console.log('🔄 ROLLING BACK DATA SERVICE...');
  
  // Manual step: Restore dataService.js from git backup
  // git checkout HEAD~1 -- src/services/dataService.js
  
  console.log('✅ DataService rolled back to global collections');
  console.log('📝 User-scoped data preserved for future migration');
};
```

#### **Option 2: Data Restoration (If Needed)**
```javascript
// Restore from backup if user-scoped migration failed
const restoreFromBackup = async (backupFile = './data-backup.json') => {
  console.log('🔄 RESTORING FROM BACKUP...');
  
  const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  
  for (const [collectionName, documents] of Object.entries(backup)) {
    console.log(`Restoring ${collectionName}...`);
    
    const batch = writeBatch(db);
    documents.forEach(({ id, data }) => {
      const docRef = doc(db, collectionName, id);
      batch.set(docRef, data);
    });
    
    await batch.commit();
    console.log(`✅ Restored ${documents.length} ${collectionName} documents`);
  }
  
  console.log('✅ BACKUP RESTORATION COMPLETE');
};
```

### **Rollback Decision Matrix**
| Scenario | Action | Impact |
|----------|--------|---------|
| Migration fails partially | Code rollback + retry | Zero downtime |
| Demo user can't access data | Data restoration | Minimal downtime |
| Performance issues | Code rollback | Zero downtime |
| Security concerns | Code rollback | Zero downtime |

---

## 📋 Post-Migration Tasks

### **1. Cleanup (Optional)**
```javascript
// After confirming migration success, optionally clean up global collections
const cleanupGlobalCollections = async () => {
  console.log('⚠️  WARNING: This will delete global collections!');
  console.log('🔒 Only run after confirming migration success');
  
  // Manual confirmation required
  const confirmed = confirm('Delete global collections? This cannot be undone!');
  if (!confirmed) return;
  
  const collections = ['parts', 'customers', 'mechanics', 'workOrders'];
  
  for (const collectionName of collections) {
    const snapshot = await getDocs(collection(db, collectionName));
    const batch = writeBatch(db);
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`🗑️  Deleted global ${collectionName} collection`);
  }
};
```

### **2. Performance Monitoring**
```javascript
// Monitor query performance after migration
const monitorPerformance = async () => {
  console.log('📊 MONITORING POST-MIGRATION PERFORMANCE...');
  
  const startTime = performance.now();
  const parts = await getParts();
  const endTime = performance.now();
  
  console.log(`⏱️  getParts() took ${endTime - startTime} ms`);
  console.log(`📦 Retrieved ${parts.length} parts`);
  
  // Compare with pre-migration benchmarks
};
```

### **3. Documentation Update**
- [ ] Update README.md with new user-scoped architecture
- [ ] Document demo user UID for future reference
- [ ] Update API documentation if needed
- [ ] Create user onboarding guide for isolated workspaces

---

## 📊 Migration Summary Template

```
🎯 BYKI LITE DATA MIGRATION REPORT
=====================================

📅 Migration Date: [DATE]
👤 Demo User UID: [DEMO_UID]
⏰ Duration: [START_TIME] → [END_TIME]

📊 MIGRATION RESULTS:
✅ Parts: [COUNT] documents
✅ Customers: [COUNT] documents  
✅ Mechanics: [COUNT] documents
✅ Work Orders: [COUNT] documents
✅ Suppliers: [COUNT] documents
✅ Purchase Orders: [COUNT] documents
✅ Invoices: [COUNT] documents
✅ Order Items: [COUNT] documents
✅ Schedules: [COUNT] documents
✅ Stock Counts: [COUNT] documents
✅ Expenses: [COUNT] documents
✅ Commissions: [COUNT] documents

🎯 TOTAL MIGRATED: [TOTAL] documents

🧪 VALIDATION TESTS:
✅ Demo account functionality: PASSED
✅ New user isolation: PASSED  
✅ Data integrity check: PASSED
✅ Sample data verification: PASSED

🔐 NEXT STEPS:
□ Deploy to production
□ Update security rules
□ Monitor performance
□ User acceptance testing

🚀 STATUS: MIGRATION SUCCESSFUL
```

---

**🔒 SAFETY FIRST**: Always test migration on development/staging environment before production deployment.

**📝 DOCUMENTATION**: Keep detailed logs of all migration steps and results for audit purposes.

**🔄 REVERSIBILITY**: Maintain ability to rollback quickly if issues arise.
