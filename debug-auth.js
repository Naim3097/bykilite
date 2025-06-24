// Debug script to test Firebase Auth directly
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBloaW6TgHLVPO9HcCtlsQcLl9J32SY9UQ",
  authDomain: "sparepart-management-system.firebaseapp.com",
  projectId: "sparepart-management-system",
  storageBucket: "sparepart-management-system.firebasestorage.app",
  messagingSenderId: "673702003106",
  appId: "1:673702003106:web:4d379e315659d0bc6c72fb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function testAuth() {
  const testEmail = 'test-debug@example.com';
  const testPassword = 'test123456';
  
  console.log('🧪 Starting auth debug test...');
  
  try {
    // First try to create the user
    console.log('📝 Creating test user...');
    const createResult = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    console.log('✅ User created successfully:', createResult.user.uid);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Now try to sign in
    console.log('🔑 Attempting to sign in...');
    const signInResult = await signInWithEmailAndPassword(auth, testEmail, testPassword);
    console.log('✅ Sign in successful:', signInResult.user.uid);
    
  } catch (error) {
    console.error('❌ Auth test failed:', error.code, error.message);
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('📝 User already exists, trying to sign in...');
      try {
        const signInResult = await signInWithEmailAndPassword(auth, testEmail, testPassword);
        console.log('✅ Sign in successful:', signInResult.user.uid);
      } catch (signInError) {
        console.error('❌ Sign in failed:', signInError.code, signInError.message);
      }
    }
  }
}

// Run the test if this script is executed directly
if (typeof window !== 'undefined') {
  window.testAuth = testAuth;
  console.log('🔧 Debug auth test loaded. Run testAuth() in console.');
} else {
  testAuth();
}
