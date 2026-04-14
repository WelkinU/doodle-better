export interface VoteOut {
  id: number;
  poll_id: string;
  username: string;
  status: 'in' | 'out' | 'tentative' | 'no-reply';
  is_mine: boolean;
}

export interface PollOut {
  id: string;
  template_id: string | null;
  has_owner: boolean;       // true if created by a user (not auto-generated)
  created_by_username: string | null;
  is_my_poll: boolean;      // true if the current viewer is the creator
  title: string;
  description: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  is_closed: boolean;
  is_recurring: boolean;
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
