/**
 * BYKI LITE Data Migration - Browser Console Version
 * 
 * This script can be run directly in the browser console while the BYKI app is loaded.
 * It will migrate global collections to user-scoped subcollections.
 * 
 * Instructions:
 * 1. Open BYKI LITE app in browser
 * 2. Open developer console (F12)
 * 3. Copy and paste this entire script
 * 4. Run: await runBykiMigration()
 */

(async function() {
  'use strict';
  
  // Use existing Firebase instances from the app
  const { auth, db } = window;
  
  if (!auth || !db) {
    console.error('❌ Firebase auth or db not found. Make sure BYKI app is loaded.');
    return;
  }
  
  // Import Firebase functions from global context
  const { 
    signInWithEmailAndPassword,
    collection, 
    getDocs, 
    doc, 
    setDoc, 
    writeBatch,
    getDoc
  } = window.firebase || {};
  
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
  
  /**
   * Login as demo user and get UID
   */
  async function loginDemoUser() {
    try {
      console.log('🔐 Logging in as demo user...');
      const userCredential = await signInWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
      const userId = userCredential.user.uid;
      console.log('✅ Demo user logged in successfully!');
      console.log('👤 User ID:', userId);
      return userId;
    } catch (error) {
      console.error('❌ Failed to login demo user:', error.message);
      throw error;
    }
  }
  
  /**
   * Export collection data using Firestore v9 API
   */
  async function exportCollection(collectionName) {
    try {
      console.log(`📤 Exporting ${collectionName}...`);
      const querySnapshot = await getDocs(collection(db, collectionName));
      const documents = [];
      
      querySnapshot.forEach(docSnap => {
        documents.push({
          id: docSnap.id,
          data: docSnap.data()
        });
      });
      
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
      
      // Use batch writes for efficiency (max 500 per batch)
      const batches = [];
      const batchSize = 500;
      
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchDocs = documents.slice(i, i + batchSize);
        
        batchDocs.forEach(docData => {
          const userDocRef = doc(db, 'users', userId, collectionName, docData.id);
          batch.set(userDocRef, docData.data);
        });
        
        batches.push(batch);
      }
      
      // Commit all batches
      for (let i = 0; i < batches.length; i++) {
        await batches[i].commit();
        console.log(`✅ Committed batch ${i + 1}/${batches.length} for ${collectionName}`);
      }
      
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
      
      const userCollectionRef = collection(db, 'users', userId, collectionName);
      const snapshot = await getDocs(userCollectionRef);
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
      
      const userDocRef = doc(db, 'users', userId, collectionName, sampleDoc.id);
      const migratedDoc = await getDoc(userDocRef);
      
      if (migratedDoc.exists()) {
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
      
      // Step 1: Login as demo user to get UID
      const demoUserId = await loginDemoUser();
      
      // Step 2: Export all collections
      console.log('\n📦 STEP 2: Exporting collections...');
      const exportedData = {};
      
      for (const collectionName of COLLECTIONS_TO_MIGRATE) {
        exportedData[collectionName] = await exportCollection(collectionName);
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Step 3: Migrate collections
      console.log('\n🔄 STEP 3: Migrating collections...');
      
      for (const collectionName of COLLECTIONS_TO_MIGRATE) {
        await migrateCollection(collectionName, exportedData[collectionName], demoUserId);
        // Add small delay between collections
        await new Promise(resolve => setTimeout(resolve, 200));
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
        
        // Add small delay between validations
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Summary
      console.log('\n📊 MIGRATION SUMMARY');
      console.log('====================');
      console.log(`Demo User ID: ${demoUserId}`);
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
        
        // Store migration data globally for potential rollback
        window.BYKI_MIGRATION_DATA = {
          success: true,
          demoUserId,
          exportedData,
          totalDocuments
        };
        
        return {
          success: true,
          demoUserId,
          exportedData,
          totalDocuments
        };
      } else {
        console.log('\n⚠️ Migration completed with errors!');
        console.log('💡 Please check the errors above and consider rollback if needed');
        
        window.BYKI_MIGRATION_DATA = {
          success: false,
          demoUserId,
          exportedData,
          totalDocuments
        };
        
        return {
          success: false,
          demoUserId,
          exportedData,
          totalDocuments
        };
      }
      
    } catch (error) {
      console.error('\n💥 Migration failed:', error.message);
      console.log('\n🔄 Use rollbackBykiMigration(userId) for rollback');
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
        const userCollectionRef = collection(db, 'users', userId, collectionName);
        const snapshot = await getDocs(userCollectionRef);
        
        // Delete in batches
        const batches = [];
        const batchSize = 500;
        const docs = snapshot.docs;
        
        for (let i = 0; i < docs.length; i += batchSize) {
          const batch = writeBatch(db);
          const batchDocs = docs.slice(i, i + batchSize);
          
          batchDocs.forEach(docSnapshot => {
            batch.delete(docSnapshot.ref);
          });
          
          batches.push(batch);
        }
        
        // Commit delete batches
        for (let i = 0; i < batches.length; i++) {
          await batches[i].commit();
          console.log(`✅ Deleted batch ${i + 1}/${batches.length} for ${collectionName}`);
        }
        
        console.log(`✅ Cleaned up users/${userId}/${collectionName}`);
      }
      
      console.log('✅ Rollback completed!');
      
      // Clear migration data
      delete window.BYKI_MIGRATION_DATA;
      
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
  
  // Make functions available globally
  window.runBykiMigration = runMigration;
  window.rollbackBykiMigration = rollbackMigration;
  window.loginBykiDemoUser = loginDemoUser;
  
  console.log('🔧 BYKI Migration script loaded successfully!');
  console.log('📝 Available functions:');
  console.log('   - runBykiMigration() - Run full migration');
  console.log('   - rollbackBykiMigration(userId) - Rollback migration');
  console.log('   - loginBykiDemoUser() - Login and get demo user ID');
  console.log('');
  console.log('💡 To start migration, run: await runBykiMigration()');
  console.log('');
  console.log('⚠️ IMPORTANT: Make sure you have backups before running migration!');
  
})();
