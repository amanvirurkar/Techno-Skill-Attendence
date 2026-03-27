import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Users, BookOpen, Search, UserCircle } from 'lucide-react';
import { useData, Batch } from '../context/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const formatTimeLabel = (time: string) => {
  if (!time) return '';

  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;

  const formattedHours = ((hours + 11) % 12) + 1;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${formattedHours}:${String(minutes).padStart(2, '0')} ${suffix}`;
};

export function Batches() {
  const { batches, students, teachers, addBatch, deleteBatch, updateBatchStudents, reassignBatch, assignTemporaryTeacher } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isSubstituteModalOpen, setIsSubstituteModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [substituteBatchId, setSubstituteBatchId] = useState<string | null>(null);
  const [reassignBatchId, setReassignBatchId] = useState<string | null>(null);
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [newBatchName, setNewBatchName] = useState('');
  const [assignedTeacherEmail, setAssignedTeacherEmail] = useState('');
  const [newBatchStartTime, setNewBatchStartTime] = useState('');
  const [newBatchEndTime, setNewBatchEndTime] = useState('');
  const [newBatchDays, setNewBatchDays] = useState<string[]>([]);
  const [substituteTeacherId, setSubstituteTeacherId] = useState('');
  const [substituteStartDate, setSubstituteStartDate] = useState('');
  const [substituteEndDate, setSubstituteEndDate] = useState('');
  const [reassignTeacherId, setReassignTeacherId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBatches = useMemo(() => {
    const safeSearch = (searchQuery || "").toLowerCase();
    return (batches || []).filter((batch) => 
      (batch?.name || "").toLowerCase().includes(safeSearch) ||
      (batch?.teacherName || "").toLowerCase().includes(safeSearch) ||
      (batch?.teacherEmail || "").toLowerCase().includes(safeSearch)
    );
  }, [batches, searchQuery]);

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim() || !assignedTeacherEmail || !newBatchStartTime || !newBatchEndTime || newBatchDays.length === 0) return;
    await addBatch(newBatchName, assignedTeacherEmail, {
      startTime: newBatchStartTime,
      endTime: newBatchEndTime,
      days: newBatchDays,
    });
    setNewBatchName('');
    setAssignedTeacherEmail('');
    setNewBatchStartTime('');
    setNewBatchEndTime('');
    setNewBatchDays([]);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this batch? All enrollment references and attendance records in this batch will be updated.')) {
      await deleteBatch(id);
    }
  };

  const handleOpenManage = (batch: Batch) => {
    setSelectedBatchId(batch.id);
    setAssignedStudentIds(batch.studentIds || []);
    setIsManageModalOpen(true);
  };

  const handleSaveStudents = async () => {
    if (selectedBatchId) {
      await updateBatchStudents(selectedBatchId, assignedStudentIds);
      setIsManageModalOpen(false);
    }
  };

  const handleOpenSubstitute = (batch: Batch) => {
    setSubstituteBatchId(batch.id);
    setSubstituteTeacherId('');
    setSubstituteStartDate('');
    setSubstituteEndDate('');
    setIsSubstituteModalOpen(true);
  };

  const handleOpenReassign = (batch: Batch) => {
    setReassignBatchId(batch.id);
    setReassignTeacherId(batch.teacherId || '');
    setIsReassignModalOpen(true);
  };

  const handleReassignBatch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reassignBatchId || !reassignTeacherId) return;
    await reassignBatch(reassignBatchId, reassignTeacherId);
    setIsReassignModalOpen(false);
  };

  const handleAssignSubstitute = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!substituteBatchId || !substituteTeacherId || !substituteStartDate || !substituteEndDate) return;
    if (substituteStartDate > substituteEndDate) return;

    const selectedTeacher = teachers.find((teacher) => teacher.uid === substituteTeacherId);
    if (!selectedTeacher) return;

    await assignTemporaryTeacher(substituteBatchId, {
      teacherId: selectedTeacher.uid,
      teacherName: selectedTeacher.displayName || selectedTeacher.email,
      startDate: substituteStartDate,
      endDate: substituteEndDate,
    });

    setIsSubstituteModalOpen(false);
  };

  const toggleStudent = (sId: string) => {
    setAssignedStudentIds(prev => 
      prev.includes(sId) ? prev.filter(id => id !== sId) : [...prev, sId]
    );
  };

  const filteredStudentsForModal = (students || []).filter(s => 
    (s?.name || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s?.email || "").toLowerCase().includes(studentSearch.toLowerCase())
  );
  const substituteBatch = useMemo(
    () => (substituteBatchId ? batches.find((batch) => batch.id === substituteBatchId) || null : null),
    [batches, substituteBatchId]
  );
  const batchToReassign = useMemo(
    () => (reassignBatchId ? batches.find((batch) => batch.id === reassignBatchId) || null : null),
    [batches, reassignBatchId]
  );
  const today = new Date().toISOString().slice(0, 10);

  const toggleBatchDay = (day: string) => {
    setNewBatchDays((prev) => (
      prev.includes(day) ? prev.filter((entry) => entry !== day) : [...prev, day]
    ));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Manage Batches</h1>
          <p className="text-text-muted mt-1">Create and organize student batches.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="group w-full sm:w-auto">
          <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
          Add Batch
        </Button>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input
            type="text"
            placeholder="Search batches by name or teacher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-border rounded-xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all shadow-sm"
          />
        </div>
      </Card>

      {filteredBatches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <BookOpen className="w-12 h-12 text-primary opacity-50" />
          </div>
          <h3 className="text-xl font-bold text-text mb-2">No batches found</h3>
          <p className="text-text-muted max-w-sm">
            {searchQuery ? "No batches match your search." : "Get started by creating your first batch to organize your students."}
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsModalOpen(true)} className="mt-6" variant="outline">
              Create First Batch
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {(filteredBatches || []).map((batch, index) => {
            const studentCount = (batch.studentIds || []).length;
            const batchStudents = (students || []).filter(s => (batch.studentIds || []).includes(s.id));
            return (
              <motion.div
                key={batch.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="group relative overflow-hidden hover-card border-transparent">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="relative z-10 flex justify-between items-start mb-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenManage(batch)}
                        className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
                        title="Manage Students"
                      >
                        <Users className="w-4 h-4" /> Manage
                      </button>
                      <button
                        onClick={() => handleOpenReassign(batch)}
                        className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
                        title="Reassign Teacher"
                      >
                        <UserCircle className="w-4 h-4" /> Reassign
                      </button>
                      <button
                        onClick={() => handleOpenSubstitute(batch)}
                        className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
                        title="Assign Substitute Teacher"
                      >
                        <UserCircle className="w-4 h-4" /> Substitute
                      </button>
                      <button
                        onClick={() => handleDelete(batch.id)}
                        className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Batch"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="relative z-10">
                    {studentCount > 0 && (
                      <div className="flex -space-x-2 mb-3">
                        {batchStudents.slice(0, 5).map((s, i) => (
                          <div key={s.id} className="w-8 h-8 rounded-full border-2 border-white bg-surface flex items-center justify-center text-[10px] font-bold text-primary shadow-sm" style={{ zIndex: 5 - i }}>
                            {(s?.name || "U").charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {studentCount > 5 && (
                          <div className="w-8 h-8 rounded-full border-2 border-white bg-surface flex items-center justify-center text-[10px] font-bold text-text-muted shadow-sm" style={{ zIndex: 0 }}>
                            +{studentCount - 5}
                          </div>
                        )}
                      </div>
                    )}
                    <h3 className="text-xl font-bold text-text mb-2">{batch.name}</h3>
                    {(batch.startTime || batch.endTime) && (
                      <p className="text-xs text-text-muted mb-1">
                        {formatTimeLabel(batch.startTime || '')}{batch.startTime && batch.endTime ? ' - ' : ''}{formatTimeLabel(batch.endTime || '')}
                      </p>
                    )}
                    {(batch.days || []).length > 0 && (
                      <p className="text-xs text-text-muted mb-3">{(batch.days || []).join(', ')}</p>
                    )}
                    {batch.teacherName && (
                      <div className="flex items-center gap-2 text-primary mb-3">
                        <UserCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Instructor: {batch.teacherName}</span>
                      </div>
                    )}
                    {(batch.temporaryTeacherAssignments || []).length > 0 && (
                      <div className="mb-3 space-y-2">
                        {(batch.temporaryTeacherAssignments || []).map((assignment, assignmentIndex) => {
                          const isActive = assignment.startDate <= today && assignment.endDate >= today;

                          return (
                            <div
                              key={`${batch.id}-${assignment.teacherId}-${assignmentIndex}`}
                              className={`rounded-xl border px-3 py-2 text-sm ${isActive ? 'border-primary/30 bg-primary/5 text-primary' : 'border-border bg-surface text-text-muted'}`}
                            >
                              <p className="font-medium">
                                Substitute: {assignment.teacherName || ''}
                              </p>
                              <p className="text-xs">
                                {assignment.startDate} to {assignment.endDate}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-text-muted">
                      <Users className="w-4 h-4" />
                      <span className="text-sm font-medium">{(batch.studentIds || []).length} Students Enrolled</span>
                    </div>
                  </div>
                  
                  {/* Decorative bottom line */}
                  <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-primary to-primary-light group-hover:w-full transition-all duration-500"></div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} title="Manage Batch Students" maxWidth="max-w-2xl">
        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search students to assign..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full bg-white border border-border rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all shadow-sm"
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {filteredStudentsForModal.length === 0 ? (
              <p className="text-center py-8 text-text-muted text-sm">No students found.</p>
            ) : (
              filteredStudentsForModal.map(student => (
                <label 
                  key={student.id}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${assignedStudentIds.includes(student.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-xs font-bold text-primary">
                      {(student.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                      <p className="text-sm font-semibold text-text">{student.name || 'Unnamed Student'}</p>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider">{student.email || 'No email'}</p>
                        </div>
                      </div>
                  <input
                    type="checkbox"
                    checked={assignedStudentIds.includes(student.id)}
                    onChange={() => toggleStudent(student.id)}
                    className="w-5 h-5 rounded-md border-border text-primary focus:ring-primary/50 transition-all cursor-pointer"
                  />
                </label>
              ))
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setIsManageModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStudents}>Update Enrollments</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Batch">
        <form onSubmit={handleAddBatch} className="space-y-6">
          <Input
            label="Batch Name"
            placeholder="e.g. Masterclass 2026"
            value={newBatchName}
            onChange={(e) => setNewBatchName(e.target.value)}
            autoFocus
            required
          />
          <div className="w-full">
            <label className="block text-sm font-medium text-text-muted mb-1.5 ml-1">
              Assign Teacher
            </label>
            <div className="relative">
              <select
                value={assignedTeacherEmail}
                onChange={(e) => setAssignedTeacherEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 appearance-none shadow-sm"
                required
              >
                <option value="" disabled>Select teacher...</option>
                {(teachers || []).map((teacher) => (
                  <option key={teacher.uid} value={teacher.email}>
                    {teacher.displayName ? `${teacher.displayName} (${teacher.email})` : teacher.email}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Time"
              type="time"
              value={newBatchStartTime}
              onChange={(e) => setNewBatchStartTime(e.target.value)}
              required
            />
            <Input
              label="End Time"
              type="time"
              value={newBatchEndTime}
              onChange={(e) => setNewBatchEndTime(e.target.value)}
              required
            />
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium text-text-muted mb-2 ml-1">
              Days
            </label>
            <div className="flex flex-wrap gap-2">
              {WEEK_DAYS.map((day) => {
                const isSelected = newBatchDays.includes(day);

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleBatchDay(day)}
                    className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-white text-text-muted border-border hover:border-primary/30 hover:text-primary'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Batch</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isSubstituteModalOpen} onClose={() => setIsSubstituteModalOpen(false)} title="Assign Substitute Teacher">
        <form onSubmit={handleAssignSubstitute} className="space-y-6">
          <div className="w-full">
            <label className="block text-sm font-medium text-text-muted mb-1.5 ml-1">
              Select Teacher
            </label>
            <div className="relative">
              <select
                value={substituteTeacherId}
                onChange={(e) => setSubstituteTeacherId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 appearance-none shadow-sm"
                required
              >
                <option value="" disabled>Select teacher...</option>
                {(teachers || []).map((teacher) => (
                  <option key={teacher.uid} value={teacher.uid}>
                    {teacher.displayName ? `${teacher.displayName} (${teacher.email})` : teacher.email}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={substituteStartDate}
              onChange={(e) => setSubstituteStartDate(e.target.value)}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={substituteEndDate}
              onChange={(e) => setSubstituteEndDate(e.target.value)}
              required
            />
          </div>
          {substituteBatch && (
            <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-muted">
              Original Teacher: {substituteBatch.teacherName || substituteBatch.teacherEmail || ''}
            </div>
          )}
          {substituteStartDate && substituteEndDate && substituteStartDate > substituteEndDate && (
            <p className="text-sm text-red-500">End date must be on or after the start date.</p>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setIsSubstituteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Assign</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isReassignModalOpen} onClose={() => setIsReassignModalOpen(false)} title="Reassign Batch Teacher">
        <form onSubmit={handleReassignBatch} className="space-y-6">
          <div className="w-full">
            <label className="block text-sm font-medium text-text-muted mb-1.5 ml-1">
              Select Teacher
            </label>
            <div className="relative">
              <select
                value={reassignTeacherId}
                onChange={(e) => setReassignTeacherId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 appearance-none shadow-sm"
                required
              >
                <option value="" disabled>Select teacher...</option>
                {(teachers || []).map((teacher) => (
                  <option key={teacher.uid} value={teacher.uid}>
                    {teacher.displayName ? `${teacher.displayName} (${teacher.email})` : teacher.email}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
          {batchToReassign && (
            <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-muted">
              Current Teacher: {batchToReassign.teacherName || batchToReassign.teacherEmail || ''}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setIsReassignModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Reassign</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
