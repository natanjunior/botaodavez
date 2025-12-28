import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

/**
 * Base Card component with skeuomorphic styling
 * Provides a raised, shadowed container for content
 */
export function Card({ children, title, subtitle, className = '', ...props }: CardProps) {
  return (
    <div className={`skeu-card ${className}`.trim()} {...props}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-xl font-bold text-gold-light">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * Card Header - styled section for card titles/actions
 */
export function CardHeader({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mb-4 pb-4 border-b border-gray-700 ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

/**
 * Card Content - main content area
 */
export function CardContent({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

/**
 * Card Footer - bottom section for actions/metadata
 */
export function CardFooter({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mt-4 pt-4 border-t border-gray-700 ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
