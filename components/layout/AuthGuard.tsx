// components/layout/AuthGuard.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

interface AuthGuardProps {
  children: React.ReactNode;
  breadcrumbs: { label: string; href?: string }[];
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, breadcrumbs }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-[#5B6BF5]" />
          <p className="text-sm text-gray-500 font-medium">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Avoid flashing content while redirecting
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F7F8FC] text-gray-900 font-sans">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar breadcrumbs={breadcrumbs} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
