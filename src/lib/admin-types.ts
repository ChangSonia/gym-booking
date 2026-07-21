export type CoachRow = {
  id: number;
  name: string;
  active: boolean;
  user_id: number | null;
};

export type AdminUserRow = {
  id: number;
  display_name: string | null;
  picture_url: string | null;
  is_coach: boolean;
  is_admin: boolean;
};

export type CourseRow = {
  id: number;
  title: string;
  coach_id: number | null;
  coachName: string | null;
  weekday: number; // 1=一...7=日
  start_time: string; // "HH:MM:SS"
  capacity: number;
  active: boolean;
};
