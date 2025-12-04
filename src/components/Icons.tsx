import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export const PlusIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 5v14M5 12h14"
    />
  </svg>
);

export const TrashIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 7h12M10 11v6M14 11v6M9 7l.6-2h4.8L15 7m-8 0v11a1.5 1.5 0 001.5 1.5h7A1.5 1.5 0 0017 18V7"
    />
  </svg>
);

export const EditIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.232 5.232l3.536 3.536M7 17l4.95-1.414a1 1 0 00.487-.263l8.263-8.263a1.5 1.5 0 000-2.121l-1.879-1.879a1.5 1.5 0 00-2.121 0l-8.264 8.263a1 1 0 00-.262.488L7 17z"
    />
  </svg>
);

export const DuplicateIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <rect
      x="7"
      y="7"
      width="11"
      height="11"
      rx="1.5"
      strokeWidth="1.6"
    />
    <path
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 16H5a1 1 0 01-1-1V5a1 1 0 011-1h10a1 1 0 011 1v1"
    />
  </svg>
);
