import React from 'react';

export const StatusBadge = ({ status, className = '' }) => {
  const normalized = (status || '').toUpperCase();

  const getStyle = () => {
    switch (normalized) {
      case 'PRESENT':
      case 'ACTIVE':
      case 'SYNCED':
      case 'SUCCESS':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'LATE':
      case 'WARNING':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'REJECTED':
      case 'FAILED':
      case 'SYNC_FAILED':
      case 'SUSPENDED':
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
      case 'PENDING':
      case 'PENDING_SYNC':
      case 'DRAFT':
        return 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30';
      case 'STOPPED':
      case 'EXPIRED':
      case 'ABSENT':
      default:
        return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStyle()} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
      {normalized}
    </span>
  );
};
