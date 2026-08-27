// Small pure building blocks: TechChip, Callout, ProsCons, RatingBar,
// CompareTable, BrandCard. All hook-free.

import type { ReactNode } from 'react';
import { Icon } from '../../../components/primitives/Icon';
import { ATTRIBUTES, TECH_BY_ID, type Attribute, type Brand, type Rating, type TechId } from '../data';
import { compareRows } from '../logic';
import { techHref } from '../pages';
import { familyChipClass, small, statusChipClass, STATUS_LABEL } from './ui';

export function TechChip({ techId, link = true }: { techId: TechId; link?: boolean }) {
  const t = TECH_BY_ID[techId];
  const cls = familyChipClass(t.family);
  return link ? (
    <a className={cls} href={techHref(techId)} title={t.name}>
      {t.shortName}
    </a>
  ) : (
    <span className={cls}>{t.shortName}</span>
  );
}

export function StatusChip({ techId }: { techId: TechId }) {
  const t = TECH_BY_ID[techId];
  return <span className={statusChipClass(t.status)}>{STATUS_LABEL[t.status]}</span>;
}

export function Callout({ tone = 'caution', action, children }: { tone?: 'caution' | 'info'; action?: ReactNode; children: ReactNode }) {
  if (tone === 'info') {
    // The "rule" callout: accent left border, optional pill action on the right.
    return (
      <div className="tvg-callout info" role="note">
        <div>{children}</div>
        {action}
      </div>
    );
  }
  return (
    <div className="tvg-callout" role="note">
      <span style={{ flex: '0 0 auto', marginTop: 2, color: 'var(--caution)' }}>
        <Icon name="warning" size={15} />
      </span>
      <div>{children}</div>
    </div>
  );
}

function List({ items, tone }: { items: string[]; tone: 'pro' | 'con' }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map(item => (
        <li key={item} style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: 8, fontSize: 14.5, lineHeight: 1.5, color: 'var(--ink-2)' }}>
          <span style={{ color: tone === 'pro' ? 'var(--positive)' : 'var(--negative)', marginTop: 3 }}>
            <Icon name={tone === 'pro' ? 'check' : 'close'} size={13} />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function ProsCons({ pros, cons }: { pros: string[]; cons: string[] }) {
  return (
    <div className="tvg-cols">
      <div className="tvg-card" style={{ boxShadow: 'none' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--positive)' }}>Strengths</div>
        <List items={pros} tone="pro" />
      </div>
      <div className="tvg-card" style={{ boxShadow: 'none' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--negative)' }}>Trade-offs</div>
        <List items={cons} tone="con" />
      </div>
    </div>
  );
}

export function RatingBar({ attribute, value }: { attribute: Attribute; value: Rating }) {
  const cls = attribute.higherIsBetter ? (value >= 4 ? 'good' : '') : value >= 4 ? 'bad' : '';
  return (
    <span className={`tvg-rating ${cls}`} role="img" aria-label={`${attribute.label}: ${value} of 5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <i key={i} className={i <= value ? 'on' : undefined} />
      ))}
    </span>
  );
}

export function RatingsRow({ techId }: { techId: TechId }) {
  const t = TECH_BY_ID[techId];
  return (
    <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px 18px' }}>
      {ATTRIBUTES.map(a => (
        <div key={a.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <dt style={{ fontSize: 12, color: 'var(--ink-3)' }}>
            {a.label}
            {!a.higherIsBetter && <span style={{ color: 'var(--ink-muted)' }}> (lower is better)</span>}
          </dt>
          <dd style={{ margin: 0 }}>
            <RatingBar attribute={a} value={t.ratings[a.id]} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function CompareTable({ techIds, caption }: { techIds: TechId[]; caption?: string }) {
  const rows = compareRows(techIds);
  return (
    <div className="tvg-table-wrap">
      <table className="tvg-table">
        <caption>{caption ?? 'Ratings are relative, 1–5, for a typical example of each technology. A green edge marks the best in the row.'}</caption>
        <thead>
          <tr>
            <th scope="col" style={{ minWidth: 150 }}>
              Attribute
            </th>
            {techIds.map(id => (
              <th key={id} scope="col" style={{ minWidth: 120 }}>
                {TECH_BY_ID[id].shortName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.attribute.id}>
              <th scope="row" style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 13.5 }}>
                {r.attribute.label}
                {!r.attribute.higherIsBetter && <div style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 400 }}>lower is better</div>}
              </th>
              {r.cells.map(c => (
                <td key={c.techId} className={c.best ? 'tvg-best' : undefined}>
                  <RatingBar attribute={r.attribute} value={c.value} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TIER_LABEL: Record<string, string> = { entry: 'Entry', mid: 'Mid-range', premium: 'Premium', flagship: 'Flagship' };

export function BrandCard({ brand, anchorId }: { brand: Brand; anchorId?: string }) {
  return (
    <div id={anchorId} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ ...small, fontSize: 14.5, color: 'var(--ink-2)' }}>{brand.namingStyle}</p>
      <div className="tvg-table-wrap">
        <table className="tvg-table">
          <caption>{brand.name} names, roughly cheapest to most expensive. Names apply to series, not individual models.</caption>
          <thead>
            <tr>
              <th scope="col" style={{ minWidth: 170 }}>
                Name on the box
              </th>
              <th scope="col" style={{ minWidth: 130 }}>
                Technology
              </th>
              <th scope="col" style={{ minWidth: 90 }}>
                Tier
              </th>
              <th scope="col" style={{ minWidth: 260 }}>
                What it tells you
              </th>
            </tr>
          </thead>
          <tbody>
            {brand.names.map(n => (
              <tr key={n.name}>
                <th scope="row" style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13.5 }}>
                  {n.name}
                </th>
                <td>
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {n.techIds.map(id => (
                      <TechChip key={id} techId={id} />
                    ))}
                  </span>
                </td>
                <td style={{ color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{n.tier ? TIER_LABEL[n.tier] : '—'}</td>
                <td style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>{n.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={small}>
        Current line-up and specifications:{' '}
        <a href={brand.officialUrl} rel="noopener nofollow" target="_blank" style={{ color: 'var(--accent-ink)' }}>
          {brand.name} official site ↗
        </a>
      </p>
    </div>
  );
}
