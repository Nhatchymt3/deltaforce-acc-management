'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

export type DropdownOption = {
  value: string;
  label: ReactNode;
  /** Optional plain-text used when rendering the selected value in the trigger. */
  labelText?: string;
};

type DropdownProps = {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  /** Extra classes applied to the trigger button wrapper (e.g. width). */
  className?: string;
  disabled?: boolean;
  /** When true the trigger stretches to fill its container. */
  fullWidth?: boolean;
};

export function Dropdown({
  value,
  onChange,
  options,
  placeholder = 'Chọn...',
  className = '',
  disabled = false,
  fullWidth = false,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const selected = options.find((o) => o.value === value);

  const updateCoords = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const toggle = useCallback(() => {
    if (disabled) return;
    if (!open) updateCoords();
    setOpen((o) => !o);
  }, [disabled, open, updateCoords]);

  useEffect(() => {
    if (!open) return;

    function handlePointer(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    function handleReposition() {
      updateCoords();
    }

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open, updateCoords]);

  function handleSelect(v: string) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div className={`relative group ${fullWidth ? 'w-full' : ''} ${className}`}>
      <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 to-violet-400 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none" />
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        disabled={disabled}
        className={`relative flex items-center justify-between gap-2 rounded-xl border bg-white/5 backdrop-blur-md px-4 py-2.5 text-sm text-white transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400/20 ${
          fullWidth ? 'w-full' : ''
        } ${
          open
            ? 'border-cyan-400/50 ring-2 ring-cyan-400/20'
            : 'border-white/10 hover:border-cyan-400/30'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      >
        <span className={`truncate ${selected ? 'text-white' : 'text-slate-500'}`}>
          {selected ? selected.labelText ?? selected.label : placeholder}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? 'rotate-180 text-cyan-300' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {mounted && open && coords
        ? createPortal(
            <div
              ref={menuRef}
              style={{
                position: 'fixed',
                top: coords.top,
                left: coords.left,
                minWidth: coords.width,
                zIndex: 9999,
              }}
              className="max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/95 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl scrollbar-thin"
              style-animation="scaleIn"
            >
              <div className="animate-[scaleIn_0.12s_ease-out]">
                {options.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-500">Không có lựa chọn</div>
                ) : (
                  options.map((opt) => {
                    const active = opt.value === value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelect(opt.value)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          active
                            ? 'bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-white'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {active && (
                          <svg
                            className="h-4 w-4 shrink-0 text-cyan-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
