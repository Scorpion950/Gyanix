import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils.ts';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
  overlayClassName?: string;
}

export function Modal({
  isOpen,
  onClose,
  children,
  className,
  maxWidth,
  overlayClassName,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    // Prevent body scroll when modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center p-4',
        'bg-black/30 backdrop-blur-md transition-all duration-200 overflow-y-auto',
        overlayClassName
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      aria-modal="true"
      role="dialog"
    >
      <div className="relative max-h-[92vh] w-full flex items-center justify-center pointer-events-none">
        <div className={cn('w-full mx-auto pointer-events-auto flex flex-col items-center justify-center', maxWidth || 'max-w-md', className)}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
