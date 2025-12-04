import type { PropsWithChildren } from 'react';
import { cn } from '../utils/cn';

interface TableProps extends PropsWithChildren {
  className?: string;
}

export const Table = ({ children, className }: TableProps) => (
  <div className={cn('overflow-hidden rounded-xl bg-white shadow-card', className)}>
    <table className="min-w-full divide-y divide-slate-200 text-sm">{children}</table>
  </div>
);
