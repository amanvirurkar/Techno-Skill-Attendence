import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, CalendarCheck, LogOut, X, PieChart, Settings, BellRing, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { LogoutModal } from '../ui/LogoutModal';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { logout, appUser } = useAuth();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const navItems = appUser?.role === 'teacher'
    ? [
        { name: 'Attendance', path: '/teacher', icon: CalendarCheck },
        { name: 'Notice Board', path: '/notice', icon: BellRing },
      ]
    : [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Batches', path: '/batches', icon: BookOpen },
        { name: 'Students', path: '/students', icon: Users },
        { name: 'Teachers', path: '/teachers', icon: UserCircle },
        { name: 'Attendance', path: '/attendance', icon: CalendarCheck },
        { name: 'Analytics', path: '/analytics', icon: PieChart },
        { name: 'Notice Board', path: '/notice', icon: BellRing },
        { name: 'Settings', path: '/admin/settings', icon: Settings },
      ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen w-64 flex-col glass-card transition-transform duration-300 ease-in-out md:m-4 md:h-[calc(100vh-2rem)]',
          isOpen ? 'translate-x-0' : '-translate-x-[120%]',
          'md:translate-x-0'
        )}
      >
        <div className="flex items-center justify-between p-5 md:p-6">
          <div className="flex items-center gap-3">
            <img src="/technoskilllogo.png" alt="Techno Skills" className="h-10 w-auto object-contain" />
          </div>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-text md:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-250 ease-out group',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-text-muted hover:bg-primary/5 hover:text-primary'
                )
              }
            >
              <item.icon className="w-5 h-5 transition-transform group-hover:scale-110 shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-2 shrink-0">
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-colors duration-250 ease-out"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      <LogoutModal 
        isOpen={isLogoutModalOpen} 
        onClose={() => setIsLogoutModalOpen(false)} 
        onConfirm={logout} 
      />
    </>
  );
}
