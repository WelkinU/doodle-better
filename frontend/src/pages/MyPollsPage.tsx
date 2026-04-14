import { useCallback, useEffect, useState } from 'react';
import { getCurrentWeekPolls, getAvailableWeeks, getWeekPolls } from '../api';
import PollCard from '../components/PollCard';
import PollFormModal from '../components/PollFormModal';
import { useUser } from '../context/UserContext';
import type { PollOut } from '../types';

export default function MyPollsPage() {
  const { userId, isRegistered } = useUser();
  const [myPolls, setMyPolls] = useState<PollOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchMyPolls = useCallback(async () => {
    if (!isRegistered) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Fetch all available weeks and collect polls owned by this user
      const weeks = await getAvailableWeeks();
      // Always include current week even if not in history yet
      const currentResult = await getCurrentWeekPolls();
      const weekSet = new Set(weeks);
      weekSet.add(currentResult.week_start);

      const allPolls: PollOut[] = [];
      const seen = new Set<string>();

      // Collect from current week result first
      for (const p of [...currentResult.open_polls, ...currentResult.closed_polls]) {
        if (p.created_by_user_id === userId && !seen.has(p.id)) {
          allPolls.push(p);
          seen.add(p.id);
        }
      }

      // Then fetch remaining weeks
      const otherWeeks = [...weekSet].filter(w => w !== currentResult.week_start);
      const results = await Promise.all(otherWeeks.map(w => getWeekPolls(w)));
      for (const r of results) {
        for (const p of [...r.open_polls, ...r.closed_polls]) {
          if (p.created_by_user_id === userId && !seen.has(p.id)) {
            allPolls.push(p);
            seen.add(p.id);
          }
        }
      }

      // Sort by event_date descending
      allPolls.sort((a, b) => {
        if (b.event_date !== a.event_date) return b.event_date.localeCompare(a.event_date);
        return b.start_time.localeCompare(a.start_time);
      });

      setMyPolls(allPolls);
    } catch {
      setError('Failed to load your polls.');
    } finally {
      setLoading(false);
    }
  }, [userId, isRegistered]);

  useEffect(() => {
    fetchMyPolls();
  }, [fetchMyPolls]);

  if (!isRegistered) {
    return (
      <div className="my-polls-page">
        <div className="my-polls-empty">
          <p>Enter your name in the bar above to manage your own polls.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-polls-page">
      <div className="my-polls-header">
        <h2>My Polls</h2>
        <button className="create-poll-btn" onClick={() => setShowCreateModal(true)}>
          + Create Poll
        </button>
      </div>

      {loading && <div className="loading">Loading your polls... 🐐</div>}
      {error && <div className="error-inline">{error}</div>}

      {!loading && !error && myPolls.length === 0 && (
        <div className="my-polls-empty">
          <p>You haven't created any polls yet.</p>
          <p>Hit <strong>+ Create Poll</strong> to get started!</p>
        </div>
      )}

      {!loading && myPolls.length > 0 && (
        <div className="polls-grid">
          {myPolls.map(poll => (
            <PollCard key={poll.id} poll={poll} onVoteChange={fetchMyPolls} />
          ))}
        </div>
      )}

      {showCreateModal && (
        <PollFormModal
          onClose={() => setShowCreateModal(false)}
          onSaved={fetchMyPolls}
        />
      )}
    </div>
  );
}
