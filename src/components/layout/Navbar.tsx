import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Menu, Users, BookOpen, Palette } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';

interface NavbarProps {
  onMenuClick: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { user, appUser } = useAuth();
  const { theme, setTheme, notifications, markNotificationAsRead } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const themeRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const unreadCount = (notifications || []).filter(n => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTitle = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'Techno Skills Dashboard';
    if (path === '/students') return 'Students Management';
    if (path === '/teachers') return 'Teachers Management';
    if (path.startsWith('/students/')) return 'Student Profile';
    if (path === '/batches') return 'Batch Management';
    if (path === '/attendance') return 'Attendance Tracking';
    if (path === '/analytics') return 'Analytics Overview';
    if (path === '/notice' || path === '/notices') return 'Notice Board';
    if (path === '/teacher') return 'Mark Attendance';
    if (path === '/admin/settings') return 'Security Settings';
    if (path === '/verify-otp') return 'Verify OTP';
    return 'Techno Skills';
  };

  const themes = [
    { id: 'theme-classic', name: 'Classic Purple', color: '#6C63FF' },
    { id: 'theme-vibrant', name: 'Vibrant Violet', color: '#9333EA' },
    { id: 'theme-deep', name: 'Deep Indigo', color: '#4F46E5' },
  ];

  return (
    <header className="sticky top-0 z-10 mx-0 flex h-16 w-full min-w-0 items-center justify-between gap-3 rounded-b-2xl glass px-3 shadow-sm md:h-20 md:px-6 lg:px-10">
      <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 text-text-muted transition-colors hover:text-text md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-base font-semibold text-text md:text-xl">
          {getTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4 lg:gap-6">
        <div className="relative" ref={themeRef}>
          <button 
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="p-2 text-text-muted hover:text-primary transition-colors rounded-full hover:bg-surface"
            title="Theme Settings"
          >
            <Palette className="w-5 h-5" />
          </button>
          
          {showThemeMenu && (
            <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-white p-2 shadow-lg">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider px-3 py-2 mb-1">Theme Color</div>
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setShowThemeMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${theme === t.id ? 'bg-surface text-primary font-medium' : 'text-text hover:bg-surface/50'}`}
                >
                  <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: t.color }} />
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-text-muted hover:text-primary transition-colors rounded-full hover:bg-surface"
          >
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-surface"></span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-border bg-white shadow-xl">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-bold text-text">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-text-muted">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => {
                        markNotificationAsRead(n.id);
                        if (n.link) navigate(n.link);
                        setShowNotifications(false);
                      }}
                      className={`p-4 border-b border-border last:border-0 hover:bg-surface cursor-pointer transition-colors ${!n.isRead ? 'bg-primary/5' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.type === 'warning' ? 'bg-orange-500' : n.type === 'error' ? 'bg-red-500' : 'bg-primary'}`} />
                        <div>
                          <p className="text-sm font-semibold text-text">{n.title}</p>
                          <p className="text-xs text-text-muted mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-text-muted mt-2">{format(new Date(n.date), 'MMM d, h:mm a')}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 border-l border-border pl-2 md:gap-3 md:pl-4 lg:pl-6">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-text">{user?.displayName || user?.email?.split('@')[0] || 'Admin'}</p>
            <p className="text-xs text-text-muted">{appUser?.role === 'teacher' ? 'Teacher' : 'Administrator'}</p>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full gradient-bg text-sm font-bold text-white shadow-md md:h-10 md:w-10">
            {(user?.displayName?.[0] || user?.email?.[0] || 'A').toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
