import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Users, BookOpen, TrendingUp, Calendar, AlertTriangle, Trophy, Medal, Lightbulb, UserX, AlertCircle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { format, parseISO, subDays } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export function Dashboard() {
  const { students, batches, attendance, getStudentAttendanceStats, searchQuery } = useData();
  const { appUser, transferAdminOwnership } = useAuth();
  const navigate = useNavigate();
  const [ownershipEmail, setOwnershipEmail] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const safeSearch = (searchQuery || "").toLowerCase();

  const filteredStudents = useMemo(() => {
    if (!safeSearch) return [];
    return (students || []).filter(s => 
      (s?.name || "").toLowerCase().includes(safeSearch) || 
      (s?.email || "").toLowerCase().includes(safeSearch)
    );
  }, [students, safeSearch]);

  const filteredBatches = useMemo(() => {
    if (!safeSearch) return [];
    return (batches || []).filter(b => 
      (b?.name || "").toLowerCase().includes(safeSearch) || 
      (b?.teacherName || "").toLowerCase().includes(safeSearch)
    );
  }, [batches, safeSearch]);

  // If searching, show "Blank Page" with results
  if (searchQuery) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold text-text">Search Results</h1>
          <p className="text-text-muted mt-1">Found results for "{searchQuery}"</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section>
            <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Students ({filteredStudents.length})
            </h3>
            <div className="space-y-3">
              {filteredStudents.length === 0 ? (
                <p className="text-sm text-text-muted bg-surface p-4 rounded-xl border border-dashed border-border">No students found.</p>
              ) : (
                filteredStudents.map(s => (
                  <div key={s.id}>
                    <Card onClick={() => navigate(`/students/${s.id}`)} className="p-4 hover:border-primary/30 cursor-pointer group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                            {s.name[0].toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-semibold text-text group-hover:text-primary transition-colors">{s.name}</h4>
                            <p className="text-xs text-text-muted">{s.email}</p>
                          </div>
                        </div>
                        <TrendingUp className="w-4 h-4 text-text-muted" />
                      </div>
                    </Card>
                  </div>
                ))
              )}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-500" />
              Batches ({filteredBatches.length})
            </h3>
            <div className="space-y-3">
              {filteredBatches.length === 0 ? (
                <p className="text-sm text-text-muted bg-surface p-4 rounded-xl border border-dashed border-border">No batches found.</p>
              ) : (
                filteredBatches.map(b => (
                  <div key={b.id}>
                    <Card onClick={() => navigate(`/batches`)} className="p-4 hover:border-purple-300 cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-text group-hover:text-purple-600 transition-colors">{b.name}</h4>
                          <p className="text-xs text-text-muted">{b.teacherName || 'No instructor'}</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalStudents = (students || []).length;
  const totalBatches = (batches || []).length;
  
  // Calculate overall attendance %
  let totalPresent = 0;
  let totalRecords = 0;
  (attendance || []).forEach((record) => {
    Object.values(record?.records || {}).forEach((status) => {
      totalRecords++;
      if (status === 'present') totalPresent++;
    });
  });
  const attendancePercentage = totalRecords === 0 ? 0 : Math.round((totalPresent / totalRecords) * 100);



  // Real data for charts
  const barData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(new Date(), 6 - i);
      return format(d, 'yyyy-MM-dd');
    });

    return last7Days.map(dateStr => {
      const recordsForDate = (attendance || []).filter(a => a?.date === dateStr);
      let present = 0;
      let absent = 0;
      
      recordsForDate.forEach(record => {
        Object.values(record?.records || {}).forEach(status => {
          if (status === 'present') present++;
          else absent++;
        });
      });

      return {
        name: format(parseISO(dateStr), 'EEE'), // Mon, Tue, etc.
        present,
        absent,
      };
    });
  }, [attendance]);

  const pieData = [
    { name: 'Present', value: totalPresent },
    { name: 'Absent', value: totalRecords - totalPresent },
  ];
  const COLORS = ['#6C63FF', '#FF6B6B'];

  const stats = [
    { title: 'Total Students', value: totalStudents, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Active Batches', value: totalBatches, icon: BookOpen, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'Avg. Attendance', value: `${attendancePercentage}%`, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
    { title: 'Classes Today', value: (attendance || []).filter(a => a?.date === format(new Date(), 'yyyy-MM-dd')).length, icon: Calendar, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  const topStudents = useMemo(() => {
    return (students || [])
      .map(student => ({
        ...student,
        stats: getStudentAttendanceStats(student?.id || '')
      }))
      .filter(s => s.stats.total > 0)
      .sort((a, b) => b.stats.percentage - a.stats.percentage)
      .slice(0, 5);
  }, [students, getStudentAttendanceStats]);

  // Smart Insights Data
  const insights = useMemo(() => {
    const lowAttendance = (students || []).filter(s => {
      const stats = getStudentAttendanceStats(s?.id || '');
      return stats.total > 0 && stats.percentage < 60;
    });

    const irregular = (students || []).filter(s => {
      const history = (attendance || [])
        .filter(a => (s?.batchIds || []).includes(a?.batchId) && a?.records?.[s?.id || ''] !== undefined)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map(a => a?.records?.[s?.id || '']);
      
      // Irregular if absent for the last 3 consecutive classes
      return history.length >= 3 && history.slice(0, 3).every(status => status === 'absent');
    });

    return { lowAttendance, irregular };
  }, [students, attendance, getStudentAttendanceStats]);

  const handleOwnershipTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ownershipEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    try {
      setIsTransferring(true);
      await transferAdminOwnership(ownershipEmail);
      toast.success('Ownership transferred successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to transfer ownership');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Dashboard Overview</h1>
          <p className="text-text-muted mt-1">Welcome back! Here's what's happening today.</p>
        </div>
      </div>

      {/* Smart Insights Section */}
      {(insights.lowAttendance.length > 0 || insights.irregular.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 border-l-4 border-l-orange-500 bg-orange-50/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                <Lightbulb className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-text">Smart Insights</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.lowAttendance.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    <h4 className="font-semibold text-text text-sm">Low Attendance Alert</h4>
                  </div>
                  <p className="text-sm text-text-muted mb-3">
                    <span className="font-bold text-orange-600">{insights.lowAttendance.length}</span> students have attendance below 60%.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {insights.lowAttendance.slice(0, 3).map(s => (
                      <span key={s.id} onClick={() => navigate(`/students/${s.id}`)} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-md cursor-pointer hover:bg-orange-200 transition-colors">
                        {s.name}
                      </span>
                    ))}
                    {insights.lowAttendance.length > 3 && (
                      <span className="text-xs bg-surface text-text-muted px-2 py-1 rounded-md">
                        +{insights.lowAttendance.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {insights.irregular.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <UserX className="w-4 h-4 text-red-500" />
                    <h4 className="font-semibold text-text text-sm">Irregular Students</h4>
                  </div>
                  <p className="text-sm text-text-muted mb-3">
                    <span className="font-bold text-red-600">{insights.irregular.length}</span> students absent for 3+ consecutive classes.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {insights.irregular.slice(0, 3).map(s => (
                      <span key={s.id} onClick={() => navigate(`/students/${s.id}`)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-md cursor-pointer hover:bg-red-200 transition-colors">
                        {s.name}
                      </span>
                    ))}
                    {insights.irregular.length > 3 && (
                      <span className="text-xs bg-surface text-text-muted px-2 py-1 rounded-md">
                        +{insights.irregular.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover-card group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-muted">{stat.title}</p>
                  <h3 className="text-3xl font-bold text-text mt-1">{stat.value}</h3>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="h-[400px] flex flex-col">
            <h3 className="text-lg font-bold text-text mb-6">Weekly Attendance Trends</h3>
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} />
                  <Tooltip
                    cursor={{ fill: 'var(--bg)', opacity: 0.4 }}
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="present" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar dataKey="absent" fill="#FF6B6B" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="h-[400px] flex flex-col">
            <h3 className="text-lg font-bold text-text mb-6">Overall Distribution</h3>
            <div className="flex-1 w-full h-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-text">{attendancePercentage}%</span>
                <span className="text-sm text-text-muted">Present</span>
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary"></div>
                <span className="text-sm text-text-muted">Present</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <span className="text-sm text-text-muted">Absent</span>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text">Top Performers Leaderboard</h3>
                <p className="text-sm text-text-muted">Students with the highest attendance records.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(topStudents || []).length === 0 ? (
              <div className="col-span-full py-8 text-center text-text-muted">
                No attendance data available yet to generate leaderboard.
              </div>
            ) : (
              (topStudents || []).map((student, index) => (
                <div 
                  key={student?.id || index} 
                  onClick={() => navigate(`/students/${student?.id}`)}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all cursor-pointer bg-white group"
                >
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${index === 0 ? 'bg-yellow-100 text-yellow-600' : index === 1 ? 'bg-gray-100 text-gray-600' : index === 2 ? 'bg-orange-100 text-orange-600' : 'bg-primary/10 text-primary'}`}>
                      {(student?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    {index < 3 && (
                      <div className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 shadow-sm">
                        <Medal className={`w-5 h-5 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : 'text-orange-500'}`} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-text truncate group-hover:text-primary transition-colors">{student.name}</h4>
                    <p className="text-xs text-text-muted truncate">{student.email}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-text">{student.stats.percentage}%</div>
                    <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Attendance</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </motion.div>

      {appUser?.role === 'admin' && appUser.isMainAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-text">Transfer Admin Ownership</h3>
              <p className="text-sm text-text-muted mt-1">Transfer main admin access to another registered user by email.</p>
            </div>

            <form onSubmit={handleOwnershipTransfer} className="space-y-5">
              <Input
                label="Email Address"
                type="email"
                placeholder="Enter registered user email"
                value={ownershipEmail}
                onChange={(e) => setOwnershipEmail(e.target.value)}
                required
              />
              <div className="flex justify-end">
                <Button type="submit" className="w-full sm:w-auto" isLoading={isTransferring}>
                  Transfer Ownership
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
