import { useEffect, useState } from 'react';
import { getAvailableWeeks, getWeekPolls } from '../api';
import PollCard from '../components/PollCard';
import type { WeekPollsOut } from '../types';

export default function HistoryPage() {
  const [weeks, setWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [data, setData] = useState<WeekPollsOut | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAvailableWeeks()
      .then(w => {
        setWeeks(w);
        if (w.length > 1) {
          // Select the second entry (last completed week) by default
          setSelectedWeek(w[1]);
        } else if (w.length > 0) {
          setSelectedWeek(w[0]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedWeek) return;
    setLoading(true);
    getWeekPolls(selectedWeek)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedWeek]);

  const formatWeekLabel = (ws: string) => {
    const d = new Date(ws + 'T00:00:00');
    return `Week of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <div className="history-page">
      <h2>Poll History</h2>
      <p className="history-subtitle">Settle those "who came last week" debates! 🐐</p>

      <div className="week-selector">
        <label htmlFor="week-select">Select week:</label>
        <select
          id="week-select"
          value={selectedWeek || ''}
          onChange={e => setSelectedWeek(e.target.value)}
        >
          {weeks.map(w => (
            <option key={w} value={w}>{formatWeekLabel(w)}</option>
          ))}
        </select>
      </div>

      {loading && <div className="loading">Loading... 🐐</div>}

      {data && !loading && (
        <div className="polls-grid">
          {[...data.open_polls, ...data.closed_polls]
            .sort((a, b) => a.event_date.localeCompare(b.event_date) || a.start_time.localeCompare(b.start_time))
            .map(poll => (
              <PollCard key={poll.id} poll={poll} onVoteChange={() => {}} />
            ))}
          {data.open_polls.length === 0 && data.closed_polls.length === 0 && (
            <div className="empty-state">No polls found for this week.</div>
          )}
        </div>
      )}
    </div>
  );
}
