'use client';

import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useId,
} from 'react';
import { createPortal } from 'react-dom';

export type DropdownOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type DropdownProps = {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  size?: 'sm' | 'md';
  ariaLabel?: string;
};

export function Dropdown({
  value,
  onChange,
  options,
  placeholder = 'Chọn...',
  disabled = false,
  className = '',
  buttonClassName = '',
  size = 'md',
  ariaLabel,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => setMounted(true), []);

  const selected = options.find((o) => o.value === value);

  const updateCoords = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({ top: r.bottom + 6, left: r.left, width: r.width });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateCoords();
    const idx = options.findIndex((o) => o.value === value);
    setActiveIndex(idx);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const commit = (opt: DropdownOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
    btnRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      btnRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => {
        let n = i;
        do { n = (n + 1) % options.length; } while (options[n]?.disabled && n !== i);
        return n;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => {
        let n = i;
        do { n = (n - 1 + options.length) % options.length; } while (options[n]?.disabled && n !== i);
        return n;
      });
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt) commit(opt);
    }
  };

  const sizeCls = size === 'sm' ? 'px-4 py-2.5 text-sm' : 'px-4 py-2.5';

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={`relative flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md text-left text-white cursor-pointer hover:border-cyan-400/30 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all disabled:cursor-not-allowed disabled:opacity-50 ${sizeCls} ${buttonClassName}`}
      >
        <span className={`truncate ${selected ? 'text-white' : 'text-slate-500'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
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
            className="max-h-64 overflow-auto rounded-xl border border-white/10 bg-slate-900/95 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl scrollbar-thin"
          >
            {options.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-500">Không có lựa chọn</div>
            )}
            {options.map((opt, i) => {
              const isSelected = opt.value === value;
              const isActive = i === activeIndex;
              return (
                <button
                  key={opt.value || `opt-${i}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={opt.disabled}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => commit(opt)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    isActive ? 'bg-cyan-400/15 text-white' : 'text-slate-200'
                  } ${isSelected ? 'font-semibold' : 'font-normal'}`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <svg className="h-4 w-4 flex-shrink-0 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
