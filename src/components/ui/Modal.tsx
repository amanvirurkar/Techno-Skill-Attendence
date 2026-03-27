import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string; // Added optional maxWidth
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed left-1/2 top-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 -translate-y-1/2 ${maxWidth}`}
          >
            <div className="glass-card bg-surface/90 p-4 shadow-2xl border border-white/20 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-text">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 text-text-muted hover:text-text hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
