import * as React from 'react';
import { Toast, type ToastProps } from './toast';

type ToastInput = Omit<ToastProps, 'id' | 'onDismiss'>;

interface ToastState {
  toasts: ToastProps[];
  addToast: (toast: ToastInput) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastState | null>(null);

let toastCount = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastProps[]>([]);

  const addToast = React.useCallback((toast: ToastInput) => {
    const id = String(++toastCount);
    const duration = toast.duration ?? 5000;
    setToasts(prev => [...prev, { ...toast, id }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const dismissToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, dismissToast }}>
      {children}
      <div className="ui-toaster">
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
