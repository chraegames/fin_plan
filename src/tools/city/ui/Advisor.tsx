import type { AdvisorMsg } from '../types';

export function Advisor({ messages }: { messages: AdvisorMsg[] }) {
  if (!messages.length) return null;
  return (
    <div className="city-advisor" aria-live="polite">
      {messages.map(m => (
        <div key={m.id} className={`city-panel city-advice city-advice-${m.level}`}>
          {m.text}
        </div>
      ))}
    </div>
  );
}
