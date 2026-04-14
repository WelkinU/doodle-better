import { useEffect, useState } from 'react';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate, getAdminPolls, deleteUserPoll } from '../api';
import AdminVoteModal from '../components/AdminVoteModal';
import { useUser } from '../context/UserContext';
import type { EventTemplateOut, PollOut } from '../types';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface FormData {
  title: string;
  description: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
}

const emptyForm: FormData = {
  title: '',
  description: '',
  day_of_week: 'Monday',
  start_time: '12:00',
  end_time: '13:00',
  is_recurring: false,
};

export default function AdminPage() {
  const { userId } = useUser();
  const [templates, setTemplates] = useState<EventTemplateOut[]>([]);
  const [userPolls, setUserPolls] = useState<PollOut[]>([]);
  const [templatePollMap, setTemplatePollMap] = useState<Record<string, PollOut>>({});
  const [managingVotesPoll, setManagingVotesPoll] = useState<PollOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  const fetchTemplates = () => {
    setLoading(true);
    setError(null);
    Promise.all([getTemplates(), getAdminPolls()])
      .then(([tmpls, polls]) => {
        setTemplates(tmpls);
        setUserPolls(polls.filter(p => p.created_by_user_id !== null));
        // Build a map of template_id -> most recent poll for that template
        const map: Record<string, PollOut> = {};
        for (const poll of polls) {
          if (!poll.template_id) continue;
          const existing = map[poll.template_id];
          if (!existing || poll.event_date > existing.event_date) {
            map[poll.template_id] = poll;
          }
        }
        setTemplatePollMap(map);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = async () => {
    try {
      await createTemplate({ ...form, created_by_user_id: userId || undefined });
      setForm(emptyForm);
      setShowCreate(false);
      fetchTemplates();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create');
    }
  };

  const handleUpdate = async (id: string, updateFuture: boolean) => {
    try {
      await updateTemplate(id, { ...form, update_future: updateFuture });
      setEditingId(null);
      setForm(emptyForm);
      fetchTemplates();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleDelete = async (id: string) => {
    const choice = confirm(
      'Delete this event?\n\n' +
      'Click OK to delete this template and future instances.\n' +
      'Note: Past polls with votes are preserved.'
    );
    if (!choice) return;
    try {
      await deleteTemplate(id, true);
      fetchTemplates();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const startEdit = (tmpl: EventTemplateOut) => {
    setEditingId(tmpl.id);
    setForm({
      title: tmpl.title,
      description: tmpl.description || '',
      day_of_week: tmpl.day_of_week,
      start_time: tmpl.start_time,
      end_time: tmpl.end_time,
      is_recurring: tmpl.is_recurring,
    });
    setShowCreate(false);
  };

  const handleDeleteUserPoll = async (poll: PollOut) => {
    const choice = confirm(`Delete the poll "${poll.title}"?\n\nThis cannot be undone.`);
    if (!choice) return;
    try {
      await deleteUserPoll(poll.id, poll.created_by_user_id!);
      fetchTemplates();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (error?.includes('Admin access required')) {
    return (
      <div className="admin-page">
        <h2>Admin Panel</h2>
        <div className="admin-denied">
          <p>🔒 Admin access is restricted to authorized IPs.</p>
          <p>If you're the admin, make sure you're accessing from an allowed machine.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <h2>Admin Panel — Manage Events</h2>
      <p className="admin-subtitle">Create, edit, and manage recurring event templates.</p>

      {error && <div className="admin-error">⚠️ {error}</div>}
      {loading && <div className="loading">Loading...</div>}

      <button className="btn btn-primary" onClick={() => { setShowCreate(true); setEditingId(null); setForm(emptyForm); }}>
        + Create New Event
      </button>

      {/* Create / Edit form */}
      {(showCreate || editingId) && (
        <div className="admin-form">
          <h3>{editingId ? 'Edit Event' : 'Create New Event'}</h3>
          <div className="form-group">
            <label>Title</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Day of Week</label>
              <select value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: e.target.value })}>
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Start Time</label>
              <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div className="form-group">
              <label>End Time</label>
              <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>
          <div className="form-group checkbox-group">
            <label>
              <input type="checkbox" checked={form.is_recurring} onChange={e => setForm({ ...form, is_recurring: e.target.checked })} />
              Recurring weekly
            </label>
          </div>
          <div className="form-actions">
            {editingId ? (
              <>
                <button className="btn btn-primary" onClick={() => handleUpdate(editingId, false)}>
                  Save (This Event Only)
                </button>
                <button className="btn btn-secondary" onClick={() => handleUpdate(editingId, true)}>
                  Save (All Future Events)
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={handleCreate}>
                Create Event
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => { setShowCreate(false); setEditingId(null); setForm(emptyForm); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Template list */}
      <div className="template-list">
        {templates.map(tmpl => (
          <div key={tmpl.id} className="template-card">
            <div className="template-info">
              <h4>{tmpl.title}</h4>
              <p className="template-schedule">
                {tmpl.day_of_week} · {tmpl.start_time} – {tmpl.end_time}
                {tmpl.is_recurring && <span className="recurring-badge">🔁 Recurring</span>}
              </p>
              {tmpl.description && <p className="template-desc">{tmpl.description}</p>}
            </div>
            <div className="template-actions">
              <button className="btn btn-sm" onClick={() => startEdit(tmpl)}>✏️ Edit</button>
              {templatePollMap[tmpl.id] && (
                <button className="btn btn-sm btn-manage-votes" onClick={() => setManagingVotesPoll(templatePollMap[tmpl.id])}>🗳️ Manage Votes</button>
              )}
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(tmpl.id)}>🗑️ Delete</button>
            </div>
          </div>
        ))}
        {!loading && templates.length === 0 && (
          <div className="empty-state">No event templates yet. Create one above!</div>
        )}
      </div>

      {/* User-created polls */}
      <div className="admin-section">
        <h3 className="admin-section-title">User-Created Polls</h3>
        {!loading && userPolls.length === 0 && (
          <div className="empty-state">No user-created polls yet.</div>
        )}
        <div className="template-list">
          {userPolls.map(poll => (
            <div key={poll.id} className="template-card">
              <div className="template-info">
                <h4>{poll.title}{poll.is_closed && <span className="recurring-badge" style={{ marginLeft: '0.5rem' }}>Closed</span>}</h4>
                <p className="template-schedule">
                  {new Date(poll.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  {' · '}{poll.start_time} – {poll.end_time}
                  {poll.created_by_username && <span style={{ fontStyle: 'italic', marginLeft: '0.5rem', opacity: 0.75 }}>by {poll.created_by_username}</span>}
                </p>
                {poll.description && <p className="template-desc">{poll.description}</p>}
              </div>
              <div className="template-actions">
                <button className="btn btn-sm btn-manage-votes" onClick={() => setManagingVotesPoll(poll)}>🗳️ Manage Votes</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDeleteUserPoll(poll)}>🗑️ Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {managingVotesPoll && (
        <AdminVoteModal
          poll={managingVotesPoll}
          onClose={() => setManagingVotesPoll(null)}
          onChanged={fetchTemplates}
        />
      )}
    </div>
  );
}
