import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export function VerifyOTP() {
  const { pendingAdminOtp, verifyAdminOtp } = useAuth();
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp.trim()) {
      toast.error('OTP is required');
      return;
    }

    try {
      setIsVerifying(true);
      await verifyAdminOtp(otp);
      toast.success('OTP verified successfully');
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      toast.error(error.message || 'Invalid OTP');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      <div className="blob bg-primary/20 w-96 h-96 top-1/4 left-1/4 mix-blend-multiply"></div>
      <div className="blob bg-primary-light/20 w-96 h-96 top-1/3 right-1/4 mix-blend-multiply" style={{ animationDelay: '2s' }}></div>
      <div className="blob bg-purple-300/20 w-96 h-96 bottom-1/4 left-1/3 mix-blend-multiply" style={{ animationDelay: '4s' }}></div>

      <div className="w-full max-w-md relative z-10">
        <div className="glass-card p-8 sm:p-10 border border-white/50 shadow-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-text mb-2">Verify OTP</h1>
            <p className="text-text-muted">Enter the OTP sent to {pendingAdminOtp?.phone || 'your phone number'}.</p>
          </div>

          <form onSubmit={handleVerify} className="space-y-6">
            <Input
              label="Enter OTP"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" size="lg" isLoading={isVerifying}>
              Verify OTP
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
