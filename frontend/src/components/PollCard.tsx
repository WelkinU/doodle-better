import { useState } from 'react';
import { castVote, checkCollision } from '../api';
import { useUser } from '../context/UserContext';
import type { PollOut } from '../types';
import VoteListModal from './VoteListModal';

interface Props {
  poll: PollOut;
  onVoteChange: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  in: 'vote-in',
  tentative: 'vote-tentative',
  out: 'vote-out',
  'no-reply': 'vote-noreply',
};

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export default function PollCard({ poll, onVoteChange }: Props) {
  const { userId, username, isRegistered } = useUser();
  const [loading, setLoading] = useState(false);
  const [collisionWarning, setCollisionWarning] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const myVote = poll.votes.find(v => v.user_id === userId);

  const handleVote = async (status: 'in' | 'out' | 'tentative') => {
    if (!isRegistered || !username) return;
    if (poll.is_closed) return;

    setLoading(true);
    setCollisionWarning(null);
    try {
      // Check for username collision first
      const collision = await checkCollision(userId, poll.id);
      if (collision.has_collision) {
        setCollisionWarning(collision.message);
      }
      await castVote(poll.id, userId, status);
      onVoteChange();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Vote failed';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`poll-card ${poll.is_closed ? 'poll-closed' : ''}`}>
      <div className="poll-header">
        <div className="poll-title-row">
          <h3 className="poll-title">{poll.title}</h3>
          {poll.is_closed && <span className="poll-badge closed">Closed</span>}
        </div>
        <div className="poll-meta">
          <span className="poll-date">{formatDate(poll.event_date)}</span>
          <span className="poll-time">
            {formatTime(poll.start_time)} – {formatTime(poll.end_time)}
          </span>
        </div>
        {poll.description && (
          <p className="poll-description">{poll.description}</p>
        )}
        <button
          className="poll-summary poll-summary-btn"
          onClick={() => setShowModal(true)}
          title="View all responses"
        >
          <span className="summary-in">{poll.summary.in} In</span>
          <span className="summary-tentative">{poll.summary.tentative} Tentative</span>
          <span className="summary-out">{poll.summary.out} Out</span>
          <span className="summary-see-all">See responses ›</span>
        </button>
      </div>

      {/* Vote buttons */}
      {!poll.is_closed && isRegistered && (
        <div className="vote-actions">
          {collisionWarning && (
            <div className="collision-warning">
              ⚠️ {collisionWarning}
            </div>
          )}
          <div className="vote-buttons">
            {(['in', 'tentative', 'out'] as const).map(status => (
              <button
                key={status}
                className={`vote-btn ${STATUS_COLORS[status]} ${myVote?.status === status ? 'active' : ''}`}
                onClick={() => handleVote(status)}
                disabled={loading}
              >
                {status === 'in' ? '✅ In' : status === 'tentative' ? '🤔 Maybe' : '❌ Out'}
              </button>
            ))}
          </div>
        </div>
      )}
      {!poll.is_closed && !isRegistered && (
        <div className="vote-prompt">
          Enter your name above to vote!
        </div>
      )}

      {showModal && (
        <VoteListModal
          title={poll.title}
          votes={poll.votes}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
