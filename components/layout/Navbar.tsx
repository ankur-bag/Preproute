// components/layout/Navbar.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, Menu, User as UserIcon, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface NavbarProps {
  breadcrumbs: Breadcrumb[];
  onMenuClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ breadcrumbs, onMenuClick }) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Left side: Hamburger + Breadcrumbs */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-1.5 hover:bg-gray-50 text-gray-500 lg:hidden focus:outline-none"
        >
          <Menu size={20} />
        </button>

        <nav className="flex items-center text-sm font-medium text-gray-500" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="mx-2 text-gray-300">/</span>}
              {idx === breadcrumbs.length - 1 ? (
                <span className="text-gray-900 font-semibold select-none">{crumb.label}</span>
              ) : (
                <span className="hover:text-gray-900 select-none">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right side: Bell + Profile */}
      <div className="flex items-center gap-4">
        {/* Bell Icon */}
        <button className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-500 focus:outline-none">
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-gray-200" />

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 rounded-lg py-1 px-2.5 hover:bg-gray-50 text-left focus:outline-none transition-all select-none"
          >
            {/* Avatar Bubble */}
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5B6BF5]/10 text-sm font-semibold text-[#5B6BF5]">
              {getInitials(user?.name)}
            </div>

            {/* Name and Role */}
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-gray-900 leading-tight">
                {user?.name || 'Loading...'}
              </p>
              <p className="text-xs text-gray-400 font-medium">
                {user?.role || 'User'}
              </p>
            </div>

            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {/* Profile Popover */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 z-50 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              <div className="px-4 py-2 border-b border-gray-100 md:hidden">
                <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-400">{user?.role}</p>
              </div>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 focus:outline-none font-medium text-left transition-all"
              >
                <LogOut size={16} />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
