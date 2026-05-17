import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

function useHover(): [boolean, { onMouseEnter: () => void; onMouseLeave: () => void }] {
  const [hovered, setHovered] = useState(false);
  return [
    hovered,
    {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
    },
  ];
}

interface PopoverProps {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (props: { close: () => void }) => ReactNode;
  align?: 'left' | 'right';
  width?: number;
}

interface PopoverPosition {
  top: number;
  left?: number;
  right?: number;
}

export function Popover({ trigger, children, align = 'left', width = 240 }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PopoverPosition | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const el = wrapperRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (align === 'left') {
        setPos({ top: r.bottom + 6, left: r.left });
      } else {
        setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
      }
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, align]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      {trigger({ open, toggle: () => setOpen(o => !o) })}
      {open && pos &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              right: pos.right,
              zIndex: 1000,
              width,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              boxShadow: 'var(--shadow-pop)',
              padding: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
            onClick={e => e.stopPropagation()}
          >
            {children({ close: () => setOpen(false) })}
          </div>,
          document.body,
        )}
    </div>
  );
}

interface PopoverItemProps {
  onClick?: () => void;
  active?: boolean;
  tone?: 'default' | 'danger';
  leading?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
  disabled?: boolean;
}

export function PopoverItem({
  onClick,
  active,
  tone = 'default',
  leading,
  trailing,
  children,
  disabled,
}: PopoverItemProps) {
  const [hovered, hoverBind] = useHover();
  const bg = active
    ? 'var(--accent-tint)'
    : hovered && !disabled
      ? 'var(--surface-2)'
      : 'transparent';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      {...hoverBind}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 6,
        textAlign: 'left',
        fontSize: 12.5,
        fontWeight: active ? 600 : 500,
        color:
          tone === 'danger'
            ? 'var(--negative)'
            : active
              ? 'var(--accent-ink)'
              : 'var(--ink)',
        background: bg,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {leading}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {children}
        </span>
      </span>
      {trailing}
    </button>
  );
}

export function PopoverDivider() {
  return (
    <div style={{ height: 1, background: 'var(--border-soft)', margin: '4px 2px' }} />
  );
}

export function PopoverLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: '6px 10px 2px',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--ink-muted)',
      }}
    >
      {children}
    </div>
  );
}
