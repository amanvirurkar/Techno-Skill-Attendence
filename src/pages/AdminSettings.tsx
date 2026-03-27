import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export function AdminSettings() {
  const { appUser, saveAdminPhoneNumber } = useAuth();
  const [phone, setPhone] = useState(appUser?.adminPhone || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    try {
      setIsSaving(true);
      await saveAdminPhoneNumber(phone);
      toast.success('Phone number saved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save phone number');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-text">Security Settings</h1>
        <p className="text-text-muted mt-1">Manage admin verification settings.</p>
      </div>

      <Card className="w-full p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text">Admin Phone Verification</h2>
            <p className="text-sm text-text-muted">New-device admin logins will require OTP verification.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <Input
            label="Enter Phone Number"
            type="tel"
            placeholder="+91XXXXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <div className="text-sm text-text-muted">
            Current Phone: {appUser?.adminPhone || '-'}
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="w-full sm:w-auto" isLoading={isSaving}>
              Save Number
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
