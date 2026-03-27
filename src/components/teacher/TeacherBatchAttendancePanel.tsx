import React, { useEffect, useMemo, useState } from 'react';
import { Calendar as CalendarIcon, Save } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface TeacherBatchAttendancePanelProps {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  title: string;
  subtitle: string;
}

const formatTimeLabel = (time: string) => {
  if (!time) return '';

  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;

  const formattedHours = ((hours + 11) % 12) + 1;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${formattedHours}:${String(minutes).padStart(2, '0')} ${suffix}`;
};

export function TeacherBatchAttendancePanel({
  teacherId,
  teacherName,
  teacherEmail,
  title,
  subtitle,
}: TeacherBatchAttendancePanelProps) {
  const { batches, students, attendance, saveAttendance } = useData();
  const { appUser, toggleTeacherStatus } = useAuth();
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentRecords, setCurrentRecords] = useState<Record<string, 'present' | 'absent'>>({});
  const [absenceReasons, setAbsenceReasons] = useState<Record<string, string>>({});
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const teacherBatches = useMemo(() => {
    return batches.filter((batch) => {
      const isOriginalTeacher = batch.teacherId
        ? batch.teacherId === teacherId
        : batch.teacherEmail === teacherEmail;
      const hasActiveSubstituteAssignment = (batch.temporaryTeacherAssignments || []).some((assignment) => (
        assignment.teacherId === teacherId &&
        assignment.startDate <= selectedDate &&
        assignment.endDate >= selectedDate
      ));

      return isOriginalTeacher || hasActiveSubstituteAssignment;
    });
  }, [batches, selectedDate, teacherEmail, teacherId]);

  useEffect(() => {
    if (teacherBatches.length === 0) {
      setSelectedBatchId('');
      return;
    }

    const hasValidSelection = teacherBatches.some((batch) => batch.id === selectedBatchId);
    if (!hasValidSelection) {
      setSelectedBatchId(teacherBatches[0].id);
    }
  }, [teacherBatches, selectedBatchId]);

  const selectedBatch = useMemo(
    () => teacherBatches.find((batch) => batch.id === selectedBatchId) || null,
    [teacherBatches, selectedBatchId]
  );
  const activeSubstituteAssignment = useMemo(() => {
    if (!selectedBatch) return null;

    return (selectedBatch.temporaryTeacherAssignments || []).find((assignment) => (
      assignment.teacherId === teacherId &&
      assignment.startDate <= selectedDate &&
      assignment.endDate >= selectedDate
    )) || null;
  }, [selectedBatch, selectedDate, teacherId]);
  const isSubstituteTeacher = Boolean(
    activeSubstituteAssignment &&
    selectedBatch &&
    selectedBatch.teacherId !== teacherId
  );

  const batchStudents = useMemo(
    () => students.filter((student) => (student.batchIds || []).includes(selectedBatchId)),
    [students, selectedBatchId]
  );

  useEffect(() => {
    if (!selectedBatchId || !selectedDate) {
      setCurrentRecords({});
      return;
    }

    const existingRecord = attendance.find(
      (record) => record.batchId === selectedBatchId && record.date === selectedDate
    );

    if (existingRecord) {
      setCurrentRecords(existingRecord.records);
      setAbsenceReasons(existingRecord.reasons);
      return;
    }

    const initialRecords: Record<string, 'present' | 'absent'> = {};
    const initialReasons: Record<string, string> = {};
    batchStudents.forEach((student) => {
      initialRecords[student.id] = 'present';
      initialReasons[student.id] = '';
    });
    setCurrentRecords(initialRecords);
    setAbsenceReasons(initialReasons);
  }, [attendance, batchStudents, selectedBatchId, selectedDate]);

  const updateStatus = (studentId: string, status: 'present' | 'absent') => {
    setCurrentRecords((prev) => ({
      ...prev,
      [studentId]: status,
    }));

    if (status === 'present') {
      setAbsenceReasons((prev) => ({
        ...prev,
        [studentId]: '',
      }));
    }
  };

  const updateReason = (studentId: string, reason: string) => {
    setAbsenceReasons((prev) => ({
      ...prev,
      [studentId]: reason,
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedBatch) {
      toast.error('Please select a batch first');
      return;
    }

    const missingReason = batchStudents.some((student) => {
      return currentRecords[student.id] === 'absent' && !(absenceReasons[student.id] || '').trim();
    });

    if (missingReason) {
      toast.error('Absent reason is required');
      return;
    }

    await saveAttendance({
      date: selectedDate,
      batchId: selectedBatch.id,
      teacherId,
      teacherName,
      teacherEmail,
      markedBy: teacherId,
      isSubstitute: isSubstituteTeacher,
      records: currentRecords,
      reasons: absenceReasons,
    });
  };

  const handleToggleStatus = async () => {
    try {
      setIsUpdatingStatus(true);
      await toggleTeacherStatus();
      toast.success(appUser?.isActive ? 'Class ended' : 'Class started');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-text">{title}</h1>
          <p className="text-text-muted">{subtitle}</p>
          {selectedBatch && (
            <div className="pt-1 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                Selected Batch: {selectedBatch.name}
              </span>
              {(selectedBatch.startTime || selectedBatch.endTime) && (
                <span className="inline-flex items-center rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  {formatTimeLabel(selectedBatch.startTime || '')}{selectedBatch.startTime && selectedBatch.endTime ? ' - ' : ''}{formatTimeLabel(selectedBatch.endTime || '')}
                </span>
              )}
              {(selectedBatch.days || []).length > 0 && (
                <span className="inline-flex items-center rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  {(selectedBatch.days || []).join(', ')}
                </span>
              )}
              {isSubstituteTeacher && activeSubstituteAssignment && (
                <span className="inline-flex items-center rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  Substitute Active: {activeSubstituteAssignment.startDate} to {activeSubstituteAssignment.endDate}
                </span>
              )}
            </div>
          )}
        </div>
        <Button type="button" className="w-full sm:w-auto" variant={appUser?.isActive ? 'outline' : 'primary'} onClick={handleToggleStatus} isLoading={isUpdatingStatus}>
          {appUser?.isActive ? 'End Class' : 'Start Class'}
        </Button>
      </div>

      <Card className="p-6 space-y-6">
        {teacherBatches.length === 0 ? (
          <div className="py-12 text-center text-text-muted border-2 border-dashed border-border rounded-2xl">
            No batches are assigned to this teacher yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="w-full">
                <label className="block text-sm font-medium text-text-muted mb-1.5 ml-1">
                  Select Batch
                </label>
                <div className="relative">
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 appearance-none shadow-sm"
                  >
                    {teacherBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="w-full">
                <label className="block text-sm font-medium text-text-muted mb-1.5 ml-1">
                  Date
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-3 pl-12 rounded-xl bg-white border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 shadow-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {teacherBatches.map((batch) => {
                const isActive = batch.id === selectedBatchId;

                return (
                  <button
                    key={batch.id}
                    type="button"
                    onClick={() => setSelectedBatchId(batch.id)}
                    className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-white text-text-muted border-border hover:border-primary/30 hover:text-primary'
                    }`}
                  >
                    {batch.name}
                  </button>
                );
              })}
            </div>

            {!selectedBatch ? (
              <div className="py-12 text-center text-text-muted border-2 border-dashed border-border rounded-2xl">
                Please select a batch to continue.
              </div>
            ) : batchStudents.length === 0 ? (
              <div className="py-12 text-center text-text-muted border-2 border-dashed border-border rounded-2xl">
                No students found in this batch.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-text">{selectedBatch.name}</h2>
                    {(selectedBatch.startTime || selectedBatch.endTime) && (
                      <p className="text-xs text-text-muted">
                        {formatTimeLabel(selectedBatch.startTime || '')}{selectedBatch.startTime && selectedBatch.endTime ? ' - ' : ''}{formatTimeLabel(selectedBatch.endTime || '')}
                      </p>
                    )}
                    {(selectedBatch.days || []).length > 0 && (
                      <p className="text-xs text-text-muted">
                        {(selectedBatch.days || []).join(', ')}
                      </p>
                    )}
                    <p className="text-sm text-text-muted">
                      {batchStudents.length} students in this batch
                    </p>
                  </div>
                  <Button onClick={handleSaveAttendance} className="w-full shrink-0 sm:w-auto">
                    <Save className="w-5 h-5 mr-2" />
                    Save Attendance
                  </Button>
                </div>

                <div className="space-y-4">
                  {batchStudents.map((student) => {
                    const status = currentRecords[student.id] || 'present';
                    const isPresent = status === 'present';

                    return (
                      <div
                        key={student.id}
                        className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                          isPresent ? 'border-green-200 bg-green-50/40' : 'border-red-200 bg-red-50/40'
                        }`}
                      >
                        <div>
                          <p className="font-medium text-text">{student.name}</p>
                          <p className="text-sm text-text-muted">{student.email}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={isPresent ? 'primary' : 'outline'}
                            onClick={() => updateStatus(student.id, 'present')}
                          >
                            Present
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={!isPresent ? 'danger' : 'outline'}
                            onClick={() => updateStatus(student.id, 'absent')}
                          >
                            Absent
                          </Button>
                        </div>

                        {!isPresent && (
                          <div className="sm:basis-full sm:pl-0">
                            <input
                              type="text"
                              value={absenceReasons[student.id] || ''}
                              onChange={(e) => updateReason(student.id, e.target.value)}
                              placeholder="Enter absent reason"
                              className="w-full bg-white border border-border rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all shadow-sm"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
