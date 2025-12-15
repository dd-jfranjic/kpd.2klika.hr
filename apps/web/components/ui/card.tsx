import { HTMLAttributes, forwardRef } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'default', children, ...props }, ref) => {
    const variantStyles = {
      default: 'bg-white shadow-sm',
      bordered: 'bg-white border border-gray-200',
    };

    return (
      <div
        ref={ref}
        className={`rounded-xl ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = '', ...props }, ref) => (
  <div ref={ref} className={`px-6 py-4 border-b border-gray-100 ${className}`} {...props} />
));

CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className = '', ...props }, ref) => (
  <h3 ref={ref} className={`text-lg font-semibold text-gray-900 ${className}`} {...props} />
));

CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className = '', ...props }, ref) => (
  <p ref={ref} className={`text-sm text-gray-500 mt-1 ${className}`} {...props} />
));

CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = '', ...props }, ref) => (
  <div ref={ref} className={`px-6 py-4 ${className}`} {...props} />
));

CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl ${className}`}
    {...props}
  />
));

CardFooter.displayName = 'CardFooter';
