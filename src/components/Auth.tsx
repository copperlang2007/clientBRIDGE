import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Mail, Lock, User as UserIcon, ArrowRight, Chrome } from 'lucide-react';

export const Auth: React.FC = () => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsDemo, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      console.error("Email Auth Error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password sign-in is not enabled. Please enable it in the Firebase Console under Authentication > Sign-in method.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized for OAuth operations for your Firebase project. Please add it in the Firebase Console.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed before completing.');
      } else {
        setError(err.message || 'Google authentication failed');
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 border border-gold/10 bg-gold/5 rounded-[24px] md:rounded-[32px] backdrop-blur-xl max-w-md mx-auto">
      <div className="w-16 h-16 bg-gold/10 rounded-2xl flex items-center justify-center text-gold mb-6">
        <Lock size={32} />
      </div>
      
      <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-oat uppercase mb-2 text-center">
        {isSignUp ? 'Create Account' : 'Portal Access'}
      </h2>
      <p className="text-oat/50 text-center mb-8 text-sm">
        {isSignUp 
          ? 'Join the artificialBRIDGE infrastructure.' 
          : 'Welcome back to the artificialBRIDGE Client Portal.'}
      </p>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {isSignUp && (
          <div className="relative">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/40" size={18} />
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-vanta border border-gold/20 rounded-xl pl-12 pr-4 py-3 text-oat font-mono text-xs focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>
        )}
        
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/40" size={18} />
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-vanta border border-gold/20 rounded-xl pl-12 pr-4 py-3 text-oat font-mono text-xs focus:outline-none focus:border-gold/50 transition-colors"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/40" size={18} />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-vanta border border-gold/20 rounded-xl pl-12 pr-4 py-3 text-oat font-mono text-xs focus:outline-none focus:border-gold/50 transition-colors"
          />
        </div>

        {error && (
          <p className="text-red-400 text-[10px] font-mono uppercase tracking-widest text-center">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gold text-vanta font-bold rounded-xl hover:bg-oat transition-all group text-sm"
        >
          {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </form>

      <div className="w-full flex items-center gap-4 my-8">
        <div className="h-px flex-1 bg-gold/10" />
        <span className="text-[10px] font-mono text-oat/20 uppercase tracking-widest">OR</span>
        <div className="h-px flex-1 bg-gold/10" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-4 px-8 py-4 border border-gold/20 text-oat font-bold rounded-xl hover:bg-gold/5 transition-all group text-sm mb-4"
      >
        <Chrome size={18} className="text-gold" />
        Sign in with Google
      </button>

      <div className="w-full grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={async () => {
            setEmail('admin@demo.com');
            setPassword('password123');
            setError(null);
            try {
              await signInAsDemo('admin');
            } catch (err: any) {
              setError(err.message || 'Demo Admin access failed. Please try signing up directly.');
            }
          }}
          disabled={loading}
          className="flex flex-col items-center justify-center p-3 border border-gold/10 bg-gold/5 rounded-xl hover:border-gold/30 transition-all group"
        >
          <span className="text-[8px] font-mono text-gold uppercase tracking-widest mb-1">Demo</span>
          <span className="text-[10px] font-bold text-oat uppercase tracking-widest">Admin</span>
        </button>
        <button
          type="button"
          onClick={async () => {
            setEmail('client@demo.com');
            setPassword('password123');
            setError(null);
            try {
              await signInAsDemo('client');
            } catch (err: any) {
              setError(err.message || 'Demo Client access failed. Please try signing up directly.');
            }
          }}
          disabled={loading}
          className="flex flex-col items-center justify-center p-3 border border-gold/10 bg-gold/5 rounded-xl hover:border-gold/30 transition-all group"
        >
          <span className="text-[8px] font-mono text-gold uppercase tracking-widest mb-1">Demo</span>
          <span className="text-[10px] font-bold text-oat uppercase tracking-widest">Client</span>
        </button>
      </div>

      <button
        onClick={() => setIsSignUp(!isSignUp)}
        className="mt-8 text-[10px] font-mono text-gold uppercase tracking-widest hover:underline"
      >
        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
      </button>
    </div>
  );
};
