import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  return (
    <div
      className="fixed bottom-8 right-4 z-[200] flex flex-col space-y-2 pointer-events-none"
      aria-live="polite"
      aria-relevant="additions removals"
      aria-atomic="false"
      role="log"
    >
        {toasts.map(toast => (
            <div
                key={toast.id}
                className="pointer-events-auto flex items-center w-72 bg-dt-surface border border-dt-border shadow-lg rounded-lg p-2.5 toast-enter"
                role="status"
                aria-atomic="true"
            >
                <div className="mr-2.5 shrink-0" aria-hidden="true">
                    {toast.type === 'success' && <CheckCircle size={16} className="text-green-500" />}
                    {toast.type === 'error' && <AlertCircle size={16} className="text-red-500" />}
                    {toast.type === 'info' && <Info size={16} className="text-blue-500" />}
                </div>
                <span className="text-xs text-dt-text flex-1 break-words">
                  <span className="sr-only">
                    {toast.type === 'success' ? 'Success: ' : toast.type === 'error' ? 'Error: ' : 'Info: '}
                  </span>
                  {toast.message}
                </span>
                <button
                  onClick={() => onDismiss(toast.id)}
                  className="ml-2 p-0.5 rounded text-dt-text-secondary hover:text-dt-text hover:bg-dt-hover transition-colors shrink-0"
                  aria-label={`Dismiss: ${toast.message}`}
                >
                    <X size={14} />
                </button>
            </div>
        ))}
    </div>
  );
}
