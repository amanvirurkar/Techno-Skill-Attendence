import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, X } from 'lucide-react';
import { Button } from './Button';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function LogoutModal({ isOpen, onClose, onConfirm }: LogoutModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-border"
          >
            <div className="p-8">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
                  <LogOut className="w-8 h-8" />
                </div>
              </div>
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-text mb-2">Logout</h3>
                <p className="text-text-muted">Are you sure you want to logout? You'll need to sign in again to access the system.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={onConfirm}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
                >
                  Logout
                </Button>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-text-muted hover:text-text hover:bg-surface rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
