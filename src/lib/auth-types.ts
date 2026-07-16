// 純型別定義，不含任何伺服器端邏輯，前端 Client Component 也能安全 import
export type AuthedUser = {
  id: number;
  display_name: string | null;
  picture_url: string | null;
  is_coach: boolean;
  is_admin: boolean;
};

export type MyBooking = {
  id: number;
  session_id: number;
  qty: number;
  status: "confirmed" | "waitlisted";
  wl_position: number | null;
};
