/**
 * Quick test to verify demo user exists and can login
 * Run this in browser console on the BYKI app page
 */

(async function testDemoUser() {
  'use strict';
  
  console.log('🧪 Testing demo user login...');
  
  try {
    // Use existing Firebase auth from the app
    const { auth } = window;
    
    if (!auth) {
      console.error('❌ Firebase auth not found. Make sure BYKI app is loaded.');
      return;
    }
    
    // Import Firebase functions from global context
    const { signInWithEmailAndPassword } = window.firebase || {};
    
    if (!signInWithEmailAndPassword) {
      console.error('❌ Firebase signInWithEmailAndPassword not found.');
      return;
    }
    
    const DEMO_EMAIL = 'demo@byki.com';
    const DEMO_PASSWORD = 'demo123456';
    
    console.log(`🔐 Attempting login with ${DEMO_EMAIL}...`);
    
    const userCredential = await signInWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
    const user = userCredential.user;
    
    console.log('✅ Demo user login successful!');
    console.log('👤 User Details:');
    console.log(`   - UID: ${user.uid}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Created: ${new Date(user.metadata.creationTime).toLocaleString()}`);
    console.log(`   - Last Sign In: ${new Date(user.metadata.lastSignInTime).toLocaleString()}`);
    
    console.log('\n🎯 Demo user is ready for migration!');
    console.log(`📝 Demo User ID to use in migration: ${user.uid}`);
    
    return {
      success: true,
      userId: user.uid,
      email: user.email
    };
    
  } catch (error) {
    console.error('❌ Demo user login failed:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.log('\n💡 Demo user does not exist. To create it:');
      console.log('   1. Use the demoAccountSetup.js utility');
      console.log('   2. Or manually create user with email: demo@byki.com, password: demo123456');
    } else if (error.code === 'auth/wrong-password') {
      console.log('\n💡 Demo user exists but password is incorrect.');
      console.log('   Expected password: demo123456');
    } else {
      console.log('\n💡 Other auth error. Check Firebase configuration and network.');
    }
    
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
})();
