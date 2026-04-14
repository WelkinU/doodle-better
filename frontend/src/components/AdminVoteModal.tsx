import { useEffect, useState } from 'react';
import { adminResetVotes, adminRemoveVote } from '../api';
import type { PollOut, VoteOut } from '../types';

interface Props {
  poll: PollOut;
  onClose: () => void;
  onChanged: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  in: '✅ In',
  tentative: '🤔 Maybe',
  out: '❌ Out',
  'no-reply': '—',
};

export default function AdminVoteModal({ poll, onClose, onChanged }: Props) {
  const [votes, setVotes] = useState<VoteOut[]>(poll.votes);
  const [busy, setBusy] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleRemove = async (vote: VoteOut) => {
    setBusy(true);
    try {
      await adminRemoveVote(poll.id, vote.id);
      setVotes(prev => prev.filter(v => v.id !== vote.id));
      onChanged();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to remove vote');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!resetConfirm) { setResetConfirm(true); return; }
    setBusy(true);
    try {
      await adminResetVotes(poll.id);
      setVotes([]);
      setResetConfirm(false);
      onChanged();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to reset votes');
    } finally {
      setBusy(false);
    }
  };

  const sorted = [...votes].sort((a, b) => {
    const order: Record<string, number> = { in: 0, tentative: 1, out: 2, 'no-reply': 3 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal admin-vote-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Manage votes for ${poll.title}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">Manage Votes — {poll.title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          {votes.length === 0 ? (
            <p className="no-votes">No votes on this poll.</p>
          ) : (
            <table className="votes-table admin-votes-table">
              <tbody>
                {sorted.map(vote => (
                  <tr key={vote.id} className="vote-row">
                    <td className="vote-name">{vote.username}</td>
                    <td className="vote-status">{STATUS_LABELS[vote.status]}</td>
                    <td className="vote-action">
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleRemove(vote)}
                        disabled={busy}
                        title="Remove this vote"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {votes.length > 0 && (
          <div className="modal-footer">
            <button
              className={`btn ${resetConfirm ? 'btn-danger' : 'btn-secondary'}`}
              onClick={handleReset}
              onBlur={() => setResetConfirm(false)}
              disabled={busy}
            >
              {resetConfirm ? '⚠️ Confirm Reset All' : 'Reset All Votes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
