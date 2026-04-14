import { useEffect, useState } from 'react';
import { createUserPoll, updateUserPoll } from '../api';
import { useUser } from '../context/UserContext';
import type { PollOut } from '../types';

interface Props {
  existing?: PollOut;
  onClose: () => void;
  onSaved: () => void;
}

export default function PollFormModal({ existing, onClose, onSaved }: Props) {
  const { userId, isRegistered } = useUser();
  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [eventDate, setEventDate] = useState(existing?.event_date ?? '');
  const [startTime, setStartTime] = useState(existing?.start_time ?? '09:00');
  const [endTime, setEndTime] = useState(existing?.end_time ?? '10:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default event_date to today if creating
  useEffect(() => {
    if (!existing && !eventDate) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setEventDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [existing, eventDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRegistered) return;
    if (!title.trim()) { setError('Title is required'); return; }
    if (!eventDate) { setError('Date is required'); return; }
    if (startTime >= endTime) { setError('End time must be after start time'); return; }

    setSaving(true);
    setError(null);
    try {
      if (existing) {
        await updateUserPoll(existing.id, {
          user_id: userId,
          title,
          description,
          event_date: eventDate,
          start_time: startTime,
          end_time: endTime,
        });
      } else {
        await createUserPoll({
          user_id: userId,
          title,
          description,
          event_date: eventDate,
          start_time: startTime,
          end_time: endTime,
        });
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save poll');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal poll-form-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{existing ? 'Edit Poll' : 'Create Poll'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="poll-form">
          {error && <div className="poll-form-error">{error}</div>}

          <label className="poll-form-label">
            Title <span className="required">*</span>
            <input
              type="text"
              className="poll-form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Team Lunch"
              maxLength={200}
              required
            />
          </label>

          <label className="poll-form-label">
            Description
            <textarea
              className="poll-form-input poll-form-textarea"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional details..."
              rows={2}
            />
          </label>

          <label className="poll-form-label">
            Date <span className="required">*</span>
            <input
              type="date"
              className="poll-form-input"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
              required
            />
          </label>

          <div className="poll-form-row">
            <label className="poll-form-label">
              Start Time <span className="required">*</span>
              <input
                type="time"
                className="poll-form-input"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                required
              />
            </label>
            <label className="poll-form-label">
              End Time <span className="required">*</span>
              <input
                type="time"
                className="poll-form-input"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                required
              />
            </label>
          </div>

          <div className="poll-form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : existing ? 'Save Changes' : 'Create Poll'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
