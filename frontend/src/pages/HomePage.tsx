import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getCurrentWeekPolls, getWeekPolls } from '../api';
import PollCard from '../components/PollCard';
import type { WeekPollsOut } from '../types';

export default function HomePage() {
  const { weekStart } = useParams<{ weekStart?: string }>();
  const [data, setData] = useState<WeekPollsOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showClosed, setShowClosed] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchPolls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = weekStart
        ? await getWeekPolls(weekStart)
        : await getCurrentWeekPolls();
      setData(result);
    } catch {
      setError(
        "Looks like the server is taking a nap 🐐💤\n\n" +
        "Message The GOAT on Microsoft Teams — they'll fix it!"
      );
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  const handleShare = async () => {
    const url = window.location.origin;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return <div className="loading">Loading polls... 🐐</div>;
  }

  if (error) {
    return (
      <div className="error-page">
        <div className="error-card">
          <h2>🐐 Baaaa-d News!</h2>
          <p style={{ whiteSpace: 'pre-line' }}>{error}</p>
          <button onClick={fetchPolls}>Try Again</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const weekLabel = new Date(data.week_start + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="home-page">
      <div className="week-header">
        <h2>Week of {weekLabel}</h2>
        <button className="share-btn" onClick={handleShare}>
          {copied ? '✅ Copied!' : '📋 Share this week\'s polls'}
        </button>
      </div>

      {data.open_polls.length === 0 && data.closed_polls.length === 0 && (
        <div className="empty-state">
          <p>No polls this week yet. Check back soon! 🐐</p>
        </div>
      )}

      {data.open_polls.length > 0 && (
        <div className="polls-section">
          <h3 className="section-title">Open Polls</h3>
          <div className="polls-grid">
            {data.open_polls.map(poll => (
              <PollCard key={poll.id} poll={poll} onVoteChange={fetchPolls} />
            ))}
          </div>
        </div>
      )}

      {data.closed_polls.length > 0 && (
        <div className="polls-section closed-section">
          <button
            className="accordion-toggle"
            onClick={() => setShowClosed(prev => !prev)}
          >
            {showClosed ? '▼' : '▶'} Closed Polls ({data.closed_polls.length})
          </button>
          {showClosed && (
            <div className="polls-grid">
              {data.closed_polls.map(poll => (
                <PollCard key={poll.id} poll={poll} onVoteChange={fetchPolls} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
