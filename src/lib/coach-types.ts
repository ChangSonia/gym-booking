export type RosterBooking = {
  id: number;
  qty: number;
  status: "confirmed" | "waitlisted";
  wl_position: number | null;
  display_name: string | null;
};

export type CoachSession = {
  id: number;
  title: string;
  starts_at: string;
  capacity: number;
  status: "scheduled" | "cancelled";
  open_at: string;
  coachId: number | null;
  coachName: string | null;
  bookings: RosterBooking[];
};

export type CoachOption = {
  id: number;
  name: string;
};
