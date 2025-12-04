import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../utils/cn';

interface ToggleProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  labelOn?: string;
  labelOff?: string;
}

export const Toggle = ({
  checked,
  onChange,
  labelOn = 'Chars',
  labelOff = 'Words',
  className,
  ...props
}: ToggleProps) => {
  const label = checked ? labelOn : labelOff;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn('group inline-flex items-center gap-2 text-sm font-medium', className)}
      {...props}
    >
      <span
        className={cn(
          'rounded-full px-3 py-1 transition',
          checked ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition',
          checked ? 'bg-brand-500' : 'bg-slate-300',
        )}
      >
        <span
          className={cn(
            'absolute left-1 h-5 w-5 rounded-full bg-white shadow transition',
            checked && 'translate-x-4',
          )}
        />
      </span>
    </button>
  );
};
