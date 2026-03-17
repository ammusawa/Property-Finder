'use client';

import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const toastListeners: Array<(toast: Toast) => void> = [];

export function showToast(message: string, type: ToastType = 'info', duration: number = 5000) {
  const toast: Toast = {
    id: Math.random().toString(36).substring(7),
    message,
    type,
    duration,
  };
  toastListeners.forEach((listener) => listener(toast));
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts((prev) => [...prev, toast]);
      
      if (toast.duration !== 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toast.id));
        }, toast.duration);
      }
    };

    toastListeners.push(listener);

    return () => {
      const index = toastListeners.indexOf(listener);
      if (index > -1) {
        toastListeners.splice(index, 1);
      }
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-600 border-green-700';
      case 'error':
        return 'bg-red-600 border-red-700';
      case 'warning':
        return 'bg-yellow-600 border-yellow-700';
      case 'info':
      default:
        return 'bg-blue-600 border-blue-700';
    }
  };

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-md w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            ${getToastStyles(toast.type)}
            text-white px-4 py-3 rounded-lg shadow-lg border-l-4
            flex items-center justify-between gap-4
            transition-all duration-300
            transform translate-x-0 opacity-100
          `}
        >
          <div className="flex items-center gap-3 flex-1">
            <span className="text-xl font-bold flex-shrink-0">
              {getToastIcon(toast.type)}
            </span>
            <p className="text-sm font-medium flex-1">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-white hover:text-gray-200 flex-shrink-0"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

