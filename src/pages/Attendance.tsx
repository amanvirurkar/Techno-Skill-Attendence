import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, CheckCircle2, Download, Save, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TeacherBatchAttendancePanel } from '../components/teacher/TeacherBatchAttendancePanel';

export function Attendance() {
  const { batches, students, attendance, saveAttendance } = useData();
  const { appUser, updateTeacherMobileNumber } = useAuth();
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentRecords, setCurrentRecords] = useState<Record<string, 'present' | 'absent'>>({});
  const [absenceReasons, setAbsenceReasons] = useState<Record<string, string>>({});
  const [teacherMobile, setTeacherMobile] = useState(appUser?.mobile || '');
  const [isSavingTeacherMobile, setIsSavingTeacherMobile] = useState(false);

  React.useEffect(() => {
    setTeacherMobile(appUser?.mobile || '');
  }, [appUser?.mobile]);

  if (appUser?.role === 'teacher') {
    const handleSaveTeacherMobile = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!/^\d{10}$/.test(teacherMobile.trim())) {
        toast.error('Mobile number must be 10 digits');
        return;
      }

      try {
        setIsSavingTeacherMobile(true);
        await updateTeacherMobileNumber(teacherMobile.trim());
        toast.success('Mobile number updated');
      } catch (error: any) {
        toast.error(error.message || 'Failed to update mobile number');
      } finally {
        setIsSavingTeacherMobile(false);
      }
    };

    return (
      <div className="space-y-8">
        <TeacherBatchAttendancePanel
          teacherId={appUser.uid}
          teacherName={appUser.displayName || appUser.email}
          teacherEmail={appUser.email}
          title="Mark Attendance"
          subtitle="View only your assigned batches and save attendance batch-wise."
        />

        <Card className="w-full p-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-text">Update Profile</h2>
            <p className="text-sm text-text-muted mt-1">Add or update your mobile number.</p>
          </div>

          <form onSubmit={handleSaveTeacherMobile} className="space-y-5">
            <Input
              label="Enter Mobile Number"
              type="tel"
              inputMode="numeric"
              placeholder="Enter 10 digit mobile number"
              value={teacherMobile}
              onChange={(e) => setTeacherMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
              required
            />
            <div className="flex justify-end">
              <Button type="submit" className="w-full sm:w-auto" isLoading={isSavingTeacherMobile}>
                Save
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  const selectedBatchData = useMemo(
    () => batches.find((batch) => batch.id === selectedBatch),
    [batches, selectedBatch]
  );

  const batchStudents = useMemo(
    () => students.filter((student) => (student.batchIds || []).includes(selectedBatch)),
    [selectedBatch, students]
  );

  const selectedAttendance = useMemo(() => {
    const existingRecord = attendance.find((record) => (
      record.batchId === selectedBatch && record.date === selectedDate
    ));

    if (!existingRecord) {
      const initialRecords: Record<string, 'present' | 'absent'> = {};
      const initialReasons: Record<string, string> = {};
      batchStudents.forEach((student) => {
        initialRecords[student.id] = 'present';
        initialReasons[student.id] = '';
      });
      return {
        records: initialRecords,
        reasons: initialReasons,
        items: [],
        teacherId: '',
        teacherName: selectedBatchData?.teacherName || '',
        teacherEmail: selectedBatchData?.teacherEmail || '',
        markedBy: '',
        isSubstitute: false,
      };
    }

    return existingRecord;
  }, [attendance, batchStudents, selectedBatch, selectedBatchData?.teacherEmail, selectedDate]);

  React.useEffect(() => {
    setCurrentRecords(selectedAttendance.records);
    setAbsenceReasons(selectedAttendance.reasons);
  }, [selectedAttendance]);

  const toggleStatus = (studentId: string) => {
    setCurrentRecords((prev) => {
      const nextStatus = prev[studentId] === 'present' ? 'absent' : 'present';
      if (nextStatus === 'present') {
        setAbsenceReasons((currentReasons) => ({
          ...currentReasons,
          [studentId]: '',
        }));
      }
      return {
        ...prev,
        [studentId]: nextStatus,
      };
    });
  };

  const handleSave = async () => {
    if (!selectedBatch || !selectedBatchData) {
      toast.error('Please select a batch first');
      return;
    }

    const missingReason = batchStudents.some((student) => (
      currentRecords[student.id] === 'absent' && !(absenceReasons[student.id] || '').trim()
    ));

    if (missingReason) {
      toast.error('Absent reason is required');
      return;
    }

    await saveAttendance({
      date: selectedDate,
      batchId: selectedBatch,
      teacherId: appUser?.uid || '',
      teacherName: appUser?.displayName || selectedBatchData.teacherName || selectedBatchData.teacherEmail || '',
      teacherEmail: appUser?.email || selectedBatchData.teacherEmail || '',
      markedBy: appUser?.uid || '',
      isSubstitute: false,
      records: currentRecords,
      reasons: absenceReasons,
    });
  };

  const markAll = (status: 'present' | 'absent') => {
    const nextRecords: Record<string, 'present' | 'absent'> = {};
    const nextReasons: Record<string, string> = {};
    batchStudents.forEach((student) => {
      nextRecords[student.id] = status;
      nextReasons[student.id] = status === 'absent' ? (absenceReasons[student.id] || '') : '';
    });
    setCurrentRecords(nextRecords);
    setAbsenceReasons(nextReasons);
  };

  const handleDownloadCSV = () => {
    if (!selectedBatch || batchStudents.length === 0) {
      toast.error('No students to download');
      return;
    }

    const batchName = selectedBatchData?.name || 'Unknown Batch';
    const headers = ['Student Name', 'Batch', 'Teacher Name', 'Date', 'Status', 'Reason'];
    const rows = batchStudents.map((student) => {
      const status = currentRecords[student.id] === 'absent' ? 'Absent' : 'Present';
      return [
        `"${student.name}"`,
        `"${batchName}"`,
        `"${selectedBatchData?.teacherName || selectedBatchData?.teacherEmail || ''}"`,
        `"${selectedDate}"`,
        `"${status}"`,
        `"${status === 'Absent' ? (absenceReasons[student.id] || '') : ''}"`,
      ].join(',');
    });

    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Attendance_${batchName.replace(/\s+/g, '_')}_${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Attendance downloaded as CSV');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text">Mark Attendance</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-text-muted">Track daily student presence.</p>
            {(selectedBatchData?.teacherName || selectedBatchData?.teacherEmail) && (
              <>
                <span className="text-border">•</span>
                <span className="text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-md text-sm">
                  Teacher: {selectedBatchData.teacherName || selectedBatchData.teacherEmail}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Button onClick={handleDownloadCSV} variant="outline" className="group w-full shrink-0 sm:w-auto" disabled={!selectedBatch || batchStudents.length === 0}>
            <Download className="w-5 h-5 mr-2 group-hover:-translate-y-1 transition-transform" />
            Download CSV
          </Button>
          <Button onClick={handleSave} className="group w-full shrink-0 sm:w-auto" disabled={!selectedBatch || batchStudents.length === 0}>
            <Save className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
            Save Records
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="w-full">
            <label className="block text-sm font-medium text-text-muted mb-1.5 ml-1">
              Select Batch
            </label>
            <div className="relative">
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 appearance-none shadow-sm"
              >
                <option value="" disabled>Choose a batch...</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>{batch.name}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
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

        {!selectedBatch ? (
          <div className="py-12 text-center text-text-muted border-2 border-dashed border-border rounded-2xl">
            Please select a batch to view students and mark attendance.
          </div>
        ) : batchStudents.length === 0 ? (
          <div className="py-12 text-center text-text-muted border-2 border-dashed border-border rounded-2xl">
            No students found in this batch. Add students first.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-end gap-3 pb-4 border-b border-border">
              <Button variant="outline" size="sm" onClick={() => markAll('present')} className="text-green-600 border-green-200 hover:bg-green-50">
                Mark All Present
              </Button>
              <Button variant="outline" size="sm" onClick={() => markAll('absent')} className="text-red-600 border-red-200 hover:bg-red-50">
                Mark All Absent
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {batchStudents.map((student, index) => {
                const isPresent = currentRecords[student.id] !== 'absent';
                return (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-2xl border-2 transition-all duration-250 hover:scale-[1.01] hover:shadow-[0_8px_25px_rgba(108,99,255,0.08)] ${
                      isPresent ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'
                    }`}
                  >
                    <div onClick={() => toggleStatus(student.id)} className="cursor-pointer flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                          isPresent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-text">{student.name}</p>
                          <p className="text-xs text-text-muted">{student.email}</p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isPresent ? (
                          <CheckCircle2 className="w-6 h-6 text-green-500 drop-shadow-sm" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-500 drop-shadow-sm" />
                        )}
                      </div>
                    </div>

                    {!isPresent && (
                      <div className="mt-4">
                        <input
                          type="text"
                          value={absenceReasons[student.id] || ''}
                          onChange={(e) => setAbsenceReasons((prev) => ({ ...prev, [student.id]: e.target.value }))}
                          placeholder="Enter absent reason"
                          className="w-full bg-white border border-border rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all shadow-sm"
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {selectedBatch && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-text">Batch-wise Attendance</h2>
              <p className="text-text-muted mt-1">Student status, absent reasons, and teacher details.</p>
            </div>
          </div>

          {selectedAttendance.items.length === 0 ? (
            <div className="py-12 text-center text-text-muted border-2 border-dashed border-border rounded-2xl">
              No attendance found for this batch and date.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-4 px-4 font-semibold text-text-muted text-sm uppercase tracking-wider">Student</th>
                    <th className="py-4 px-4 font-semibold text-text-muted text-sm uppercase tracking-wider">Status</th>
                    <th className="py-4 px-4 font-semibold text-text-muted text-sm uppercase tracking-wider">Reason</th>
                    <th className="py-4 px-4 font-semibold text-text-muted text-sm uppercase tracking-wider">Teacher</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAttendance.items.map((item) => {
                    const student = students.find((entry) => entry.id === item.studentId);
                    return (
                      <tr key={item.id} className="border-b border-border/50">
                        <td className="py-4 px-4 text-text font-medium">{student?.name || item.studentId}</td>
                        <td className="py-4 px-4 text-text capitalize">{item.status}</td>
                        <td className="py-4 px-4 text-text-muted">{item.reason || '-'}</td>
                        <td className="py-4 px-4 text-text-muted">{item.teacherName || item.teacherEmail || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
