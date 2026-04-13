export interface VoteOut {
  id: number;
  poll_id: string;
  user_id: string;
  username: string;
  status: 'in' | 'out' | 'tentative' | 'no-reply';
}

export interface PollOut {
  id: string;
  template_id: string | null;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  is_closed: boolean;
  week_start: string;
  votes: VoteOut[];
  summary: { in: number; tentative: number; out: number };
}

export interface WeekPollsOut {
  week_start: string;
  open_polls: PollOut[];
  closed_polls: PollOut[];
}

export interface UserOut {
  id: string;
  username: string;
}

export interface UsernameCollisionWarning {
  has_collision: boolean;
  message: string | null;
}

export interface EventTemplateOut {
  id: string;
  title: string;
  description: string | null;
  day_of_week: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  is_deleted: boolean;
}
