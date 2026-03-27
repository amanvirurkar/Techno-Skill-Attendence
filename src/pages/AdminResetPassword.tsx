import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export function AdminResetPassword() {
  const { isLoading, isAuthenticated, appUser, updateCurrentUserPassword } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated || !appUser) {
      navigate('/login', { replace: true });
      return;
    }

    if (appUser.role !== 'admin') {
      navigate('/teacher', { replace: true });
    }
  }, [appUser, isAuthenticated, isLoading, navigate]);

  const validate = () => {
    const nextErrors: { newPassword?: string; confirmPassword?: string } = {};

    if (!newPassword) {
      nextErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      nextErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Confirm password is required';
    } else if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fix the password fields');
      return;
    }

    try {
      await updateCurrentUserPassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
      setIsSuccess(true);
      toast.success('Password updated successfully');
      window.setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1200);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    }
  };

  if (isLoading || !isAuthenticated || !appUser || appUser.role !== 'admin') {
    return null;
  }

  if (isSuccess) {
    return (
      <div className="space-y-8">
        <Card className="p-8 max-w-2xl">
          <div className="text-center py-4">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-text mb-2">Password Updated!</h1>
            <p className="text-text-muted mb-8">Password updated successfully</p>
            <Button onClick={() => navigate('/dashboard', { replace: true })} className="w-full" size="lg">
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 bg-white border border-border rounded-xl hover:bg-surface transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-text-muted" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-text">Reset Password</h1>
          <p className="text-text-muted mt-1">Update your admin password inside the app.</p>
        </div>
      </div>

      <Card className="p-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="New Password"
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={errors.newPassword}
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            required
          />
          <Button type="submit" className="w-full group" size="lg">
            <Lock className="w-5 h-5 mr-2" />
            Update Password
          </Button>
        </form>
      </Card>
    </div>
  );
}
