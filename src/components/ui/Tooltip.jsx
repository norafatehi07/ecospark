import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
const cn = (...classes) => classes.filter(Boolean).join(' ');

export const Tooltip = ({
  content,
  children,
  className,
  delay = 400
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState('top');
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const hoverTimeout = useRef(null);
  const id = useId();

  const show = useCallback((immediate = false) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    if (immediate) {
      setIsVisible(true);
    } else {
      hoverTimeout.current = setTimeout(() => setIsVisible(true), delay);
    }
  }, [delay]);

  const hide = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setIsVisible(false);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      hide();
    }
  }, [hide]);

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      // Simple collision check: flip vertically if not enough space at top
      if (triggerRect.top - tooltipRect.height - 8 < 0) {
        setPosition('bottom');
      } else {
        setPosition('top');
      }
    }
  }, [isVisible]);

  return (
    <div 
      className="relative inline-flex"
      onMouseEnter={() => show(false)}
      onMouseLeave={hide}
      onFocus={() => show(true)}
      onBlur={hide}
      onKeyDown={handleKeyDown}
      ref={triggerRef}
      aria-describedby={isVisible ? id : undefined}
    >
      {children}
      
      {isVisible && (
        <div
          id={id}
          ref={tooltipRef}
          role="tooltip"
          className={cn(
            'absolute z-50 px-3 py-1.5 text-[var(--text-xs)] font-medium rounded-[var(--radius-sm)]',
            'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-2)]',
            'border border-[rgba(255,255,255,0.05)]',
            'transition-all duration-180 ease-[cubic-bezier(0.2,0,0.2,1)]',
            'animate-in fade-in zoom-in-95',
            position === 'top' 
              ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
              : 'top-full left-1/2 -translate-x-1/2 mt-2',
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};
