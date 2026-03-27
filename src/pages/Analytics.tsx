import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { useData } from '../context/DataContext';
import { Card } from '../components/ui/Card';
import { format, parseISO } from 'date-fns';

export function Analytics() {
  const { students, batches, attendance } = useData();

  // 1. Overall Present/Absent Ratio
  const overallData = useMemo(() => {
    let present = 0;
    let absent = 0;
    attendance.forEach(record => {
      Object.values(record.records).forEach(status => {
        if (status === 'present') present++;
        else absent++;
      });
    });
    return [
      { name: 'Present', value: present, color: '#10B981' },
      { name: 'Absent', value: absent, color: '#EF4444' },
    ];
  }, [attendance]);

  // 2. Batch-wise Performance
  const batchPerformanceData = useMemo(() => {
    return batches.map(batch => {
      let present = 0;
      let total = 0;
      
      attendance.filter(a => a.batchId === batch.id).forEach(record => {
        Object.values(record.records).forEach(status => {
          total++;
          if (status === 'present') present++;
        });
      });

      const percentage = total === 0 ? 0 : Math.round((present / total) * 100);
      
      return {
        name: batch.name,
        percentage,
        present,
        total
      };
    }).sort((a, b) => b.percentage - a.percentage); // Sort by highest attendance
  }, [batches, attendance]);

  // 3. Monthly Attendance Trends
  const monthlyTrendData = useMemo(() => {
    const monthlyStats: Record<string, { present: number; total: number }> = {};
    
    attendance.forEach(record => {
      const month = format(parseISO(record.date), 'MMM yyyy');
      if (!monthlyStats[month]) monthlyStats[month] = { present: 0, total: 0 };
      
      Object.values(record.records).forEach(status => {
        monthlyStats[month].total += 1;
        if (status === 'present') monthlyStats[month].present += 1;
      });
    });

    return Object.entries(monthlyStats)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([month, data]) => ({
        month,
        percentage: Math.round((data.present / data.total) * 100),
      }));
  }, [attendance]);

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-text">Analytics Dashboard</h1>
        <p className="text-text-muted mt-1">Deep dive into attendance metrics and trends.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Ratio */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <Card className="p-6 h-full flex flex-col">
            <h3 className="text-lg font-bold text-text mb-6">Overall Attendance Ratio</h3>
            <div className="flex-1 min-h-[300px] relative">
              {overallData[0].value + overallData[1].value > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={overallData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {overallData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold text-text">
                      {Math.round((overallData[0].value / (overallData[0].value + overallData[1].value)) * 100)}%
                    </span>
                    <span className="text-sm text-text-muted">Avg Present</span>
                  </div>
                </>
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
        </motion.div>

        {/* Batch-wise Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="p-6 h-full flex flex-col">
            <h3 className="text-lg font-bold text-text mb-6">Batch-wise Performance</h3>
            <div className="flex-1 min-h-[300px]">
              {batchPerformanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={batchPerformanceData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAEAFF" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8E9299', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8E9299', fontSize: 12 }} domain={[0, 100]} />
                    <RechartsTooltip 
                      cursor={{ fill: '#F3F4F6', opacity: 0.4 }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                      formatter={(value: number) => [`${value}%`, 'Attendance']}
                    />
                    <Bar dataKey="percentage" fill="#6C63FF" radius={[6, 6, 0, 0]} barSize={40}>
                      {batchPerformanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.percentage >= 75 ? '#10B981' : entry.percentage >= 60 ? '#F59E0B' : '#EF4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-text-muted">No data available</div>
              )}
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-text-muted">&ge; 75%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm text-text-muted">60% - 74%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-text-muted">&lt; 60%</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Monthly Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-3"
        >
          <Card className="p-6 h-full flex flex-col">
            <h3 className="text-lg font-bold text-text mb-6">Monthly Attendance Trends</h3>
            <div className="flex-1 min-h-[350px]">
              {monthlyTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrendData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAEAFF" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8E9299', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8E9299', fontSize: 12 }} domain={[0, 100]} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                      formatter={(value: number) => [`${value}%`, 'Avg Attendance']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="percentage" 
                      stroke="#6C63FF" 
                      strokeWidth={4} 
                      dot={{ fill: '#6C63FF', strokeWidth: 2, r: 6 }} 
                      activeDot={{ r: 8, fill: '#fff', stroke: '#6C63FF', strokeWidth: 2 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-text-muted">No data available</div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
