// components/layout/Sidebar.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ClipboardList, 
  BarChart2, 
  Settings, 
  Bell, 
  HelpCircle,
  X,
  ChevronDown,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [testCreationOpen, setTestCreationOpen] = useState(true);

  // Check active states
  const isDashboard = pathname === '/dashboard';
  const isTestCreation = pathname.startsWith('/tests') || pathname === '/dashboard';
  const isTestTracking = false; // placeholder

  const bottomItems = [
    { name: 'Notifications', icon: Bell, href: '#' },
    { name: 'Settings', icon: Settings, href: '#' },
    { name: 'Help & Support', icon: HelpCircle, href: '#' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-45 flex w-60 flex-col bg-white text-gray-700 border-r border-gray-200 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:h-screen`}
      >
        {/* Logo Container */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-100">
          <Link href="/dashboard" className="flex items-center select-none">
            <img
              src="/preproute logo.png"
              alt="Preproute"
              className="h-8 w-auto"
            />
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1.5 hover:bg-gray-100 text-gray-500 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 px-4 py-6">
          {/* Dashboard */}
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              isDashboard
                ? 'border-l-4 border-[#5B6BF5] bg-[#5B6BF5]/5 text-[#5B6BF5] pl-2'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
            onClick={() => setIsOpen(false)}
          >
            <LayoutDashboard size={18} className={isDashboard ? 'text-[#5B6BF5]' : 'text-gray-400'} />
            <span>Dashboard</span>
          </Link>

          {/* Test Creation - Expandable Section */}
          <div>
            <button
              onClick={() => setTestCreationOpen(!testCreationOpen)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                isTestCreation && !isDashboard
                  ? 'border-l-4 border-[#5B6BF5] bg-[#5B6BF5]/5 text-[#5B6BF5] pl-2'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <ClipboardList size={18} className={isTestCreation && !isDashboard ? 'text-[#5B6BF5]' : 'text-gray-400'} />
                <span>Test Creation</span>
              </div>
              {testCreationOpen ? (
                <ChevronDown size={14} className="text-gray-400" />
              ) : (
                <ChevronRight size={14} className="text-gray-400" />
              )}
            </button>

            {/* Sub-items */}
            {testCreationOpen && (
              <div className="ml-7 mt-1 space-y-0.5 border-l border-gray-150 pl-4">
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    pathname === '/dashboard' || pathname.startsWith('/tests')
                      ? 'text-[#5B6BF5] bg-[#5B6BF5]/5'
                      : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    pathname === '/dashboard' || pathname.startsWith('/tests') ? 'bg-[#5B6BF5]' : 'bg-gray-300'
                  }`} />
                  <span>Test creation</span>
                </Link>
                <a
                  href="#"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all cursor-pointer"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                  <span>Test tracking</span>
                </a>
              </div>
            )}
          </div>
        </nav>

        {/* Divider */}
        <div className="h-px bg-gray-100 mx-6" />

        {/* Bottom Navigation */}
        <div className="space-y-1 px-4 py-6">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-950 hover:bg-gray-50 transition-all cursor-pointer"
              >
                <Icon size={18} className="text-gray-400" />
                <span>{item.name}</span>
              </a>
            );
          })}
          
          <button
            onClick={logout}
            className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
          >
            <LogOut size={18} className="text-red-400" />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
