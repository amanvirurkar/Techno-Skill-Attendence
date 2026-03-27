import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { toast } from 'sonner';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { sendAttendanceStatusEmail } from '../utils/emailService';

export interface Student {
  id: string;
  name: string;
  email: string;
  batchIds: string[];
  joinedAt: string;
  isPinned?: boolean;
  targetAttendance?: number;
}

export interface TeacherSummary {
  uid: string;
  email: string;
  displayName?: string;
  mobile?: string;
  assignedBatches?: string[];
  isActive?: boolean;
}

export interface TemporaryTeacherAssignment {
  teacherId: string;
  teacherName: string;
  startDate: string;
  endDate: string;
}

export interface Batch {
  id: string;
  name: string;
  course?: string;
  startTime?: string;
  endTime?: string;
  days?: string[];
  teacherId?: string;
  teacherEmail?: string;
  teacherName?: string;
  studentIds: string[];
  temporaryTeacherAssignments?: TemporaryTeacherAssignment[];
}

export interface AttendanceItem {
  id: string;
  studentId: string;
  batchId: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  markedBy: string;
  isSubstitute: boolean;
  date: string;
  status: 'present' | 'absent';
  reason: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  batchId: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  markedBy: string;
  isSubstitute: boolean;
  records: Record<string, 'present' | 'absent'>;
  reasons: Record<string, string>;
  items: AttendanceItem[];
}

export interface SaveAttendanceRecord {
  date: string;
  batchId: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  markedBy: string;
  isSubstitute: boolean;
  records: Record<string, 'present' | 'absent'>;
  reasons: Record<string, string>;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  date: string;
  isRead: boolean;
  link?: string;
}

interface SecurityLog {
  id: string;
  email: string;
  time: string;
  type: string;
  device: string;
}

export interface Notice {
  id: string;
  title: string;
  message: string;
  createdBy: string;
  createdAt: string;
}

interface DataContextType {
  students: Student[];
  teachers: TeacherSummary[];
  batches: Batch[];
  attendance: AttendanceRecord[];
  notices: Notice[];
  theme: string;
  setTheme: (theme: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  notifications: Notification[];
  markNotificationAsRead: (id: string) => void;
  addStudent: (student: Omit<Student, 'id' | 'joinedAt'>) => Promise<boolean>;
  deleteStudent: (id: string) => Promise<void>;
  restoreStudent: (student: Student) => Promise<void>;
  togglePinStudent: (id: string) => Promise<void>;
  updateStudentTarget: (id: string, target: number) => Promise<void>;
  addBatch: (
    name: string,
    teacherEmail: string,
    schedule: { startTime: string; endTime: string; days: string[] }
  ) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;
  updateBatchStudents: (batchId: string, studentIds: string[]) => Promise<void>;
  reassignBatch: (batchId: string, newTeacherId: string) => Promise<void>;
  assignTemporaryTeacher: (
    batchId: string,
    assignment: TemporaryTeacherAssignment
  ) => Promise<void>;
  addNotice: (title: string, message: string) => Promise<void>;
  updateNotice: (id: string, title: string, message: string) => Promise<void>;
  deleteNotice: (id: string) => Promise<void>;
  saveAttendance: (record: SaveAttendanceRecord) => Promise<void>;
  restoreAttendance: (records: AttendanceRecord[]) => void;
  getStudentAttendanceStats: (studentId: string, batchId?: string) => { present: number; total: number; percentage: number };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { appUser } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<TeacherSummary[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [theme, setThemeState] = useState<string>('theme-classic');
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const teacherLookup = useMemo(() => {
    return teachers.reduce<Record<string, TeacherSummary>>((acc, teacher) => {
      acc[teacher.email] = teacher;
      return acc;
    }, {});
  }, [teachers]);

  const setTheme = (newTheme: string) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.className = newTheme;
  };

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      setThemeState(storedTheme);
      document.documentElement.className = storedTheme;
    }

    const unsubStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
      const docs = snapshot.docs.map((entry) => ({
        id: entry.id,
        ...entry.data(),
      })) as Student[];
      setStudents(docs);
    });

    const teacherQuery = query(collection(db, 'users'), where('role', '==', 'teacher'));
    const unsubTeachers = onSnapshot(teacherQuery, (snapshot) => {
      const docs = snapshot.docs.map((entry) => {
        const data = entry.data();
        return {
          uid: entry.id,
          email: data.email || '',
          displayName: data.displayName || data.name || '',
          mobile: data.mobile || '',
          assignedBatches: Array.isArray(data.assignedBatches) ? data.assignedBatches : [],
          isActive: data.isActive === true,
        };
      }).filter((teacher) => teacher.email) as TeacherSummary[];
      setTeachers(docs);
    });

    const unsubBatches = onSnapshot(collection(db, 'batches'), (snapshot) => {
      const docs = snapshot.docs.map((entry) => {
        const data = entry.data();
        return {
          id: entry.id,
          name: data.name,
          course: data.course || data.name || '',
          startTime: data.startTime || '',
          endTime: data.endTime || '',
          days: Array.isArray(data.days) ? data.days : [],
          teacherId: data.teacherId || '',
          teacherEmail: data.teacherEmail || '',
          teacherName: data.teacherName || '',
          studentIds: data.studentIds || [],
          temporaryTeacherAssignments: Array.isArray(data.temporaryTeacherAssignments)
            ? data.temporaryTeacherAssignments.map((assignment) => ({
                teacherId: assignment.teacherId || '',
                teacherName: assignment.teacherName || '',
                startDate: assignment.startDate || '',
                endDate: assignment.endDate || '',
              }))
            : [],
        };
      }) as Batch[];
      setBatches(docs);
    });

    const unsubAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      const grouped: Record<string, AttendanceRecord> = {};

      snapshot.docs.forEach((entry) => {
        const data = entry.data();
        const key = `${data.date}_${data.batchId}`;

        if (!grouped[key]) {
          grouped[key] = {
            id: key,
            date: data.date,
            batchId: data.batchId,
            teacherId: data.teacherId || '',
            teacherName: data.teacherName || '',
            teacherEmail: data.teacherEmail || '',
            markedBy: data.markedBy || data.teacherId || '',
            isSubstitute: Boolean(data.isSubstitute),
            records: {},
            reasons: {},
            items: [],
          };
        }

        const item: AttendanceItem = {
          id: entry.id,
          studentId: data.studentId,
          batchId: data.batchId,
          teacherId: data.teacherId || '',
          teacherName: data.teacherName || '',
          teacherEmail: data.teacherEmail || '',
          markedBy: data.markedBy || data.teacherId || '',
          isSubstitute: Boolean(data.isSubstitute),
          date: data.date,
          status: data.status,
          reason: data.reason || '',
        };

        grouped[key].teacherId = grouped[key].teacherId || item.teacherId;
        grouped[key].teacherName = grouped[key].teacherName || item.teacherName;
        grouped[key].teacherEmail = grouped[key].teacherEmail || item.teacherEmail;
        grouped[key].markedBy = grouped[key].markedBy || item.markedBy;
        grouped[key].isSubstitute = grouped[key].isSubstitute || item.isSubstitute;
        grouped[key].records[item.studentId] = item.status;
        grouped[key].reasons[item.studentId] = item.reason;
        grouped[key].items.push(item);
      });

      setAttendance(
        Object.values(grouped).sort((a, b) => {
          if (a.date === b.date) return a.batchId.localeCompare(b.batchId);
          return b.date.localeCompare(a.date);
        })
      );
    });

    const unsubNotices = onSnapshot(collection(db, 'notices'), (snapshot) => {
      const noticeDocs = snapshot.docs.map((entry) => {
        const data = entry.data();
        return {
          id: entry.id,
          title: data.title || '',
          message: data.message || '',
          createdBy: data.createdBy || 'admin',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        };
      }) as Notice[];

      setNotices(noticeDocs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    });

    const unsubSecurityLogs = onSnapshot(collection(db, 'securityLogs'), (snapshot) => {
      const logs = snapshot.docs.map((entry) => {
        const data = entry.data();
        return {
          id: entry.id,
          email: data.email || '',
          time: data.time?.toDate ? data.time.toDate().toISOString() : new Date().toISOString(),
          type: data.type || '',
          device: data.device || '',
        };
      }) as SecurityLog[];

      setSecurityLogs(logs.sort((a, b) => b.time.localeCompare(a.time)));
    });

    return () => {
      unsubStudents();
      unsubTeachers();
      unsubBatches();
      unsubAttendance();
      unsubNotices();
      unsubSecurityLogs();
    };
  }, []);

  const addStudent = async (student: Omit<Student, 'id' | 'joinedAt'>) => {
    try {
      const existingStudents = await getDocs(query(collection(db, 'students'), where('email', '==', student.email)));
      if (!existingStudents.empty) {
        toast.error('Student with this email already exists');
        return false;
      }

      const docRef = await addDoc(collection(db, 'students'), {
        ...student,
        joinedAt: new Date().toISOString(),
        targetAttendance: 75,
        createdAt: serverTimestamp(),
      });

      const batchUpdate = writeBatch(db);
      student.batchIds.forEach((batchId) => {
        const batch = batches.find((entry) => entry.id === batchId);
        if (!batch) return;
        batchUpdate.update(doc(db, 'batches', batchId), {
          studentIds: Array.from(new Set([...(batch.studentIds || []), docRef.id])),
        });
      });
      await batchUpdate.commit();

      toast.success('Student added successfully');
      return true;
    } catch {
      toast.error('Failed to add student');
      return false;
    }
  };

  const deleteStudent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'students', id));

      const batchUpdate = writeBatch(db);
      batches.forEach((batch) => {
        if (!batch.studentIds.includes(id)) return;
        batchUpdate.update(doc(db, 'batches', batch.id), {
          studentIds: batch.studentIds.filter((studentId) => studentId !== id),
        });
      });
      await batchUpdate.commit();

      toast.success('Student deleted');
    } catch {
      toast.error('Failed to delete student');
    }
  };

  const restoreStudent = async (student: Student) => {
    try {
      const { id, ...data } = student;
      await setDoc(doc(db, 'students', id), {
        ...data,
        createdAt: serverTimestamp(),
      });
      toast.success('Student restored');
    } catch {
      toast.error('Failed to restore student');
    }
  };

  const togglePinStudent = async (id: string) => {
    const student = students.find((entry) => entry.id === id);
    if (!student) return;

    try {
      await updateDoc(doc(db, 'students', id), {
        isPinned: !student.isPinned,
      });
    } catch {
      toast.error('Failed to pin student');
    }
  };

  const updateStudentTarget = async (id: string, target: number) => {
    try {
      await updateDoc(doc(db, 'students', id), {
        targetAttendance: target,
      });
    } catch {
      toast.error('Failed to update target');
    }
  };

  const addBatch = async (
    name: string,
    teacherEmail: string,
    schedule: { startTime: string; endTime: string; days: string[] }
  ) => {
    try {
      const assignedTeacher = teacherLookup[teacherEmail];
      await addDoc(collection(db, 'batches'), {
        name,
        course: name,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        days: schedule.days,
        teacherId: assignedTeacher?.uid || '',
        teacherEmail,
        teacherName: assignedTeacher?.displayName || teacherEmail,
        studentIds: [],
        temporaryTeacherAssignments: [],
        createdAt: serverTimestamp(),
      });

      if (assignedTeacher?.uid) {
        await updateDoc(doc(db, 'users', assignedTeacher.uid), {
          assignedBatches: arrayUnion(name),
        });
      }

      toast.success('Batch created');
    } catch {
      toast.error('Failed to create batch');
    }
  };

  const reassignBatch = async (batchId: string, newTeacherId: string) => {
    const batch = batches.find((entry) => entry.id === batchId);
    const newTeacher = teachers.find((entry) => entry.uid === newTeacherId);
    const previousTeacherId = batch?.teacherId || teachers.find((entry) => entry.email === batch?.teacherEmail)?.uid;

    if (!batch || !newTeacher) {
      toast.error('Unable to reassign batch');
      return;
    }

    try {
      const batchUpdate = writeBatch(db);

      batchUpdate.update(doc(db, 'batches', batchId), {
        teacherId: newTeacher.uid,
        teacherEmail: newTeacher.email,
        teacherName: newTeacher.displayName || newTeacher.email,
      });

      if (previousTeacherId && previousTeacherId !== newTeacher.uid) {
        batchUpdate.update(doc(db, 'users', previousTeacherId), {
          assignedBatches: arrayRemove(batch.name),
        });
      }

      batchUpdate.update(doc(db, 'users', newTeacher.uid), {
        assignedBatches: arrayUnion(batch.name),
      });

      await batchUpdate.commit();
      toast.success('Batch reassigned successfully');
    } catch {
      toast.error('Failed to reassign batch');
    }
  };

  const deleteBatch = async (id: string) => {
    try {
      const batch = batches.find((entry) => entry.id === id);
      const previousTeacherId = batch?.teacherId || teachers.find((entry) => entry.email === batch?.teacherEmail)?.uid;
      await deleteDoc(doc(db, 'batches', id));

      if (previousTeacherId && batch?.name) {
        await updateDoc(doc(db, 'users', previousTeacherId), {
          assignedBatches: arrayRemove(batch.name),
        });
      }

      toast.success('Batch deleted');
    } catch {
      toast.error('Failed to delete batch');
    }
  };

  const updateBatchStudents = async (batchId: string, studentIds: string[]) => {
    try {
      await updateDoc(doc(db, 'batches', batchId), { studentIds });

      const batchUpdate = writeBatch(db);
      students.forEach((student) => {
        const currentBatchIds = student.batchIds || [];
        const isCurrentlyIn = currentBatchIds.includes(batchId);
        const shouldBeIn = studentIds.includes(student.id);

        if (isCurrentlyIn && !shouldBeIn) {
          batchUpdate.update(doc(db, 'students', student.id), {
            batchIds: currentBatchIds.filter((id) => id !== batchId),
          });
        } else if (!isCurrentlyIn && shouldBeIn) {
          batchUpdate.update(doc(db, 'students', student.id), {
            batchIds: [...currentBatchIds, batchId],
          });
        }
      });
      await batchUpdate.commit();
      toast.success('Batch enrollment updated');
    } catch {
      toast.error('Failed to update batch enrollment');
    }
  };

  const assignTemporaryTeacher = async (
    batchId: string,
    assignment: TemporaryTeacherAssignment
  ) => {
    const batch = batches.find((entry) => entry.id === batchId);
    if (!batch) {
      toast.error('Batch not found');
      return;
    }

    try {
      const nextAssignments = [...(batch.temporaryTeacherAssignments || []), assignment];
      await updateDoc(doc(db, 'batches', batchId), {
        temporaryTeacherAssignments: nextAssignments,
      });
      toast.success('Substitute teacher assigned');
    } catch {
      toast.error('Failed to assign substitute teacher');
    }
  };

  const addNotice = async (title: string, message: string) => {
    try {
      await addDoc(collection(db, 'notices'), {
        title,
        message,
        createdBy: 'admin',
        createdAt: serverTimestamp(),
      });
      toast.success('Notice added');
    } catch {
      toast.error('Failed to add notice');
    }
  };

  const updateNotice = async (id: string, title: string, message: string) => {
    try {
      await updateDoc(doc(db, 'notices', id), {
        title,
        message,
      });
      toast.success('Notice updated');
    } catch {
      toast.error('Failed to update notice');
    }
  };

  const deleteNotice = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notices', id));
      toast.success('Notice deleted');
    } catch {
      toast.error('Failed to delete notice');
    }
  };

  const saveAttendance = async (record: SaveAttendanceRecord) => {
    try {
      const batchRef = writeBatch(db);

      const existing = await getDocs(
        query(
          collection(db, 'attendance'),
          where('date', '==', record.date),
          where('batchId', '==', record.batchId)
        )
      );

      const existingByStudent = existing.docs.reduce<Record<string, ReturnType<typeof doc>>>((acc, entry) => {
        const data = entry.data();
        acc[data.studentId] = entry.ref;
        return acc;
      }, {});

      let hasAbsentReason = false;

      Object.entries(record.records).forEach(([studentId, status]) => {
        const reason = status === 'absent' ? (record.reasons[studentId] || '').trim() : '';

        if (status === 'absent' && reason) {
          hasAbsentReason = true;
        }

        const payload = {
          studentId,
          batchId: record.batchId,
          teacherId: record.teacherId,
          teacherName: record.teacherName,
          teacherEmail: record.teacherEmail,
          markedBy: record.markedBy,
          isSubstitute: record.isSubstitute,
          date: record.date,
          status,
          reason,
          updatedAt: serverTimestamp(),
        };

        const existingRef = existingByStudent[studentId];
        if (existingRef) {
          batchRef.update(existingRef, payload);
        } else {
          batchRef.set(doc(collection(db, 'attendance')), {
            ...payload,
            createdAt: serverTimestamp(),
          });
        }
      });

      await batchRef.commit();

      await Promise.all(
        Object.entries(record.records).map(async ([studentId, status]) => {
          const student = students.find((entry) => entry.id === studentId);
          if (!student?.email) return;

          const reason = status === 'absent' ? (record.reasons[studentId] || '').trim() : '';

          try {
            await sendAttendanceStatusEmail(
              student.email,
              student.name || 'Student',
              status,
              reason
            );
          } catch (error) {
            console.error('Failed to send attendance email:', error);
          }
        })
      );

      toast.success('Attendance saved');
      if (hasAbsentReason) {
        toast.success('Reason added');
      }
    } catch {
      toast.error('Failed to save attendance');
    }
  };

  const restoreAttendance = (_records: AttendanceRecord[]) => {};

  const getStudentAttendanceStats = useCallback((studentId: string, batchId?: string) => {
    let present = 0;
    let total = 0;

    attendance.forEach((record) => {
      if (batchId && record.batchId !== batchId) return;
      if (record.records[studentId] === undefined) return;

      total += 1;
      if (record.records[studentId] === 'present') {
        present += 1;
      }
    });

    return {
      present,
      total,
      percentage: total === 0 ? 0 : Math.round((present / total) * 100),
    };
  }, [attendance]);

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((notification) => (
      notification.id === id ? { ...notification, isRead: true } : notification
    )));
  };

  useEffect(() => {
    const newNotifications: Notification[] = [];

    const lowAttendance = students.filter((student) => {
      const stats = getStudentAttendanceStats(student.id);
      return stats.total > 0 && stats.percentage < 60;
    });

    if (lowAttendance.length > 0) {
      newNotifications.push({
        id: 'low-attendance-alert',
        title: 'Low Attendance Warning',
        message: `${lowAttendance.length} students have attendance below 60%.`,
        type: 'warning',
        date: new Date().toISOString(),
        isRead: false,
        link: '/dashboard',
      });
    }

    const absencesWithReasons = attendance.filter((record) =>
      Object.values(record.reasons).some((reason) => typeof reason === 'string' && Boolean(reason.trim()))
    );

    if (absencesWithReasons.length > 0) {
      newNotifications.push({
        id: 'attendance-reasons',
        title: 'Attendance Reasons Recorded',
        message: `${absencesWithReasons.length} attendance entries include absent reasons.`,
        type: 'info',
        date: new Date().toISOString(),
        isRead: false,
        link: '/attendance',
      });
    }

    if (appUser?.role === 'admin') {
      securityLogs
        .filter((log) => log.type === 'unauthorized_admin_access' || log.type === 'otp_verification_required')
        .slice(0, 5)
        .forEach((log) => {
          newNotifications.push({
            id: `security-${log.id}`,
            title: log.type === 'otp_verification_required'
              ? 'OTP verification required for admin login'
              : 'Someone tried to access admin panel',
            message: `${log.email} • ${log.device}`,
            type: 'error',
            date: log.time,
            isRead: false,
            link: '/dashboard',
          });
        });
    }

    if (appUser?.role === 'teacher' && notices.length > 0) {
      const latestNotice = notices[0];
      newNotifications.push({
        id: `notice-${latestNotice.id}`,
        title: 'New notice added',
        message: latestNotice.title,
        type: 'info',
        date: latestNotice.createdAt,
        isRead: false,
        link: '/notice',
      });
    }

    setNotifications(newNotifications);
  }, [appUser?.role, attendance, getStudentAttendanceStats, notices, securityLogs, students]);

  return (
    <DataContext.Provider
      value={{
        students,
        teachers,
        batches,
        attendance,
        notices,
        theme,
        setTheme,
        searchQuery,
        setSearchQuery,
        notifications,
        markNotificationAsRead,
        addStudent,
        deleteStudent,
        restoreStudent,
        togglePinStudent,
        updateStudentTarget,
        addBatch,
        deleteBatch,
        updateBatchStudents,
        reassignBatch,
        assignTemporaryTeacher,
        addNotice,
        updateNotice,
        deleteNotice,
        saveAttendance,
        restoreAttendance,
        getStudentAttendanceStats,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
