import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarCheck, ArrowRight, ArrowLeft, Mail, Lock, CheckCircle2, ShieldCheck, GraduationCap, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { toast } from 'sonner';

type ViewState = 'login' | 'forgot' | 'reset' | 'success' | 'signup';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Login() {
  const [view, setView] = useState<ViewState>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetLinkSent, setResetLinkSent] = useState(false);
  const [role, setRole] = useState<UserRole>('teacher');
  const [signupName, setSignupName] = useState('');
  const { login, signup, forgotPassword, validateResetCode, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = role === 'teacher' ? '/teacher' : '/dashboard';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');

    if (mode !== 'resetPassword' || !oobCode) {
      return;
    }

    const initializeReset = async () => {
      try {
        const resetEmail = await validateResetCode(oobCode);
        setEmail(resetEmail);
        setResetCode(oobCode);
        setResetLinkSent(false);
        setView('reset');
      } catch (error) {
        console.error('Invalid password reset link:', error);
        toast.error('This password reset link is invalid or expired');
        setView('forgot');
      }
    };

    void initializeReset();
  }, [location.search, validateResetCode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    try {
      const result = await login(email, password, role);

      if (result.requiresOtp) {
        toast.success('OTP sent successfully');
        navigate('/verify-otp', { replace: true });
        return;
      }

      toast.success(`Welcome back!`);
      navigate(redirectPath, { replace: true });
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Invalid credentials');
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    try {
      await forgotPassword(email);
      setResetLinkSent(true);
      setView('success');
      toast.success('Reset link sent! Open it to set your new password.');
    } catch (error: any) {
      console.error('Forgot password error:', error);
      toast.error(error.message || 'Error occurred while sending reset email');
    }
  };

  const handleForgotNavigation = () => {
    if (role === 'admin') {
      navigate('/admin/reset-password');
      return;
    }

    setView('forgot');
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetCode) {
      toast.error('Reset link is invalid or expired');
      return;
    }

    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in both password fields');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      await resetPassword(resetCode, newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setResetCode('');
      setResetLinkSent(false);
      navigate('/login', { replace: true });
      setView('success');
      toast.success('Password updated successfully');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Failed to update password');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      await signup(signupName, email, password);
      toast.success('Account created! Welcome!');
      navigate('/teacher', { replace: true });
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Signup failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Background Blobs */}
      <div className="blob bg-primary/20 w-96 h-96 top-1/4 left-1/4 mix-blend-multiply"></div>
      <div className="blob bg-primary-light/20 w-96 h-96 top-1/3 right-1/4 mix-blend-multiply" style={{ animationDelay: '2s' }}></div>
      <div className="blob bg-purple-300/20 w-96 h-96 bottom-1/4 left-1/3 mix-blend-multiply" style={{ animationDelay: '4s' }}></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-card p-8 sm:p-10 border border-white/50 shadow-2xl">
          <AnimatePresence mode="wait">
            {view === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="flex flex-col items-center mb-8">
                  <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center shadow-lg shadow-primary/40 mb-6 transform -rotate-6">
                    <CalendarCheck className="text-white w-8 h-8" />
                  </div>
                  <h1 className="text-3xl font-bold text-text mb-2">Welcome Back</h1>
                  <p className="text-text-muted text-center">Sign in to manage your attendance system</p>
                </div>

                {/* Role Selector */}
                <div className="flex rounded-xl border border-border overflow-hidden mb-6">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/login')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all ${
                      role === 'admin'
                        ? 'bg-primary text-white shadow-inner'
                        : 'text-text-muted hover:bg-surface'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('teacher')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all ${
                      role === 'teacher'
                        ? 'bg-primary text-white shadow-inner'
                        : 'text-text-muted hover:bg-surface'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    Teacher
                  </button>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-border text-primary focus:ring-primary" />
                      <span className="text-text-muted">Remember me</span>
                    </label>
                    <button 
                      type="button"
                      onClick={handleForgotNavigation}
                      className="text-primary hover:text-primary-hover font-medium transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button type="submit" className="w-full group" size="lg">
                    Sign In
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>

                  {role === 'teacher' && (
                    <p className="text-center text-sm text-text-muted pt-1">
                      New Teacher?{' '}
                      <button
                        type="button"
                        onClick={() => { setEmail(''); setPassword(''); setView('signup'); }}
                        className="text-primary font-semibold hover:underline transition-colors"
                      >
                        Create Account
                      </button>
                    </p>
                  )}
                </form>
              </motion.div>
            )}

            {view === 'forgot' && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <button 
                  onClick={() => setView('login')}
                  className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors text-sm mb-6"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to login
                </button>
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-text mb-2">Forgot Password?</h1>
                  <p className="text-text-muted">Enter your email address and we'll send a reset link so you can set a new password.</p>
                </div>

                <form onSubmit={handleForgot} className="space-y-6">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="Enter your email"
                    icon={<Mail className="w-5 h-5" />}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Button type="submit" className="w-full" size="lg">
                    Reset Password
                  </Button>
                </form>
              </motion.div>
            )}

            {view === 'reset' && (
              <motion.div
                key="reset"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-text mb-2">Create New Password</h1>
                  <p className="text-text-muted">Setting a strong password for <span className="text-primary font-medium">{email}</span></p>
                </div>

                <form onSubmit={handleReset} className="space-y-6">
                  <Input
                    label="New Password"
                    type="password"
                    placeholder="••••••••"
                    icon={<Lock className="w-5 h-5" />}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    placeholder="••••••••"
                    icon={<Lock className="w-5 h-5" />}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <Button type="submit" className="w-full" size="lg">
                    Update Password
                  </Button>
                </form>
              </motion.div>
            )}

            {view === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h1 className="text-2xl font-bold text-text mb-2">
                  {resetLinkSent ? 'Reset Link Sent!' : 'Password Updated!'}
                </h1>
                <p className="text-text-muted mb-8">
                  {resetLinkSent
                    ? 'Check your email and open the reset link to create a new password.'
                    : 'Your password has been successfully reset. You can now log in with your new password.'}
                </p>
                <Button onClick={() => { setResetLinkSent(false); setView('login'); }} className="w-full" size="lg">
                  Back to Login
                </Button>
              </motion.div>
            )}
            {view === 'signup' && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <button
                  onClick={() => setView('login')}
                  className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors text-sm mb-6"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to login
                </button>
                <div className="flex flex-col items-center mb-8">
                  <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center shadow-lg shadow-primary/40 mb-6 transform rotate-6">
                    <UserPlus className="text-white w-8 h-8" />
                  </div>
                  <h1 className="text-3xl font-bold text-text mb-2">Create Account</h1>
                  <p className="text-text-muted text-center">Join as a Teacher</p>
                </div>

                <form onSubmit={handleSignup} className="space-y-5">
                  <Input
                    label="Full Name"
                    type="text"
                    placeholder="e.g. Sarah Jane"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Input
                    label="Password"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button type="submit" className="w-full group" size="lg">
                    Create Account
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <p className="text-center text-sm text-text-muted">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setView('login')}
                      className="text-primary font-semibold hover:underline"
                    >
                      Sign In
                    </button>
                  </p>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
