import { Category, TimeSlot } from './types';

export const CATEGORIES: Category[] = [
  { id: 'sleep', name: '睡觉', colorClass: 'bg-indigo-300', textColorClass: 'text-indigo-900' },
  { id: 'routine', name: '日常', colorClass: 'bg-purple-200', textColorClass: 'text-purple-900' },
  { id: 'learning', name: '学习', colorClass: 'bg-emerald-300', textColorClass: 'text-emerald-900' },
  { id: 'work', name: '工作', colorClass: 'bg-sky-300', textColorClass: 'text-sky-900' },
  { id: 'leisure', name: '娱乐', colorClass: 'bg-pink-300', textColorClass: 'text-pink-900' },
  { id: 'exercise', name: '运动', colorClass: 'bg-orange-300', textColorClass: 'text-orange-900' },
  { id: 'waste', name: '浪费', colorClass: 'bg-red-300', textColorClass: 'text-red-900' },
  { id: 'rest', name: '休息', colorClass: 'bg-teal-200', textColorClass: 'text-teal-900' },
  { id: 'other', name: '其他', colorClass: 'bg-gray-300', textColorClass: 'text-gray-900' },
];

export const INITIAL_CATEGORY_ID = 'work';

// Mapping legacy English IDs to new Chinese Category IDs
const ID_MAPPING: Record<string, string> = {
  'morning_routine': 'routine',
  'work_deep': 'work',
  'work_shallow': 'work',
  'transit': 'routine',
  // Direct matches (or close enough) don't strictly need mapping if IDs are same, 
  // but let's be safe if we change IDs.
  'sleep': 'sleep',
  'learning': 'learning',
  'exercise': 'exercise',
  'leisure': 'leisure',
  'waste': 'waste'
};

// Generate 288 slots (24 hours * 12 slots per hour = 5 min intervals)
export const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      const timeLabel = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      slots.push({
        id: timeLabel,
        timeLabel,
        hour: h,
        minute: m,
        planCategoryId: null,
        actualCategoryId: null,
      });
    }
  }
  return slots;
};

// Helper to migrate slots
export const migrateSlots = (oldSlots: TimeSlot[]): TimeSlot[] => {
  let migratedSlots = [...oldSlots];
  
  // 1. Migrate 10-min to 5-min if needed
  if (migratedSlots.length === 144) {
      const template = generateTimeSlots();
      migratedSlots = template.map(newSlot => {
        const oldMinute = Math.floor(newSlot.minute / 10) * 10;
        const oldSlot = oldSlots.find(s => s.hour === newSlot.hour && s.minute === oldMinute);
        
        if (oldSlot) {
          return {
            ...newSlot,
            planCategoryId: oldSlot.planCategoryId,
            actualCategoryId: oldSlot.actualCategoryId,
            note: oldSlot.note
          };
        }
        return newSlot;
      });
  }

  // 2. Migrate IDs (Map old English IDs to new Chinese structure)
  migratedSlots = migratedSlots.map(slot => ({
      ...slot,
      planCategoryId: slot.planCategoryId ? (ID_MAPPING[slot.planCategoryId] || slot.planCategoryId) : null,
      actualCategoryId: slot.actualCategoryId ? (ID_MAPPING[slot.actualCategoryId] || slot.actualCategoryId) : null,
  }));

  return migratedSlots;
};

// Helper to format date YYYY-MM-DD
export const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to add days to a date string
export const addDays = (dateString: string, days: number): string => {
  const date = new Date(dateString + 'T00:00:00');
  date.setDate(date.getDate() + days);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateDisplay = (dateString: string) => {
  const date = new Date(dateString + 'T00:00:00');
  if (isNaN(date.getTime())) return { day: '?', month: '', weekday: '' };
  
  const day = date.getDate();
  const month = date.toLocaleDateString('zh-CN', { month: 'short' }); // Changed to match locale roughly or keep short
  const weekday = date.toLocaleDateString('zh-CN', { weekday: 'short' });
  
  return { day, month, weekday };
};