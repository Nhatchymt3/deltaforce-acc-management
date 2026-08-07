'use client';

import {
  useState,
  useRef,
  useEffect,
  useId,
} from 'react';
import { createPortal } from 'react-dom';

export type MultiDropdownOption = {
  value: string;
  label: string;
};

type MultiDropdownProps = {
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  options: MultiDropdownOption[];
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
};

export function MultiDropdown({
  selectedValues,
  onChange,
  options,
  placeholder = 'Chọn AE...',
  className = '',
  ariaLabel,
}: MultiDropdownProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => setMounted(true), []);

  const isAll = selectedValues.length === 0;

  const updateCoords = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({ top: r.bottom + 6, left: r.left, width: r.width });
  };

  useEffect(() => {
    if (!open) return;
    updateCoords();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updateCoords();
    const onResize = () => updateCoords();
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const toggleOption = (val: string) => {
    if (val === 'all') {
      onChange([]);
      return;
    }

    if (selectedValues.includes(val)) {
      const next = selectedValues.filter((v) => v !== val);
      onChange(next);
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const labelText = isAll
    ? 'Tất cả AE'
    : selectedValues.length === 1
    ? options.find((o) => o.value === selectedValues[0])?.label ?? placeholder
    : `${selectedValues.length} AE đã chọn`;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className="relative flex w-full items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-gunmetal/80 text-left text-white cursor-pointer hover:border-brass/30 focus:border-brass/40 focus:outline-none focus:ring-1 focus:ring-brass/20 transition-all px-4 py-2.5"
      >
        <span className="truncate text-sm text-white">
          {labelText}
        </span>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-ash transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {mounted && open && coords &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            id={listId}
            style={{ position: 'fixed', top: coords.top, left: coords.left, minWidth: coords.width, zIndex: 9999 }}
            className="max-h-64 overflow-auto rounded-lg border border-white/[0.06] bg-gunmetal p-1 shadow-2xl shadow-black/60 scrollbar-thin"
          >
            {/* Option: Tất cả */}
            <button
              type="button"
              onClick={() => toggleOption('all')}
              className={`flex w-full items-center gap-2.5 rounded px-3 py-1.5 text-left text-sm transition-colors hover:bg-brass/10 text-gray-300 ${
                isAll ? 'font-semibold text-brass' : ''
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                  isAll ? 'border-brass bg-brass text-midnight' : 'border-white/20 bg-midnight'
                }`}
              >
                {isAll && (
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span>Tất cả AE</span>
            </button>

            <div className="my-1 h-px bg-white/[0.06]" />

            {options.map((opt) => {
              const isChecked = selectedValues.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleOption(opt.value)}
                  className={`flex w-full items-center gap-2.5 rounded px-3 py-1.5 text-left text-sm transition-colors hover:bg-brass/10 text-gray-300 ${
                    isChecked ? 'font-semibold' : ''
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                      isChecked ? 'border-brass bg-brass text-midnight' : 'border-white/20 bg-midnight'
                    }`}
                  >
                    {isChecked && (
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
