import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Plus, Search, Filter, Trash2, UserPlus, Mail, Eye, Tag, UserCircle, Pin, BellRing } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function Students() {
  const { students, batches, addStudent, deleteStudent, restoreStudent, togglePinStudent, getStudentAttendanceStats } = useData();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string>('all');

  // New Student Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [batchIds, setBatchIds] = useState<string[]>([]);

  const filteredStudents = useMemo(() => {
    const safeSearch = (searchQuery || "").toLowerCase();
    const filtered = (students || []).filter((student) => {
      const matchesSearch = (student?.name || "").toLowerCase().includes(safeSearch) || 
                            (student?.email || "").toLowerCase().includes(safeSearch);
      const matchesBatch = selectedBatch === 'all' || (student?.batchIds || []).includes(selectedBatch);
      return matchesSearch && matchesBatch;
    });

    // Sort pinned students first
    return filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  }, [students, searchQuery, selectedBatch]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || batchIds.length === 0) {
      toast.error('Please fill all fields and select at least one batch');
      return;
    }
    const success = await addStudent({ name, email, batchIds });
    if (!success) {
      return;
    }
    setName('');
    setEmail('');
    setBatchIds([]);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    const studentToDelete = students.find(s => s.id === id);
    if (!studentToDelete) return;

    if (window.confirm('Are you sure you want to remove this student?')) {
      await deleteStudent(id);
      toast.success('Student removed', {
        action: {
          label: 'Undo',
          onClick: async () => {
            await restoreStudent(studentToDelete);
          }
        },
        duration: 5000,
      });
    }
  };



  const handleSendReminder = (studentName: string) => {
    toast.success(`Reminder sent successfully to ${studentName}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text">Students Directory</h1>
          <p className="text-text-muted mt-1">Manage enrollments and student profiles.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="group w-full shrink-0 sm:w-auto">
          <UserPlus className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
          Add Student
        </Button>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              placeholder="Search students by name or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-border rounded-xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all shadow-sm"
            />
          </div>
          <div className="flex w-full md:w-auto gap-4">
            <div className="relative w-full md:w-48 shrink-0">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full bg-white border border-border rounded-xl py-3 pl-12 pr-10 text-sm focus:ring-2 focus:ring-primary/50 outline-none appearance-none transition-all shadow-sm"
              >
                <option value="all">All Batches</option>
                {(batches || []).map((b) => (
                  <option key={b.id} value={b.id}>{b.name || 'Unnamed Batch'}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="py-4 px-6 font-semibold text-text-muted text-sm uppercase tracking-wider w-10"></th>
                <th className="py-4 px-6 font-semibold text-text-muted text-sm uppercase tracking-wider">Student</th>
                <th className="py-4 px-6 font-semibold text-text-muted text-sm uppercase tracking-wider">Email</th>
                <th className="py-4 px-6 font-semibold text-text-muted text-sm uppercase tracking-wider">Batch & Instructor</th>
                <th className="py-4 px-6 font-semibold text-text-muted text-sm uppercase tracking-wider">Attendance</th>
                <th className="py-4 px-6 font-semibold text-text-muted text-sm uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-muted">
                    No students found matching your criteria.
                  </td>
                </tr>
              ) : (
                (filteredStudents || []).map((student, index) => {
                  const stats = getStudentAttendanceStats(student?.id || '');
                  const isLowAttendance = stats.total > 0 && stats.percentage < 60;
                  const isTopPerformer = stats.total > 0 && stats.percentage >= 90;

                  return (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={`border-b border-border/50 hover-row group ${isLowAttendance ? 'bg-red-50/30' : ''} ${isTopPerformer ? 'bg-green-50/30' : ''} ${student.isPinned ? 'bg-primary/5' : ''}`}
                    >
                      <td className="py-4 px-6">
                        <button 
                          onClick={() => togglePinStudent(student.id)}
                          className={`p-1.5 rounded-md transition-colors ${student.isPinned ? 'text-primary bg-primary/10' : 'text-text-muted hover:text-primary hover:bg-primary/5 opacity-0 group-hover:opacity-100'}`}
                          title={student.isPinned ? "Unpin Student" : "Pin Student"}
                        >
                          <Pin className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isTopPerformer ? 'bg-green-100 text-green-700' : isLowAttendance ? 'bg-red-100 text-red-700' : 'bg-primary/10 text-primary'}`}>
                            {(student?.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-text flex items-center gap-2">
                              {student.name}
                              {isTopPerformer && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Top</span>}
                              {isLowAttendance && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Low</span>}
                            </span>
                            <span className="text-xs text-text-muted">ID: {student.id.slice(-6)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-text-muted">
                          <Mail className="w-4 h-4" />
                          <span className="text-sm">{student.email}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(student.batchIds || []).map(bId => {
                            const b = (batches || []).find(batch => batch.id === bId);
                            return (
                              <div key={bId} className="flex flex-col items-start gap-1 p-1.5 rounded-lg bg-purple-50 border border-purple-100 mb-1">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 uppercase tracking-wider">
                                  {b?.name || ''}
                                </span>
                                {b?.teacherName && (
                                  <span className="text-[9px] text-primary flex items-center gap-1 font-medium italic">
                                    <UserCircle className="w-2.5 h-2.5" /> {b.teacherName}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                          {(student.batchIds || []).length === 0 && (
                            <span className="text-xs text-text-muted italic">Unassigned</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-surface rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${isLowAttendance ? 'bg-red-500' : isTopPerformer ? 'bg-green-500' : 'bg-primary'}`}
                              style={{ width: `${stats.percentage}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${isLowAttendance ? 'text-red-600' : isTopPerformer ? 'text-green-600' : 'text-text-muted'}`}>
                            {stats.percentage}%
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isLowAttendance && (
                            <button
                              onClick={() => handleSendReminder(student.name)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="Send Reminder"
                            >
                              <BellRing className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/students/${student.id}`)}
                            className="p-2 text-text-muted hover:text-primary hover:bg-primary/5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="View Profile"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(student.id)}
                            className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete Student"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Student">
        <form onSubmit={handleAddStudent} className="space-y-5">
          <Input
            label="Full Name"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="w-full">
            <label className="block text-sm font-medium text-text-muted mb-3 ml-1">
              Select Batches/Courses
            </label>
            <div className="grid grid-cols-1 gap-3 max-h-[200px] overflow-y-auto p-1 custom-scrollbar">
              {(batches || []).map((b) => (
                <label 
                  key={b.id}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${batchIds.includes(b.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-xs font-bold text-primary">
                      {b.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-text">{b.name}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={batchIds.includes(b.id)}
                    onChange={() => {
                      setBatchIds(prev => 
                        prev.includes(b.id) ? prev.filter(id => id !== b.id) : [...prev, b.id]
                      );
                    }}
                    className="w-5 h-5 rounded-md border-border text-primary focus:ring-primary/50 cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Student</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
