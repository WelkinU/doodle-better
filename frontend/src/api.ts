const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Users
export const createOrGetUser = (username: string, userId?: string) =>
  request<{ id: string; username: string }>('/users', {
    method: 'POST',
    body: JSON.stringify({ username, user_id: userId }),
  });

export const updateUsername = (userId: string, username: string) =>
  request<{ id: string; username: string }>(`/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ username, user_id: userId }),
  });

export const checkCollision = (userId: string, pollId: string) =>
  request<{ has_collision: boolean; message: string | null }>(
    `/users/${userId}/collision?poll_id=${encodeURIComponent(pollId)}`
  );

// Polls
export const getCurrentWeekPolls = () =>
  request<import('./types').WeekPollsOut>('/polls/week');

export const getWeekPolls = (weekStart: string) =>
  request<import('./types').WeekPollsOut>(`/polls/week/${weekStart}`);

export const getAvailableWeeks = () =>
  request<string[]>('/polls/weeks');

// Votes
export const castVote = (pollId: string, userId: string, status: string) =>
  request<import('./types').VoteOut>(`/polls/${pollId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, status }),
  });

export const removeVote = (pollId: string, userId: string) =>
  request<{ ok: boolean }>(`/polls/${pollId}/vote/${userId}`, {
    method: 'DELETE',
  });

// Admin - Templates
export const getTemplates = () =>
  request<import('./types').EventTemplateOut[]>('/admin/templates');

export const createTemplate = (data: {
  title: string; description: string; day_of_week: string;
  start_time: string; end_time: string; is_recurring: boolean;
}) =>
  request<import('./types').EventTemplateOut>('/admin/templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateTemplate = (id: string, data: Record<string, unknown>) =>
  request<import('./types').EventTemplateOut>(`/admin/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteTemplate = (id: string, deleteFuture: boolean) =>
  request<{ ok: boolean }>(`/admin/templates/${id}?delete_future=${deleteFuture}`, {
    method: 'DELETE',
  });
