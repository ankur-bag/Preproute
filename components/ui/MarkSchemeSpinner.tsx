// components/ui/MarkSchemeSpinner.tsx
import React from 'react';

interface MarkSchemeSpinnerProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  error?: string;
}

export const MarkSchemeSpinner: React.FC<MarkSchemeSpinnerProps> = ({
  label,
  value,
  onChange,
  min = -10,
  max = 20,
  step = 1,
  error,
}) => {
  const handleIncrement = () => {
    if (value + step <= max) {
      onChange(value + step);
    }
  };

  const handleDecrement = () => {
    if (value - step >= min) {
      onChange(value - step);
    }
  };

  const displayValue = value > 0 ? `+${value}` : `${value}`;

  return (
    <div className="flex flex-col gap-1.5 min-w-[120px]">
      <label className="text-sm font-medium text-gray-700 select-none">
        {label}
      </label>
      <div className="relative flex items-stretch rounded-lg border border-gray-200 bg-white h-[42px] w-full overflow-hidden focus-within:ring-2 focus-within:ring-[#5B6BF5]/20 focus-within:border-[#5B6BF5]">
        <input
          type="text"
          value={displayValue}
          readOnly
          className="w-full text-center text-sm font-semibold text-gray-900 bg-transparent border-none outline-none select-none pl-4 pr-10"
        />
        <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-gray-200 w-9">
          <button
            type="button"
            onClick={handleIncrement}
            disabled={value >= max}
            className="flex-1 flex items-center justify-center hover:bg-gray-50 border-b border-gray-200 text-[10px] text-gray-500 hover:text-[#5B6BF5] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={handleDecrement}
            disabled={value <= min}
            className="flex-1 flex items-center justify-center hover:bg-gray-50 text-[10px] text-gray-500 hover:text-[#5B6BF5] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            ▼
          </button>
        </div>
      </div>
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  );
};
