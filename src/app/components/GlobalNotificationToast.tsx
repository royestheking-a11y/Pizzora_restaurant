import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function GlobalNotificationToast() {
  const { state, dispatch } = useApp();

  if (!state.notification) return null;

  const isSuccess = state.notification.type === 'success';
  const isError = state.notification.type === 'error';

  return (
    <div
      className="fixed top-5 right-5 z-[9999] max-w-md px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-fade-in transition-all"
      style={{
        backgroundColor: isSuccess ? '#DCFCE7' : isError ? '#FEE2E2' : '#DBEAFE',
        border: `1.5px solid ${isSuccess ? '#86EFAC' : isError ? '#FCA5A5' : '#93C5FD'}`,
        color: isSuccess ? '#15803D' : isError ? '#B91C1C' : '#1D4ED8',
        boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.18)',
      }}
    >
      <div className="flex-shrink-0">
        {isSuccess ? (
          <CheckCircle2 size={18} className="text-emerald-700" />
        ) : isError ? (
          <AlertCircle size={18} className="text-red-700" />
        ) : (
          <Info size={18} className="text-blue-700" />
        )}
      </div>
      <span className="text-xs sm:text-sm font-bold tracking-tight flex-1" style={{ fontFamily: 'var(--font-heading)' }}>
        {state.notification.message}
      </span>
      <button
        type="button"
        onClick={() => dispatch({ type: 'SET_NOTIFICATION', payload: null as any })}
        className="p-1 rounded-lg hover:bg-black/10 transition-colors cursor-pointer flex-shrink-0"
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
