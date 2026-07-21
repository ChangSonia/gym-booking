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
