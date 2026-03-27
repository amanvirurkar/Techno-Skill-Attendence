import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Mail, UserCircle, Calendar as CalendarIcon, TrendingUp, AlertTriangle, Target, CheckCircle2, XCircle, Clock, BellRing } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Card } from '../components/ui/Card';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { toast } from 'sonner';

export function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { students, batches, attendance, getStudentAttendanceStats, updateStudentTarget } = useData();

  const student = students.find((s) => s.id === id);

  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [newTarget, setNewTarget] = useState(student?.targetAttendance?.toString() || '75');

  const stats = useMemo(() => {
    if (!student) return { present: 0, total: 0, percentage: 0 };
    return getStudentAttendanceStats(student.id);
  }, [student, getStudentAttendanceStats]);

  const isLowAttendance = stats.total > 0 && stats.percentage < 60;
  const targetAttendance = student?.targetAttendance || 75;
  const isBelowTarget = stats.total > 0 && stats.percentage < targetAttendance;

  const attendanceHistory = useMemo(() => {
    if (!student) return [];
    return attendance
      .filter(a => (student.batchIds || []).includes(a.batchId) && a.records[student.id] !== undefined)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort descending for timeline
      .map(a => ({
        date: a.date,
        status: a.records[student.id],
        batchName: batches.find(b => b.id === a.batchId)?.name || 'Unknown Batch'
      }));
  }, [attendance, student, batches]);

  // Data for Pie Chart
  const pieData = [
    { name: 'Present', value: stats.present, color: '#10B981' },
    { name: 'Absent', value: stats.total - stats.present, color: '#EF4444' },
  ];

  // Data for Line Chart (Monthly Trend)
  const lineData = useMemo(() => {
    if (!student) return [];
    const monthlyStats: Record<string, { present: number; total: number }> = {};
    
    // Sort ascending for line chart
    const ascendingHistory = [...attendanceHistory].reverse();
    
    ascendingHistory.forEach(record => {
      const month = format(parseISO(record.date), 'MMM yyyy');
      if (!monthlyStats[month]) monthlyStats[month] = { present: 0, total: 0 };
      monthlyStats[month].total += 1;
      if (record.status === 'present') monthlyStats[month].present += 1;
    });

    return Object.entries(monthlyStats).map(([month, data]) => ({
      month,
      percentage: Math.round((data.present / data.total) * 100),
    }));
  }, [attendanceHistory, student]);

  const handleSaveTarget = async () => {
    const target = parseInt(newTarget, 10);
    if (!isNaN(target) && target >= 0 && target <= 100 && student) {
      await updateStudentTarget(student.id, target);
      setIsEditingTarget(false);
    }
  };

  const handleSendReminder = () => {
    toast.success(`Reminder sent successfully to ${student?.name}`, {
      icon: <BellRing className="w-5 h-5 text-green-500" />,
    });
  };

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-2xl font-bold text-text mb-4">Student Not Found</h2>
        <button onClick={() => navigate('/students')} className="text-primary hover:underline">
          Return to Students
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/students')}
            className="p-2 bg-white border border-border rounded-xl hover:bg-surface transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-text-muted" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-text">Student Profile</h1>
            <p className="text-text-muted mt-1">Detailed view and attendance analytics.</p>
          </div>
        </div>
        {isLowAttendance && (
          <button
            onClick={handleSendReminder}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl font-medium transition-colors"
          >
            <BellRing className="w-4 h-4" />
            Send Reminder
          </button>
        )}
      </div>

      {isLowAttendance && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3"
        >
          <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-800 font-semibold">Low Attendance Warning</h3>
            <p className="text-red-600 text-sm mt-1">
              This student's attendance is below 60%. Consider reaching out to discuss their progress.
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-24 h-24 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-3xl mb-4">
                {student.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-2xl font-bold text-text">{student.name}</h2>
              <p className="text-text-muted text-sm mt-1">ID: {student.id}</p>
            </div>

            <div className="space-y-4 pt-6 border-t border-border">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-text-muted">Email</p>
                  <p className="text-text font-medium">{student.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <UserCircle className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-muted mb-2">Enrolled Batches</p>
                  <div className="space-y-2">
                    {(student.batchIds || []).map(bId => {
                      const b = batches.find(batch => batch.id === bId);
                      return (
                        <div key={bId} className="p-2 rounded-lg bg-purple-50 border border-purple-100">
                          <p className="text-sm font-bold text-purple-700">{b?.name || 'Unknown'}</p>
                          {b?.teacherName && (
                            <p className="text-[10px] text-primary italic">Instructor: {b.teacherName}</p>
                          )}
                        </div>
                      );
                    })}
                    {(student.batchIds || []).length === 0 && (
                      <p className="text-sm text-text-muted italic">No batches assigned</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarIcon className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-text-muted">Joined Date</p>
                  <p className="text-text font-medium">{format(parseISO(student.joinedAt), 'MMMM d, yyyy')}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Goal Tracking */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-text">Attendance Goal</h3>
              </div>
              {isEditingTarget ? (
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={newTarget} 
                    onChange={(e) => setNewTarget(e.target.value)}
                    className="w-16 px-2 py-1 text-sm border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    min="0" max="100"
                  />
                  <button onClick={handleSaveTarget} className="text-xs text-primary font-medium hover:underline">Save</button>
                </div>
              ) : (
                <button onClick={() => setIsEditingTarget(true)} className="text-xs text-text-muted hover:text-primary transition-colors">
                  Edit Target
                </button>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Current: <span className="font-bold text-text">{stats.percentage}%</span></span>
                <span className="text-text-muted">Target: <span className="font-bold text-text">{targetAttendance}%</span></span>
              </div>
              <div className="w-full bg-surface rounded-full h-3 overflow-hidden relative">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${isBelowTarget ? 'bg-orange-400' : 'bg-green-500'}`}
                  style={{ width: `${stats.percentage}%` }}
                />
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-text z-10"
                  style={{ left: `${targetAttendance}%` }}
                />
              </div>
              {isBelowTarget && stats.total > 0 ? (
                <p className="text-xs text-orange-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Currently {targetAttendance - stats.percentage}% below target
                </p>
              ) : stats.total > 0 ? (
                <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  On track to meet attendance goal
                </p>
              ) : null}
            </div>
          </Card>
        </div>

        {/* Analytics & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-6 flex flex-col items-center justify-center text-center">
              <p className="text-text-muted text-sm font-medium mb-2">Total Classes</p>
              <p className="text-4xl font-bold text-text">{stats.total}</p>
            </Card>
            <Card className="p-6 flex flex-col items-center justify-center text-center">
              <p className="text-text-muted text-sm font-medium mb-2">Classes Attended</p>
              <p className="text-4xl font-bold text-green-500">{stats.present}</p>
            </Card>
            <Card className="p-6 flex flex-col items-center justify-center text-center">
              <p className="text-text-muted text-sm font-medium mb-2">Attendance %</p>
              <p className={`text-4xl font-bold ${isLowAttendance ? 'text-red-500' : 'text-primary'}`}>
                {stats.percentage}%
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-text mb-6">Present vs Absent</h3>
              <div className="h-64">
                {stats.total > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-text-muted">No data available</div>
                )}
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm text-text-muted">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm text-text-muted">Absent</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold text-text mb-6">Monthly Trend</h3>
              <div className="h-64">
                {lineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAEAFF" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8E9299', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8E9299', fontSize: 12 }} dx={-10} domain={[0, 100]} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                        formatter={(value: number) => [`${value}%`, 'Attendance']}
                      />
                      <Line type="monotone" dataKey="percentage" stroke="#6C63FF" strokeWidth={3} dot={{ fill: '#6C63FF', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-text-muted">No data available</div>
                )}
              </div>
            </Card>
          </div>
          
          {/* Attendance History Timeline */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-text">Attendance History</h3>
            </div>
            
            {attendanceHistory.length === 0 ? (
              <div className="py-8 text-center text-text-muted">
                No attendance records found for this student.
              </div>
            ) : (
              <div className="relative pl-4 border-l-2 border-border space-y-6">
                {attendanceHistory.map((record, index) => (
                  <motion.div 
                    key={record.date}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative"
                  >
                    <div className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 border-white ${record.status === 'present' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div className="flex items-center justify-between bg-surface/50 p-3 rounded-xl hover:bg-surface transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-text">{format(parseISO(record.date), 'MMMM d, yyyy')}</p>
                          <span className="px-2 py-0.5 rounded-full bg-surface border border-border text-[9px] font-bold text-text-muted uppercase tracking-wider">
                            {record.batchName}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted">{format(parseISO(record.date), 'EEEE')}</p>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${record.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {record.status === 'present' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {record.status}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
