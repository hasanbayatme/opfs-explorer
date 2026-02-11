import { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  inputValue?: string;
  placeholder?: string;
  type: 'alert' | 'confirm' | 'prompt';
  onConfirm: (value?: string) => void;
  onCancel: () => void;
  /** Whether the confirm action is destructive (shows red button) */
  danger?: boolean;
}

export function Modal({ isOpen, title, message, inputValue = '', placeholder, type, onConfirm, onCancel, danger }: ModalProps) {
  const [value, setValue] = useState(inputValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const firstFocusableRef = useRef<HTMLElement | null>(null);
  const lastFocusableRef = useRef<HTMLElement | null>(null);

  // Store the element that opened the modal
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // Sync input value when inputValue prop changes
  useEffect(() => {
    setValue(inputValue);
  }, [inputValue]);

  // Focus management: focus input or first button on open
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (type === 'prompt' && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      } else if (dialogRef.current) {
        const firstBtn = dialogRef.current.querySelector<HTMLElement>('button:not([aria-label="Close"])');
        firstBtn?.focus();
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, type]);

  // Return focus to trigger on close
  useEffect(() => {
    if (!isOpen && triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);

  // Focus trap
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm(value);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key === 'Tab' && dialogRef.current) {
      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length === 0) return;

      firstFocusableRef.current = focusableElements[0];
      lastFocusableRef.current = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstFocusableRef.current) {
          e.preventDefault();
          lastFocusableRef.current.focus();
        }
      } else {
        if (document.activeElement === lastFocusableRef.current) {
          e.preventDefault();
          firstFocusableRef.current.focus();
        }
      }
    }
  }, [value, onConfirm, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-[1px] modal-backdrop-enter"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        className="bg-dt-surface border border-dt-border shadow-xl rounded-lg w-[320px] overflow-hidden modal-content-enter"
        role={type === 'confirm' || danger ? 'alertdialog' : 'dialog'}
        aria-labelledby="modal-title"
        aria-describedby={message ? 'modal-description' : undefined}
        aria-modal="true"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-dt-border bg-dt-bg">
          <h3 id="modal-title" className="font-semibold text-dt-text text-sm">{title}</h3>
          <button
            onClick={onCancel}
            className="p-0.5 rounded text-dt-text-secondary hover:text-dt-text hover:bg-dt-hover transition-colors"
            aria-label="Close dialog"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {message && <p id="modal-description" className="text-dt-text text-xs mb-3">{message}</p>}

          {type === 'prompt' && (
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-dt-bg border border-dt-border rounded px-2 py-1.5 text-xs text-dt-text focus:border-[var(--dt-focus)] focus:outline-none transition-colors"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              aria-label={placeholder || title}
              autoComplete="off"
              spellCheck="false"
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-4 py-2 space-x-2 bg-dt-bg border-t border-dt-border">
          {type !== 'alert' && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 rounded text-xs text-dt-text border border-dt-border hover:bg-dt-hover transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => onConfirm(value)}
            className={`px-3 py-1.5 rounded text-xs text-white transition-colors ${
              danger
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {type === 'alert' ? 'OK' : danger ? 'Delete' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
