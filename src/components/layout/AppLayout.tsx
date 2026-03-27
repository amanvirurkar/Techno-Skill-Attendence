import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAuth } from '../../context/AuthContext';

export function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-background text-text">
      <div className="blob bg-primary/20 w-96 h-96 top-0 left-0"></div>
      <div className="blob bg-primary-light/20 w-96 h-96 bottom-0 right-0" style={{ animationDelay: '2s' }}></div>
      
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex min-h-screen w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto md:ml-[280px]">
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="flex-1 w-full min-w-0 px-3 py-4 md:px-6 md:py-6 lg:px-10 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
