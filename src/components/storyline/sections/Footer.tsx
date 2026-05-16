interface FooterProps {
  onAbout?: () => void;
}

export function Footer({ onAbout }: FooterProps) {
  return (
    <footer
      style={{
        marginTop: 24,
        paddingTop: 24,
        borderTop: '1px solid var(--border-soft)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        fontSize: 12,
        color: 'var(--ink-3)',
      }}
    >
      <span>Your data stays in this browser — no account, no server, no tracking.</span>
      <div style={{ display: 'flex', gap: 16 }}>
        <button
          onClick={onAbout}
          style={{
            fontSize: 12,
            color: 'var(--ink-2)',
            textDecoration: 'underline',
            textUnderlineOffset: 2,
          }}
        >
          About
        </button>
        <span style={{ fontStyle: 'italic' }}>
          Educational tool — not financial advice.
        </span>
      </div>
    </footer>
  );
}
