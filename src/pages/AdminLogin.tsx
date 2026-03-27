import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Lock, Mail, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AdminLogin() {
  const { hasAdminAccount, isAdminRegistryLoading, login, appUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isAdminRegistryLoading) return;
    if (!hasAdminAccount) {
      navigate('/admin/register', { replace: true });
      return;
    }
    if (appUser?.role === 'admin') {
      navigate('/dashboard', { replace: true });
    }
  }, [appUser?.role, hasAdminAccount, isAdminRegistryLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
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
      const result = await login(email, password, 'admin');
      if (result.requiresOtp) {
        toast.success('OTP sent successfully');
        navigate('/verify-otp', { replace: true });
        return;
      }
      toast.success('Welcome back!');
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      toast.error(error.message || 'Invalid credentials');
    }
  };

  if (isAdminRegistryLoading) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
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
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center shadow-lg shadow-primary/40 mb-6 transform -rotate-6">
              <ShieldCheck className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-text mb-2">Admin Login</h1>
            <p className="text-text-muted text-center">Sign in with the registered main admin account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input label="Email" type="email" placeholder="Enter email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Password" type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button type="submit" className="w-full group" size="lg">
              <Mail className="w-5 h-5 mr-2" />
              Admin Login
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </form>
          <div id="recaptcha-container" className="hidden" />
        </div>
      </motion.div>
    </div>
  );
}
