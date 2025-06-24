/**
 * BYKI LITE Data Migration - Node.js Version
 * Simple migration script that can be run with Node.js directly
 */

// This script requires the Firebase Admin SDK
// Install with: npm install firebase-admin

const admin = require('firebase-admin');

// Initialize Firebase Admin with project ID
admin.initializeApp({
  projectId: 'sparepart-management-system'
});

const db = admin.firestore();

// Demo user email (we'll get the UID from Firebase Auth)
const DEMO_EMAIL = 'demo@byki.com';

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
 * Export and migrate a single collection
 */
async function migrateCollection(collectionName, userId) {
  try {
    console.log(`\n📤 Processing ${collectionName}...`);
    
    // Get all documents from global collection
    const globalSnapshot = await db.collection(collectionName).get();
    const documents = [];
    
    globalSnapshot.forEach(doc => {
      documents.push({
        id: doc.id,
        data: doc.data()
      });
    });
    
    console.log(`   Found ${documents.length} documents`);
    
    if (documents.length === 0) {
      console.log(`   ⚠️ No documents to migrate`);
      return { original: 0, migrated: 0 };
    }
    
    // Migrate to user-scoped collection
    console.log(`   🔄 Migrating to users/${userId}/${collectionName}...`);
    
    const batch = db.batch();
    documents.forEach(doc => {
      const userDocRef = db.collection('users').doc(userId).collection(collectionName).doc(doc.id);
      batch.set(userDocRef, doc.data);
    });
    
    await batch.commit();
    
    // Validate migration
    console.log(`   ✅ Validating migration...`);
    const userSnapshot = await db.collection('users').doc(userId).collection(collectionName).get();
    const migratedCount = userSnapshot.size;
    
    if (documents.length === migratedCount) {
      console.log(`   ✅ Success: ${documents.length} → ${migratedCount} documents`);
      return { original: documents.length, migrated: migratedCount, success: true };
    } else {
      console.log(`   ❌ Mismatch: ${documents.length} → ${migratedCount} documents`);
      return { original: documents.length, migrated: migratedCount, success: false };
    }
    
  } catch (error) {
    console.error(`   ❌ Error processing ${collectionName}:`, error.message);
    return { original: 0, migrated: 0, success: false, error: error.message };
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  try {
    console.log('🚀 BYKI LITE Data Migration Starting...');
    console.log('=====================================');
    
    // Step 1: Get demo user UID
    const demoUserId = await getDemoUserUID();
    
    // Step 2: Migrate all collections
    console.log('\n📦 Migrating collections...');
    
    const results = {};
    let totalOriginal = 0;
    let totalMigrated = 0;
    let successCount = 0;
    
    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
      const result = await migrateCollection(collectionName, demoUserId);
      results[collectionName] = result;
      
      totalOriginal += result.original;
      totalMigrated += result.migrated;
      
      if (result.success) {
        successCount++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Summary
    console.log('\n📊 MIGRATION SUMMARY');
    console.log('====================');
    console.log(`Demo User ID: ${demoUserId}`);
    console.log(`Collections Processed: ${COLLECTIONS_TO_MIGRATE.length}`);
    console.log(`Successful Migrations: ${successCount}/${COLLECTIONS_TO_MIGRATE.length}`);
    console.log(`Total Documents: ${totalOriginal} → ${totalMigrated}`);
    
    console.log('\n📋 Collection Details:');
    COLLECTIONS_TO_MIGRATE.forEach(collectionName => {
      const result = results[collectionName];
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} ${collectionName}: ${result.original} → ${result.migrated}`);
      if (result.error) {
        console.log(`      Error: ${result.error}`);
      }
    });
    
    const allSuccess = successCount === COLLECTIONS_TO_MIGRATE.length;
    console.log(`\n🎯 Overall Status: ${allSuccess ? '✅ SUCCESS' : '❌ PARTIAL/FAILED'}`);
    
    if (allSuccess) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('💡 Next steps:');
      console.log('   1. Test the application with demo user');
      console.log('   2. Test creating a new user account');
      console.log('   3. Update Firestore security rules');
      console.log('   4. Clean up global collections (optional)');
    } else {
      console.log('\n⚠️ Migration completed with some issues!');
      console.log('💡 Please review the errors above and consider running specific migrations again');
    }
    
    return {
      success: allSuccess,
      demoUserId,
      results,
      totalOriginal,
      totalMigrated
    };
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    console.log('\n🔄 Check the error above and try again');
    throw error;
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  runMigration()
    .then((result) => {
      console.log('\n✅ Migration script completed');
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigration, getDemoUserUID, migrateCollection };
