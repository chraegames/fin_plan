import { plopDef } from '../constants';
import type { Notice } from '../types';
import { formatMoney } from './format';
import { CityIcon } from './icons';
import { PLOP_COLOR, PLOP_ICON } from './toolbarData';

interface NoticeBannerProps {
  notice: Notice;
  onClose: () => void;
  onMilestones: () => void;
}

/** A celebratory banner for a milestone (or other event). */
export function NoticeBanner({ notice, onClose, onMilestones }: NoticeBannerProps) {
  const unlocks = (notice.unlocks ?? []).map(p => plopDef(p)).filter(d => !!d);
  return (
    <div className="city-panel city-notice" role="status">
      <div className="city-notice-head">
        <span className="city-tile" style={{ background: 'var(--cp-purple)' }}>
          <CityIcon name="flag" size={18} />
        </span>
        <div>
          <b>{notice.title}</b>
          <small>
            {notice.text}
            {notice.reward ? ` The city receives a ${formatMoney(notice.reward)} grant.` : ''}
          </small>
        </div>
        <button type="button" className="city-btn city-btn-sm city-btn-icon" onClick={onClose} aria-label="Dismiss">
          <CityIcon name="close" size={12} />
        </button>
      </div>
      {unlocks.length > 0 && (
        <div className="city-notice-unlocks">
          <span className="city-notice-label">Unlocked</span>
          {unlocks.map(d => (
            <span key={d.id} className="city-unlock" title={d.desc}>
              <span className="city-tile" style={{ background: PLOP_COLOR[d.id] }}>
                <CityIcon name={PLOP_ICON[d.id] ?? 'house'} size={12} />
              </span>
              {d.name}
            </span>
          ))}
          <button type="button" className="city-btn city-btn-sm" onClick={onMilestones}>
            All milestones
          </button>
        </div>
      )}
    </div>
  );
}
