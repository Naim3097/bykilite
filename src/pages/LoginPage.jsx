import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContextSafe';
import { toast } from 'react-toastify';
// Import the logo image
import logoMain from '../assets/img/login/BYKI Lite Logo Main 2.png';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { login, signup, firebaseError, isFirebaseInitialized } = useAuth();
  const navigate = useNavigate();

  // Debug Firebase initialization on component mount
  useEffect(() => {
    console.log('🔥 LoginPage mounted, checking Firebase...');
    console.log('Firebase initialized:', isFirebaseInitialized);
    console.log('Firebase error:', firebaseError);
    console.log('Auth functions available:', { hasLogin: !!login, hasSignup: !!signup });
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Vercel deployment:', process.env.VERCEL === '1');    
    if (firebaseError) {
      console.error('❌ Firebase initialization error in LoginPage:', firebaseError);
    }
  }, [login, firebaseError, isFirebaseInitialized, signup]);
  // Floating label handlers
  const handleInputFocus = (labelId) => {
    const label = document.getElementById(labelId);
    if (label) {
      label.classList.add('active');
    }
  };

  const handleInputBlur = (labelId, value) => {
    const label = document.getElementById(labelId);
    if (label && !value) {
      label.classList.remove('active');
    }
  };

  const handleInputChange = (labelId, value, setter) => {
    setter(value);
    const label = document.getElementById(labelId);
    if (label) {
      if (value) {
        label.classList.add('active');
      } else {
        label.classList.remove('active');
      }
    }
  };

  useEffect(() => {
    // Set active state for labels if inputs have values on mount
    if (email) {
      const emailLabel = document.getElementById('email-label');
      if (emailLabel) emailLabel.classList.add('active');
    }
    if (password) {
      const passwordLabel = document.getElementById('password-label');
      if (passwordLabel) passwordLabel.classList.add('active');
    }
  }, [email, password]);

  // Show Firebase error if initialization failed
  if (firebaseError || !isFirebaseInitialized) {
    return (
      <div className="login-container">
        <div className="login-form" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>🚨 Firebase Configuration Error</h2>
          <div style={{ 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffeaa7',
            borderRadius: '8px',
            padding: '1.5rem',
            margin: '1rem 0',
            textAlign: 'left'
          }}>
            <p style={{ color: '#856404', marginBottom: '1rem', fontWeight: 'bold' }}>
              Firebase failed to initialize properly on Vercel.
            </p>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
              <strong>Error:</strong> {firebaseError || 'Firebase initialization failed'}
            </p>
            
            <h4 style={{ color: '#856404', marginBottom: '0.5rem' }}>🔧 Required fixes:</h4>
            <ol style={{ color: '#666', fontSize: '0.9rem', paddingLeft: '1.5rem' }}>
              <li>Set Firebase environment variables in Vercel Dashboard</li>
              <li>Add Vercel domain to Firebase Console authorized domains</li>
              <li>Ensure Firebase project has billing enabled</li>
              <li>Verify Firebase API keys are correct</li>
            </ol>
          </div>
          
          <p style={{ color: '#666', fontSize: '0.8rem', marginTop: '1rem' }}>
            Environment: {process.env.NODE_ENV} | Vercel: {process.env.VERCEL === '1' ? 'Yes' : 'No'}
          </p>
          
          <button 
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
              marginTop: '1rem'
            }}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      if (isSignUp) {
        await signup(email, password);
        toast.success('Account created successfully!');
      } else {
        await login(email, password);
        toast.success('Welcome back!');
      }
      navigate('/');
    } catch (error) {
      console.error('Auth error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      
      if (isSignUp) {
        if (error.code === 'auth/email-already-in-use') {
          toast.error('Account already exists. Try signing in instead.');
          setIsSignUp(false);
        } else if (error.code === 'auth/weak-password') {
          toast.error('Password should be at least 6 characters.');
        } else {
          toast.error(`Failed to create account: ${error.message}`);
        }
      } else {
        if (error.code === 'auth/user-not-found') {
          toast.error('No account found. Try creating an account first.');
          setIsSignUp(true);
        } else if (error.code === 'auth/wrong-password') {
          toast.error('Incorrect password.');
        } else if (error.code === 'auth/invalid-email') {
          toast.error('Invalid email address.');
        } else if (error.code === 'auth/invalid-credential') {
          toast.error('Invalid email or password. Please check your credentials.');
          console.log('🔍 Debug info - Email:', email, 'Password length:', password.length);
        } else {
          toast.error(`Failed to log in: ${error.message}`);
        }
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="premium-login-container">
      {/* Floating background elements */}
      <div className="background-elements">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
      </div>
      
      {/* Main glass-morphism card */}
      <div className="premium-login-card">
        {/* Logo section */}
        <div className="logo-section">
          <div className="logo-placeholder"></div>
        </div>        {/* Welcome section with logo */}
        <div className="welcome-section">
          <img 
            src={logoMain} 
            alt="BYKI Lite Logo" 
            className="main-logo"
          />
          <p className="welcome-subtitle">
            {isSignUp 
              ? 'Create your account to start managing spareparts' 
              : 'Sign in to your sparepart management system'
            }
          </p>
        </div>
        
        {/* Form section */}
        <div className="form-section">
          <form onSubmit={handleSubmit}>            {/* Email field with floating label */}
            <div className="premium-form-group">
              <input
                type="email"
                className="premium-input"
                value={email}
                onChange={(e) => handleInputChange('email-label', e.target.value, setEmail)}
                onFocus={() => handleInputFocus('email-label')}
                onBlur={() => handleInputBlur('email-label', email)}
                required
                autoComplete="email"
              />
              <label 
                id="email-label" 
                className={`floating-label ${email ? 'active' : ''}`}
              >
                Email Address
              </label>
            </div>

            {/* Password field with floating label */}
            <div className="premium-form-group">
              <input
                type="password"
                className="premium-input"
                value={password}
                onChange={(e) => handleInputChange('password-label', e.target.value, setPassword)}
                onFocus={() => handleInputFocus('password-label')}
                onBlur={() => handleInputBlur('password-label', password)}
                required
                minLength="6"
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
              <label 
                id="password-label" 
                className={`floating-label ${password ? 'active' : ''}`}
              >
                Password
              </label>
            </div>

            {/* Submit button */}
            <button 
              type="submit" 
              className="premium-login-btn"
              disabled={loading}
            >
              {loading ? (
                isSignUp ? 'Creating Account...' : 'Signing In...'
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>
        </div>
        
        {/* Footer section */}
        <div className="footer-section">
          <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </p>
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="footer-link"
          >
            {isSignUp ? 'Sign In Instead' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
