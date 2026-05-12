import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', padding = true }) => {
  return (
    <div
      className={`rounded-xl border bg-gray-900/50 border-gray-800 ${
        padding ? 'p-4' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
