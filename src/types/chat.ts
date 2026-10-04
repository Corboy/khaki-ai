export type Role = "user" | "assistant" | "system";

export interface BookingDetails {
  name?: string;
  service?: string;
  date?: string;
  time?: string;
  notes?: string;
  isReadyForBooking?: boolean;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  bookingDetails?: BookingDetails;
}

export interface QuickActionItem {
  id: string;
  label: string;
  icon: string;
  prompt: string;
}

export type ConversationState = "onboarding" | "active";
