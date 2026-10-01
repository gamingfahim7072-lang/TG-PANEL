import React, { useEffect, useState } from 'react';

export type PageTransitionVariant =
  | 'dashboard'
  | 'products'
  | 'orders'
  | 'subscription'
  | 'fz-pay'
  | 'settings'
  | 'editor'
  | 'default';

interface PageTransitionProps {
  variant?: PageTransitionVariant;
  children: React.ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  variant = 'default',
  children,
  className = ''
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Quick RAF trigger for instant GPU transition
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, [variant]);

  // Reduced motion support
  const isReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (isReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  // Variant-specific entrance classes
  const getVariantStyles = () => {
    switch (variant) {
      case 'dashboard':
        return mounted
          ? 'opacity-100 translate-y-0 duration-300 ease-out'
          : 'opacity-0 translate-y-3';
      case 'products':
        return mounted
          ? 'opacity-100 scale-100 duration-350 ease-out'
          : 'opacity-0 scale-[0.98] translate-y-2';
      case 'orders':
        return mounted
          ? 'opacity-100 translate-y-0 duration-300 ease-out'
          : 'opacity-0 translate-y-4';
      case 'subscription':
        return mounted
          ? 'opacity-100 scale-100 duration-400 ease-out'
          : 'opacity-0 scale-[0.97]';
      case 'fz-pay':
        return mounted
          ? 'opacity-100 translate-y-0 duration-350 ease-out'
          : 'opacity-0 translate-y-3';
      case 'settings':
        return mounted
          ? 'opacity-100 translate-x-0 duration-300 ease-out'
          : 'opacity-0 -translate-x-2';
      case 'editor':
        return mounted
          ? 'opacity-100 duration-250 ease-out'
          : 'opacity-0 scale-[0.99]';
      default:
        return mounted
          ? 'opacity-100 translate-y-0 duration-250 ease-out'
          : 'opacity-0 translate-y-2';
    }
  };

  return (
    <div
      className={`transition-all transform will-change-transform ${getVariantStyles()} ${className}`}
    >
      {children}
    </div>
  );
};
