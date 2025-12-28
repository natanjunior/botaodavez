import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
}

/**
 * Base Button component with skeuomorphic styling
 * Uses CSS classes from skeuomorphic.css
 */
export function Button({
  variant = 'primary',
  size = 'medium',
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-6 py-3 text-base',
    large: 'px-8 py-4 text-lg',
  };

  const variantColors = {
    primary: 'bg-gold-500 hover:bg-gold-600',
    secondary: 'bg-brown-medium hover:bg-brown-light',
    danger: 'bg-red-600 hover:bg-red-700',
  };

  return (
    <button
      className={`
        skeu-button
        ${sizeClasses[size]}
        ${variantColors[variant]}
        ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
        ${className}
      `.trim()}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
