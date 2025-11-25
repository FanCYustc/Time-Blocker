export interface Category {
  id: string;
  name: string;
  colorClass: string; // Tailwind bg class
  textColorClass: string; // Tailwind text class
  icon?: string;
}

export interface SubActivity {
  id: string;
  parentId: string;
  name: string;
}

export interface TimeSlot {
  id: string; // e.g., "09:30"
  timeLabel: string; // "09:30"
  hour: number;
  minute: number;
  planCategoryId: string | null;
  planSubActivityId?: string | null;
  actualCategoryId: string | null;
  actualSubActivityId?: string | null;
  note?: string;
}

export type ViewMode = 'plan' | 'actual';

export interface DayData {
  date: string; // YYYY-MM-DD
  slots: TimeSlot[];
}

export type TimerState = 'idle' | 'running' | 'paused' | 'completed';