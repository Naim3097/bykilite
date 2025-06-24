/**
 * BYKI LITE Data Migration Script
 * Migrates global collections to user-scoped subcollections
 * 
 * Usage: node migrate-data.js
 * 
 * This script will:
 * 1. Login as demo user to get UID
 * 2. Export all global collections
 * 3. Migrate data to /users/{userId}/ subcollections
 * 4. Validate migration
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
let app;
try {
  // Try to use service account if available
  const serviceAccount = require('./serviceAccountKey.json');
  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'sparepart-management-system'
  });
} catch (error) {
  console.log('⚠️ Service account not found, using default credentials');
  // Fallback to default credentials (requires GOOGLE_APPLICATION_CREDENTIALS env var)
  app = admin.initializeApp({
    projectId: 'sparepart-management-system'
  });
}

const db = admin.firestore();

// Demo user credentials
const DEMO_EMAIL = 'demo@byki.com';
const DEMO_PASSWORD = 'demo123456';

// Collections to migrate
const COLLECTIONS_TO_MIGRATE = [
  'parts',
  'customers', 
  'mechanics',
  'workOrders',
  'suppliers',
  'purchaseOrders',
  'expenses',
  'payments',
  'invoices',
  'stockCounts',
  'scheduleEvents'
];

// Backup directory
const BACKUP_DIR = './migration-backup';

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Get demo user UID by email
 */
async function getDemoUserUID() {
  try {
    console.log('🔍 Finding demo user...');
    const userRecord = await admin.auth().getUserByEmail(DEMO_EMAIL);
    console.log('✅ Demo user found:', userRecord.uid);
    return userRecord.uid;
  } catch (error) {
    console.error('❌ Error finding demo user:', error.message);
    console.log('💡 Make sure demo user exists with email:', DEMO_EMAIL);
    throw error;
  }
}

/**
 * Export collection data to JSON file
 */
async function exportCollection(collectionName) {
  try {
    console.log(`📤 Exporting ${collectionName}...`);
    const snapshot = await db.collection(collectionName).get();
    const documents = [];
    
    snapshot.forEach(doc => {
      documents.push({
        id: doc.id,
        data: doc.data()
      });
    });
    
    const backupFile = path.join(BACKUP_DIR, `${collectionName}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(documents, null, 2));
    
    console.log(`✅ Exported ${documents.length} documents from ${collectionName}`);
    return documents;
  } catch (error) {
    console.error(`❌ Error exporting ${collectionName}:`, error.message);
    throw error;
  }
}

/**
 * Migrate collection data to user-scoped subcollection
 */
async function migrateCollection(collectionName, documents, userId) {
  try {
    console.log(`🔄 Migrating ${collectionName} to user-scoped collection...`);
    
    if (documents.length === 0) {
      console.log(`⚠️ No documents to migrate for ${collectionName}`);
      return;
    }
    
    const batch = db.batch();
    const userCollectionRef = db.collection('users').doc(userId).collection(collectionName);
    
    documents.forEach(doc => {
      const docRef = userCollectionRef.doc(doc.id);
      batch.set(docRef, doc.data);
    });
    
    await batch.commit();
    console.log(`✅ Migrated ${documents.length} documents to users/${userId}/${collectionName}`);
  } catch (error) {
    console.error(`❌ Error migrating ${collectionName}:`, error.message);
    throw error;
  }
}

/**
 * Validate migration by comparing document counts
 */
async function validateMigration(collectionName, originalCount, userId) {
  try {
    console.log(`🔍 Validating ${collectionName}...`);
    
    const userCollectionRef = db.collection('users').doc(userId).collection(collectionName);
    const snapshot = await userCollectionRef.get();
    const migratedCount = snapshot.size;
    
    if (originalCount === migratedCount) {
      console.log(`✅ ${collectionName}: ${originalCount} → ${migratedCount} ✓`);
      return true;
    } else {
      console.error(`❌ ${collectionName}: ${originalCount} → ${migratedCount} ✗`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error validating ${collectionName}:`, error.message);
    return false;
  }
}

/**
 * Sample validation - check a few documents
 */
async function sampleValidation(collectionName, originalDocs, userId) {
  try {
    if (originalDocs.length === 0) return true;
    
    console.log(`🔍 Sample validation for ${collectionName}...`);
    const sampleDoc = originalDocs[0];
    
    const userDocRef = db.collection('users').doc(userId).collection(collectionName).doc(sampleDoc.id);
    const migratedDoc = await userDocRef.get();
    
    if (migratedDoc.exists) {
      console.log(`✅ Sample document ${sampleDoc.id} migrated successfully`);
      return true;
    } else {
      console.error(`❌ Sample document ${sampleDoc.id} not found in migrated collection`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error in sample validation for ${collectionName}:`, error.message);
    return false;
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  try {
    console.log('🚀 Starting BYKI LITE Data Migration...');
    console.log('=====================================');
    
    // Step 1: Get demo user UID
    const demoUserId = await getDemoUserUID();
    
    // Step 2: Export and backup all collections
    console.log('\n📦 STEP 2: Exporting collections...');
    const exportedData = {};
    
    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
      exportedData[collectionName] = await exportCollection(collectionName);
    }
    
    // Step 3: Migrate collections
    console.log('\n🔄 STEP 3: Migrating collections...');
    
    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
      await migrateCollection(collectionName, exportedData[collectionName], demoUserId);
    }
    
    // Step 4: Validation
    console.log('\n✅ STEP 4: Validating migration...');
    
    let allValid = true;
    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
      const originalCount = exportedData[collectionName].length;
      const isValid = await validateMigration(collectionName, originalCount, demoUserId);
      const sampleValid = await sampleValidation(collectionName, exportedData[collectionName], demoUserId);
      
      if (!isValid || !sampleValid) {
        allValid = false;
      }
    }
    
    // Summary
    console.log('\n📊 MIGRATION SUMMARY');
    console.log('====================');
    console.log(`Demo User ID: ${demoUserId}`);
    console.log(`Backup Location: ${BACKUP_DIR}`);
    console.log(`Collections Migrated: ${COLLECTIONS_TO_MIGRATE.length}`);
    
    let totalDocuments = 0;
    COLLECTIONS_TO_MIGRATE.forEach(collectionName => {
      const count = exportedData[collectionName].length;
      totalDocuments += count;
      console.log(`  - ${collectionName}: ${count} documents`);
    });
    
    console.log(`Total Documents Migrated: ${totalDocuments}`);
    console.log(`Migration Status: ${allValid ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    if (allValid) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('💡 Next steps:');
      console.log('   1. Test the application with demo user');
      console.log('   2. Test creating a new user account');
      console.log('   3. Update Firestore security rules');
      console.log('   4. Clean up global collections (optional)');
    } else {
      console.log('\n⚠️ Migration completed with errors!');
      console.log('💡 Please check the errors above and consider rollback if needed');
    }
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    console.log('\n🔄 Rollback options:');
    console.log('   1. Check backup files in:', BACKUP_DIR);
    console.log('   2. Restore from backup if needed');
    console.log('   3. Review error logs above');
    throw error;
  }
}

/**
 * Emergency rollback function
 */
async function rollbackMigration(userId) {
  try {
    console.log('🔄 Starting rollback process...');
    
    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
      console.log(`🗑️ Cleaning up ${collectionName}...`);
      const userCollectionRef = db.collection('users').doc(userId).collection(collectionName);
      const snapshot = await userCollectionRef.get();
      
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`✅ Cleaned up users/${userId}/${collectionName}`);
    }
    
    console.log('✅ Rollback completed!');
  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
    throw error;
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('\n✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error);
      process.exit(1);
    });
}

// Export functions for manual use
module.exports = {
  runMigration,
  rollbackMigration,
  getDemoUserUID,
  exportCollection,
  migrateCollection,
  validateMigration
};
