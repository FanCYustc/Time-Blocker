import { TimeSlot, SubActivity } from '../types';
import { CATEGORIES } from '../constants';

export const generateMarkdown = (slots: TimeSlot[], date: string, subActivities: SubActivity[]): string => {
  const getCatName = (id: string | null) => {
    return CATEGORIES.find(c => c.id === id)?.name || 'Unassigned';
  };
  
  const getSubName = (id: string | null) => {
    return subActivities.find(s => s.id === id)?.name;
  };

  let md = `## Day Planner\n`;
  md += `**这是${date}的日计划**\n\n`;

  const morningEvents: string[] = [];
  const afternoonEvents: string[] = [];

  slots.forEach((slot, index) => {
    // Only process Plan data for Day Planner export
    const currentId = slot.planCategoryId;
    const currentSub = slot.planSubActivityId;
    
    const prevSlot = index > 0 ? slots[index - 1] : null;
    const prevId = prevSlot?.planCategoryId;
    const prevSub = prevSlot?.planSubActivityId;

    // Determine start of a new block:
    // Change if Category changes OR SubActivity changes
    if (currentId && (currentId !== prevId || currentSub !== prevSub)) {
        const catName = getCatName(currentId);
        const subName = getSubName(currentSub);
        
        const displayName = subName ? `${catName} - ${subName}` : catName;
        const time = slot.timeLabel;
        
        // Day Planner Format: - [ ] HH:mm Activity
        let line = `- [ ] ${time} ${displayName}`;
        
        // Append note if present (on new line)
        if (slot.note) {
            line += `\n${slot.note}`;
        }
        
        if (slot.hour < 12) {
            morningEvents.push(line);
        } else {
            afternoonEvents.push(line);
        }
    }
  });

  md += `### 上午\n`;
  if (morningEvents.length > 0) {
    md += morningEvents.join('\n');
  }
  
  md += `\n\n### 下午\n`;
  if (afternoonEvents.length > 0) {
    md += afternoonEvents.join('\n');
  }

  return md;
};