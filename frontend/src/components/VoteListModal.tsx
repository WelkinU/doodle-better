import { useEffect } from 'react';
import type { VoteOut } from '../types';

const STATUS_COLORS: Record<string, string> = {
  in: 'vote-in',
  tentative: 'vote-tentative',
  out: 'vote-out',
  'no-reply': 'vote-noreply',
};

const STATUS_LABELS: Record<string, string> = {
  in: '✅ In',
  tentative: '🤔 Maybe',
  out: '❌ Out',
  'no-reply': '—',
};

interface Props {
  title: string;
  votes: VoteOut[];
  onClose: () => void;
}

export default function VoteListModal({ title, votes, onClose }: Props) {

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const sorted = [...votes].sort((a, b) => {
    const order = { in: 0, tentative: 1, out: 2, 'no-reply': 3 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Responses for ${title}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">Responses — {title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          {votes.length === 0 ? (
            <p className="no-votes">No votes yet. Be the first! 🐐</p>
          ) : (
            <table className="votes-table">
              <tbody>
                {sorted.map(vote => (
                  <tr
                    key={vote.id}
                    className={`vote-row ${STATUS_COLORS[vote.status]} ${vote.is_mine ? 'vote-mine' : ''}`}
                  >
                    <td className="vote-name">{vote.username}</td>
                    <td className="vote-status">{STATUS_LABELS[vote.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
