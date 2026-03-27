import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Phone, Search, UserCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useData } from '../context/DataContext';
import { Card } from '../components/ui/Card';

export function Teachers() {
  const { teachers, batches } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const todayDay = format(new Date(), 'EEE');

  const teacherBatchMap = useMemo(() => {
    return teachers.reduce<Record<string, string[]>>((acc, teacher) => {
      const derivedBatches = batches
        .filter((batch) => (
          batch.teacherId === teacher.uid ||
          (!batch.teacherId && batch.teacherEmail === teacher.email)
        ))
        .map((batch) => batch.name)
        .filter(Boolean);

      const fallbackBatches = (teacher.assignedBatches || []).filter(Boolean);
      acc[teacher.uid] = Array.from(new Set([...(derivedBatches || []), ...fallbackBatches]));
      return acc;
    }, {});
  }, [batches, teachers]);

  const filteredTeachers = useMemo(() => {
    const safeSearch = searchQuery.toLowerCase();

    return teachers.filter((teacher) => (
      (teacher.displayName || '').toLowerCase().includes(safeSearch) ||
      (teacher.email || '').toLowerCase().includes(safeSearch) ||
      (teacher.mobile || '').includes(searchQuery)
    ));
  }, [searchQuery, teachers]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-text">Teachers</h1>
        <p className="text-text-muted mt-1">View teacher profiles, assigned batches, and live status.</p>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input
            type="text"
            placeholder="Search teachers by name, email, or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-border rounded-xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all shadow-sm"
          />
        </div>
      </Card>

      {filteredTeachers.length === 0 ? (
        <div className="py-20 text-center text-text-muted border-2 border-dashed border-border rounded-2xl">
          No teachers found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTeachers.map((teacher, index) => {
            const teacherBatches = batches.filter((batch) => (
              batch.teacherId === teacher.uid ||
              (!batch.teacherId && batch.teacherEmail === teacher.email)
            ));
            const teachingBatches = teacherBatchMap[teacher.uid] || [];
            const batchCount = teachingBatches.length;
            const totalStudents = teacherBatches.reduce((sum, batch) => sum + (batch.studentIds || []).length, 0);
            const todayClasses = teacherBatches.filter((batch) => (batch.days || []).includes(todayDay)).length;
            const workloadTone = totalStudents < 30
              ? {
                  label: 'Low workload',
                  badge: 'text-green-600',
                  dot: 'bg-green-500',
                  bar: 'bg-green-500',
                  track: 'bg-green-100',
                }
              : totalStudents <= 60
                ? {
                    label: 'Medium workload',
                    badge: 'text-yellow-600',
                    dot: 'bg-yellow-500',
                    bar: 'bg-yellow-500',
                    track: 'bg-yellow-100',
                  }
                : {
                    label: 'High workload',
                    badge: 'text-red-600',
                    dot: 'bg-red-500',
                    bar: 'bg-red-500',
                    track: 'bg-red-100',
                  };
            const workloadWidth = Math.min((totalStudents / 90) * 100, 100);

            return (
              <motion.div
                key={teacher.uid}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <Card className="p-6 h-full">
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <UserCircle className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg font-bold text-text truncate">{teacher.displayName || teacher.email}</h2>
                        <p className="text-sm text-text-muted truncate">{teacher.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`h-3 w-3 rounded-full ${teacher.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      <span className={`text-sm font-medium ${teacher.isActive ? 'text-green-600' : 'text-text-muted'}`}>
                        {teacher.isActive ? 'In Class' : 'Offline'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-text-muted">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm">{teacher.mobile || '-'}</span>
                    </div>

                    <div className="rounded-xl border border-border bg-surface p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Workload</p>
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${workloadTone.dot}`}></span>
                          <span className={`text-xs font-semibold ${workloadTone.badge}`}>{workloadTone.label}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-text-muted">Batches</p>
                          <p className="text-lg font-bold text-text">{batchCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-muted">Students</p>
                          <p className="text-lg font-bold text-text">{totalStudents}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-muted">Classes Today</p>
                          <p className="text-lg font-bold text-text">{todayClasses}</p>
                        </div>
                      </div>
                      <div className={`h-2 rounded-full ${workloadTone.track}`}>
                        <div
                          className={`h-2 rounded-full ${workloadTone.bar}`}
                          style={{ width: `${workloadWidth}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2">
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Teaching Batches</p>
                        <p className="text-sm text-text-muted mt-1">
                          {batchCount === 0 ? 'No batches assigned yet' : `${batchCount} ${batchCount === 1 ? 'batch' : 'batches'} assigned`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {batchCount === 0 ? (
                          <span className="text-sm text-text-muted">No batches assigned yet</span>
                        ) : (
                          teachingBatches.map((batchName) => (
                            <span
                              key={`${teacher.uid}-${batchName}`}
                              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary uppercase tracking-wider"
                            >
                              {batchName}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
