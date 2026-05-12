import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  return (
    <div
      className={`${sizes[size]} border-2 border-gray-600 border-t-indigo-500 rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
};
