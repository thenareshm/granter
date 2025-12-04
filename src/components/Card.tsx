import type { PropsWithChildren, ReactNode } from 'react';
import { cn } from '../utils/cn';

interface CardProps extends PropsWithChildren {
  className?: string;
  title?: ReactNode;
  actions?: ReactNode;
}

export const Card = ({ children, className, title, actions }: CardProps) => (
  <div className={cn('rounded-xl bg-white p-6 shadow-card', className)}>
    {(title || actions) && (
      <div className="mb-4 flex items-center justify-between gap-4">
        {title && <div className="text-lg font-semibold text-slate-800">{title}</div>}
        {actions}
      </div>
    )}
    {children}
  </div>
);
