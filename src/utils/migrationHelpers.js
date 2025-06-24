// ============================================================================
// 🔄 MIGRATION HELPERS - Phase 1 Implementation
// ============================================================================
// 
// Migration utilities to help transition from global collections to user-scoped
// collections while preserving existing data and ensuring smooth transition.
//
// IMPORTANT: Run these migration functions CAREFULLY and preferably in a 
// development environment first.
// ============================================================================

import { 
  collection, 
  doc, 
  getDocs, 
  writeBatch,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';

// ============================================================================
// 🔐 MIGRATION AUTHENTICATION HELPERS
// ============================================================================

/**
 * Get the demo user's Firebase Auth UID
 * NOTE: This needs to be updated with the actual demo user UID from Firebase Auth
 * You can find this in Firebase Console > Authentication > Users
 */
const DEMO_USER_UID = 'REPLACE_WITH_ACTUAL_DEMO_USER_UID';

/**
 * Helper function to validate demo user UID is set
 */
const validateDemoUserUID = () => {
  if (DEMO_USER_UID === 'REPLACE_WITH_ACTUAL_DEMO_USER_UID') {
    throw new Error('Demo user UID must be set before running migration. Update DEMO_USER_UID in migrationHelpers.js');
  }
};

// ============================================================================
// 📊 MIGRATION DATA HELPERS
// ============================================================================

/**
 * Get count of documents in a global collection
 * @param {string} collectionName - Name of the collection
 * @returns {Promise<number>} Number of documents
 */
export const getGlobalCollectionCount = async (collectionName) => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.size;
  } catch (error) {
    console.error(`Error counting ${collectionName}:`, error);
    return 0;
  }
};

/**
 * Get count of documents in a user-scoped collection
 * @param {string} userId - User ID
 * @param {string} collectionName - Name of the collection
 * @returns {Promise<number>} Number of documents
 */
export const getUserCollectionCount = async (userId, collectionName) => {
  try {
    const querySnapshot = await getDocs(collection(db, 'users', userId, collectionName));
    return querySnapshot.size;
  } catch (error) {
    console.error(`Error counting user ${userId} ${collectionName}:`, error);
    return 0;
  }
};

/**
 * Get migration status for all collections
 * @returns {Promise<Object>} Migration status report
 */
export const getMigrationStatus = async () => {
  validateDemoUserUID();
  
  const collections = [
    'parts', 'customers', 'mechanics', 'workOrders', 
    'suppliers', 'purchaseOrders', 'invoices', 'orderItems',
    'schedules', 'stockCounts', 'expenses'
  ];
  
  const status = {};
  
  for (const collectionName of collections) {
    const globalCount = await getGlobalCollectionCount(collectionName);
    const userCount = await getUserCollectionCount(DEMO_USER_UID, collectionName);
    
    status[collectionName] = {
      globalCount,
      userCount,
      migrated: userCount > 0,
      needsMigration: globalCount > 0 && userCount === 0
    };
  }
  
  return {
    demoUserUID: DEMO_USER_UID,
    collections: status,
    summary: {
      totalCollections: collections.length,
      migratedCollections: Object.values(status).filter(s => s.migrated).length,
      pendingCollections: Object.values(status).filter(s => s.needsMigration).length
    }
  };
};

// ============================================================================
// 🔄 MIGRATION OPERATIONS
// ============================================================================

/**
 * Migrate a single collection from global to user-scoped
 * @param {string} collectionName - Name of the collection to migrate
 * @param {string} targetUserId - Target user ID (defaults to demo user)
 * @param {boolean} dryRun - If true, only log what would be migrated
 * @returns {Promise<Object>} Migration result
 */
export const migrateCollection = async (collectionName, targetUserId = null, dryRun = false) => {
  try {
    validateDemoUserUID();
    const userId = targetUserId || DEMO_USER_UID;
    
    console.log(`🔄 ${dryRun ? 'DRY RUN: ' : ''}Starting migration of ${collectionName} to user ${userId}`);
    
    // Get all documents from global collection
    const globalDocs = await getDocs(collection(db, collectionName));
    const docCount = globalDocs.size;
    
    if (docCount === 0) {
      console.log(`ℹ️ No documents found in global ${collectionName} collection`);
      return { success: true, migrated: 0, skipped: 0, errors: [] };
    }
    
    console.log(`📊 Found ${docCount} documents to migrate`);
    
    if (dryRun) {
      console.log(`📋 DRY RUN: Would migrate ${docCount} documents from /${collectionName} to /users/${userId}/${collectionName}`);
      return { success: true, migrated: docCount, skipped: 0, errors: [], dryRun: true };
    }
    
    // Check if user collection already has data
    const existingDocs = await getDocs(collection(db, 'users', userId, collectionName));
    if (existingDocs.size > 0) {
      const message = `⚠️ User collection ${collectionName} already has ${existingDocs.size} documents. Skipping migration.`;
      console.log(message);
      return { success: false, migrated: 0, skipped: docCount, errors: [message] };
    }
    
    // Migrate documents in batches (Firestore batch limit is 500)
    const batchSize = 400; // Leave some room for safety
    const batches = [];
    let currentBatch = writeBatch(db);
    let batchCount = 0;
    let totalMigrated = 0;
    const errors = [];
    
    for (const docSnap of globalDocs.docs) {
      try {
        const newDocRef = doc(db, 'users', userId, collectionName, docSnap.id);
        currentBatch.set(newDocRef, docSnap.data());
        batchCount++;
        
        if (batchCount >= batchSize) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          batchCount = 0;
        }
      } catch (error) {
        errors.push(`Error preparing document ${docSnap.id}: ${error.message}`);
      }
    }
    
    // Add the last batch if it has documents
    if (batchCount > 0) {
      batches.push(currentBatch);
    }
    
    // Execute all batches
    console.log(`🚀 Executing ${batches.length} batch(es)...`);
    for (let i = 0; i < batches.length; i++) {
      try {
        await batches[i].commit();
        totalMigrated += (i === batches.length - 1) ? batchCount : batchSize;
        console.log(`✅ Batch ${i + 1}/${batches.length} completed`);
      } catch (error) {
        errors.push(`Batch ${i + 1} failed: ${error.message}`);
        console.error(`❌ Batch ${i + 1} failed:`, error);
      }
    }
    
    console.log(`🎉 Migration completed: ${totalMigrated}/${docCount} documents migrated`);
    
    return {
      success: errors.length === 0,
      migrated: totalMigrated,
      skipped: 0,
      errors,
      collectionName,
      userId
    };
    
  } catch (error) {
    console.error(`❌ Migration failed for ${collectionName}:`, error);
    return {
      success: false,
      migrated: 0,
      skipped: 0,
      errors: [error.message],
      collectionName,
      userId: targetUserId || DEMO_USER_UID
    };
  }
};

/**
 * Migrate all collections to demo user scope
 * @param {boolean} dryRun - If true, only log what would be migrated
 * @returns {Promise<Object>} Complete migration result
 */
export const migrateAllCollections = async (dryRun = false) => {
  try {
    validateDemoUserUID();
    
    console.log(`🚀 ${dryRun ? 'DRY RUN: ' : ''}Starting full migration to demo user: ${DEMO_USER_UID}`);
    
    const collections = [
      'parts', 'customers', 'mechanics', 'workOrders', 
      'suppliers', 'purchaseOrders', 'invoices', 'orderItems',
      'schedules', 'stockCounts', 'expenses'
    ];
    
    const results = [];
    let totalMigrated = 0;
    let totalErrors = 0;
    
    for (const collectionName of collections) {
      console.log(`\n--- Migrating ${collectionName} ---`);
      const result = await migrateCollection(collectionName, DEMO_USER_UID, dryRun);
      results.push(result);
      totalMigrated += result.migrated;
      totalErrors += result.errors.length;
      
      // Small delay between collections to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n🏁 Full migration ${dryRun ? 'simulation ' : ''}completed:`);
    console.log(`📊 Total migrated: ${totalMigrated} documents`);
    console.log(`❌ Total errors: ${totalErrors}`);
    
    return {
      success: totalErrors === 0,
      demoUserUID: DEMO_USER_UID,
      totalMigrated,
      totalErrors,
      results,
      dryRun
    };
    
  } catch (error) {
    console.error('❌ Full migration failed:', error);
    throw error;
  }
};

// ============================================================================
// 🧹 CLEANUP HELPERS
// ============================================================================

/**
 * WARNING: This function will DELETE all global collection data
 * Only use AFTER confirming migration was successful and system is working
 * @param {string} collectionName - Collection to clean up
 * @param {boolean} dryRun - If true, only log what would be deleted
 */
export const cleanupGlobalCollection = async (collectionName, dryRun = true) => {
  try {
    console.log(`🧹 ${dryRun ? 'DRY RUN: ' : 'WARNING: '}Cleanup of global ${collectionName} collection`);
    
    const globalDocs = await getDocs(collection(db, collectionName));
    const docCount = globalDocs.size;
    
    if (docCount === 0) {
      console.log(`ℹ️ No documents to clean up in ${collectionName}`);
      return { success: true, deleted: 0 };
    }
    
    if (dryRun) {
      console.log(`📋 DRY RUN: Would delete ${docCount} documents from /${collectionName}`);
      return { success: true, deleted: docCount, dryRun: true };
    }
    
    console.log(`⚠️ DANGER: About to delete ${docCount} documents from global collection!`);
    console.log('⚠️ Make sure migration was successful and system is working properly!');
    
    // Implementation intentionally left incomplete for safety
    // Uncomment and implement only when absolutely sure
    /*
    const batch = writeBatch(db);
    globalDocs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    */
    
    throw new Error('Cleanup function is disabled for safety. Enable manually if needed.');
    
  } catch (error) {
    console.error(`❌ Cleanup failed for ${collectionName}:`, error);
    throw error;
  }
};

// ============================================================================
// 🔍 VALIDATION HELPERS
// ============================================================================

/**
 * Validate that migration was successful by comparing data
 * @param {string} collectionName - Collection to validate
 * @param {string} userId - User ID to check
 * @returns {Promise<Object>} Validation result
 */
export const validateMigration = async (collectionName, userId = null) => {
  try {
    validateDemoUserUID();
    const targetUserId = userId || DEMO_USER_UID;
    
    const globalDocs = await getDocs(collection(db, collectionName));
    const userDocs = await getDocs(collection(db, 'users', targetUserId, collectionName));
    
    const globalCount = globalDocs.size;
    const userCount = userDocs.size;
    
    const isValid = globalCount === userCount;
    
    console.log(`🔍 Validation for ${collectionName}:`);
    console.log(`   Global: ${globalCount} documents`);
    console.log(`   User:   ${userCount} documents`);
    console.log(`   Valid:  ${isValid ? '✅' : '❌'}`);
    
    return {
      collectionName,
      userId: targetUserId,
      globalCount,
      userCount,
      isValid,
      countMatch: globalCount === userCount
    };
    
  } catch (error) {
    console.error(`❌ Validation failed for ${collectionName}:`, error);
    return {
      collectionName,
      userId: userId || DEMO_USER_UID,
      globalCount: 0,
      userCount: 0,
      isValid: false,
      error: error.message
    };
  }
};

/**
 * Validate all collections after migration
 * @returns {Promise<Object>} Complete validation result
 */
export const validateAllMigrations = async () => {
  try {
    validateDemoUserUID();
    
    const collections = [
      'parts', 'customers', 'mechanics', 'workOrders', 
      'suppliers', 'purchaseOrders', 'invoices', 'orderItems',
      'schedules', 'stockCounts', 'expenses'
    ];
    
    console.log(`🔍 Validating all migrations for user: ${DEMO_USER_UID}`);
    
    const results = [];
    let validCollections = 0;
    
    for (const collectionName of collections) {
      const result = await validateMigration(collectionName, DEMO_USER_UID);
      results.push(result);
      if (result.isValid) validCollections++;
    }
    
    const allValid = validCollections === collections.length;
    
    console.log(`\n🏁 Validation completed:`);
    console.log(`✅ Valid collections: ${validCollections}/${collections.length}`);
    console.log(`🎯 All valid: ${allValid ? '✅' : '❌'}`);
    
    return {
      demoUserUID: DEMO_USER_UID,
      totalCollections: collections.length,
      validCollections,
      allValid,
      results
    };
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    throw error;
  }
};

// ============================================================================
// 📋 MIGRATION SCRIPT HELPERS
// ============================================================================

/**
 * Complete migration workflow with safety checks
 * This is the main function to run for migration
 * @param {boolean} dryRun - If true, only simulate the migration
 * @returns {Promise<Object>} Migration workflow result
 */
export const runCompleteMigration = async (dryRun = true) => {
  try {
    console.log('🚀 Starting complete migration workflow...\n');
    
    // Step 1: Get initial status
    console.log('📊 Step 1: Getting current status...');
    const initialStatus = await getMigrationStatus();
    console.log('Initial Status:', initialStatus);
    
    // Step 2: Run migration
    console.log('\n🔄 Step 2: Running migration...');
    const migrationResult = await migrateAllCollections(dryRun);
    
    if (!dryRun && migrationResult.success) {
      // Step 3: Validate migration (only if not dry run)
      console.log('\n🔍 Step 3: Validating migration...');
      const validationResult = await validateAllMigrations();
      
      // Step 4: Get final status
      console.log('\n📈 Step 4: Getting final status...');
      const finalStatus = await getMigrationStatus();
      
      return {
        success: migrationResult.success && validationResult.allValid,
        initialStatus,
        migrationResult,
        validationResult,
        finalStatus,
        dryRun: false
      };
    } else {
      return {
        success: migrationResult.success,
        initialStatus,
        migrationResult,
        dryRun: true
      };
    }
    
  } catch (error) {
    console.error('❌ Complete migration workflow failed:', error);
    throw error;
  }
};

// ============================================================================
// 🆘 EMERGENCY HELPERS
// ============================================================================

/**
 * Emergency function to quickly check if system is in a broken state
 * @returns {Promise<Object>} System health check
 */
export const emergencyHealthCheck = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return {
        healthy: false,
        error: 'No user authenticated',
        recommendation: 'Log in first'
      };
    }
    
    // Check if user can access their own data
    const testCollections = ['parts', 'customers', 'workOrders'];
    const checks = {};
    
    for (const collectionName of testCollections) {
      try {
        const userDocs = await getDocs(collection(db, 'users', currentUser.uid, collectionName));
        checks[collectionName] = {
          accessible: true,
          count: userDocs.size
        };
      } catch (error) {
        checks[collectionName] = {
          accessible: false,
          error: error.message
        };
      }
    }
    
    const allAccessible = Object.values(checks).every(check => check.accessible);
    
    return {
      healthy: allAccessible,
      currentUser: currentUser.uid,
      checks,
      recommendation: allAccessible ? 'System appears healthy' : 'Some collections are inaccessible'
    };
    
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      recommendation: 'Check Firebase connection and authentication'
    };
  }
};

// ============================================================================
// 📝 USAGE EXAMPLES
// ============================================================================

/*
// Example usage in browser console or migration script:

// 1. Check current migration status
import { getMigrationStatus } from './src/utils/migrationHelpers.js';
const status = await getMigrationStatus();
console.log(status);

// 2. Run a dry run migration (safe - no changes made)
import { runCompleteMigration } from './src/utils/migrationHelpers.js';
const dryRunResult = await runCompleteMigration(true);
console.log(dryRunResult);

// 3. Run actual migration (AFTER updating DEMO_USER_UID!)
const migrationResult = await runCompleteMigration(false);
console.log(migrationResult);

// 4. Emergency health check if something goes wrong
import { emergencyHealthCheck } from './src/utils/migrationHelpers.js';
const healthCheck = await emergencyHealthCheck();
console.log(healthCheck);

*/

export default {
  // Status & Validation
  getMigrationStatus,
  validateMigration,
  validateAllMigrations,
  
  // Migration Operations
  migrateCollection,
  migrateAllCollections,
  
  // Workflow
  runCompleteMigration,
  
  // Emergency
  emergencyHealthCheck,
  
  // Cleanup (disabled by default for safety)
  cleanupGlobalCollection
};
