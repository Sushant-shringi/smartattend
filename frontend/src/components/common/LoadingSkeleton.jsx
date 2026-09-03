import React from 'react';

export const LoadingSkeleton = ({ type = 'cards', count = 3 }) => {
  if (type === 'cards') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-3"></div>
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mb-4"></div>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded w-full"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
      <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
    </div>
  );
};
