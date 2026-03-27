import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BellRing, Pencil, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';

export function Notices() {
  const { appUser } = useAuth();
  const { notices, addNotice, updateNotice, deleteNotice } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const isAdmin = appUser?.role === 'admin';

  const openCreateModal = () => {
    setEditingNoticeId(null);
    setTitle('');
    setMessage('');
    setIsModalOpen(true);
  };

  const openEditModal = (id: string) => {
    const notice = notices.find((entry) => entry.id === id);
    if (!notice) return;
    setEditingNoticeId(id);
    setTitle(notice.title);
    setMessage(notice.message);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    if (editingNoticeId) {
      await updateNotice(editingNoticeId, title.trim(), message.trim());
    } else {
      await addNotice(title.trim(), message.trim());
    }

    setIsModalOpen(false);
    setEditingNoticeId(null);
    setTitle('');
    setMessage('');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Notice Board</h1>
          <p className="text-text-muted mt-1">
            {isAdmin ? 'Create and manage notices for all users.' : 'View the latest notices from admin.'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateModal} className="group w-full sm:w-auto">
            <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
            Add Notice
          </Button>
        )}
      </div>

      {notices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <BellRing className="w-12 h-12 text-primary opacity-50" />
          </div>
          <h3 className="text-xl font-bold text-text mb-2">No notices available</h3>
          <p className="text-text-muted max-w-sm">
            {isAdmin ? 'Create the first notice to notify your teachers.' : 'Check back later for new notices.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {notices.map((notice, index) => (
            <motion.div
              key={notice.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-6 h-full">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-text">{notice.title}</h2>
                    <p className="text-xs text-text-muted mt-1">
                      {format(new Date(notice.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(notice.id)}
                        className="p-2 text-text-muted hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                        title="Edit Notice"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteNotice(notice.id)}
                        className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Notice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-text-muted whitespace-pre-wrap leading-relaxed">{notice.message}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingNoticeId ? 'Edit Notice' : 'Add Notice'} maxWidth="max-w-2xl">
        <form onSubmit={handleSave} className="space-y-5">
          <Input
            label="Title"
            placeholder="Enter notice title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <div className="w-full">
            <label className="block text-sm font-medium text-text-muted mb-1.5 ml-1">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter notice message"
              rows={6}
              className="w-full px-4 py-3 rounded-xl bg-white border border-border text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 shadow-sm resize-none"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingNoticeId ? 'Update Notice' : 'Create Notice'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
