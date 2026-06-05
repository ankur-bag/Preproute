// components/ui/MultiSelect.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label?: string;
  error?: string;
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  error,
  options,
  value,
  onChange,
  placeholder = 'Select options...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOption = (optVal: string) => {
    if (value.includes(optVal)) {
      onChange(value.filter((v) => v !== optVal));
    } else {
      onChange([...value, optVal]);
    }
  };

  const handleRemoveValue = (optVal: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optVal));
  };

  const handleContainerClick = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 10);
    }
  };

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOptions = options.filter((opt) => value.includes(opt.value));

  return (
    <div className="w-full flex flex-col gap-1.5" ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-gray-700 select-none">
          {label}
        </label>
      )}
      
      <div className="relative">
        <div
          onClick={handleContainerClick}
          className={`min-h-[42px] w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 flex flex-wrap items-center gap-1.5 pr-8 cursor-pointer select-none focus-within:ring-2 focus-within:ring-[#5B6BF5]/20 focus-within:border-[#5B6BF5] ${
            disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''
          } ${error ? 'border-red-500' : ''}`}
        >
          {selectedOptions.length === 0 && !isOpen && (
            <span className="text-sm text-gray-400 pl-1">{placeholder}</span>
          )}

          {selectedOptions.map((opt) => (
            <div
              key={opt.value}
              className="flex items-center gap-1 bg-gray-100 text-gray-800 text-xs font-medium pl-2.5 pr-1.5 py-1 rounded-full border border-gray-200"
            >
              <span>{opt.label}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={(e) => handleRemoveValue(opt.value, e)}
                className="hover:bg-gray-200 rounded-full p-0.5 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <X size={12} />
              </button>
            </div>
          ))}

          {isOpen && (
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Search..."
              className="flex-1 min-w-[60px] bg-transparent border-none outline-none p-0 text-sm text-gray-900 focus:ring-0"
            />
          )}

          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1.5 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3.5 py-2.5 text-sm text-gray-500">No options found</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleToggleOption(opt.value)}
                    className={`flex items-center justify-between px-3.5 py-2 text-sm cursor-pointer select-none hover:bg-gray-50 ${
                      isSelected ? 'text-[#5B6BF5] font-medium bg-[#5B6BF5]/5' : 'text-gray-700'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check size={16} className="text-[#5B6BF5]" />}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  );
};
