import { TimeSlot, SubActivity } from '../types';
import { CATEGORIES } from '../constants';

interface TimeBlock {
  name: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  startHour: number;
  note?: string;
}

// Helper to add minutes to "HH:mm" and return "HH:mm"
const addMinutes = (time: string, minutes: number): string => {
  const [h, m] = time.split(':').map(Number);
  const totalMins = h * 60 + m + minutes;
  const newH = Math.floor(totalMins / 60) % 24;
  const newM = totalMins % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
};

// Helper to aggregate slots into contiguous blocks
const getSegments = (slots: TimeSlot[], subActivities: SubActivity[], mode: 'plan' | 'actual'): TimeBlock[] => {
  const blocks: TimeBlock[] = [];
  if (slots.length === 0) return blocks;

  let currentBlock: { 
      catId: string | null; 
      subId: string | null; 
      startTime: string; 
      startHour: number;
      count: number; 
      notes: Set<string>;
  } | null = null;

  const finalizeBlock = () => {
      if (currentBlock && currentBlock.catId) { // Only add if category is set (skip gaps)
           const cat = CATEGORIES.find(c => c.id === currentBlock!.catId);
           const sub = subActivities.find(s => s.id === currentBlock!.subId);
           // Format name as "Category" or "Category - SubActivity"
           const name = sub ? `${cat?.name} - ${sub.name}` : (cat?.name || 'Unknown');
           const endTime = addMinutes(currentBlock.startTime, currentBlock.count * 5);
           
           // Combine unique notes
           const noteStr = Array.from(currentBlock.notes).filter(Boolean).join('; ');

           blocks.push({
               name,
               startTime: currentBlock.startTime,
               endTime,
               startHour: currentBlock.startHour,
               note: noteStr
           });
      }
  };

  slots.forEach((slot) => {
      const catId = mode === 'plan' ? slot.planCategoryId : slot.actualCategoryId;
      const subId = mode === 'plan' ? slot.planSubActivityId : slot.actualSubActivityId;
      const note = slot.note;

      if (!currentBlock) {
          currentBlock = {
              catId,
              subId,
              startTime: slot.timeLabel,
              startHour: slot.hour,
              count: 1,
              notes: new Set(note ? [note] : [])
          };
      } else {
          // Check if same continuous block (Category AND SubActivity match)
          if (catId === currentBlock.catId && subId === currentBlock.subId) {
              currentBlock.count++;
              if (note) currentBlock.notes.add(note);
          } else {
              finalizeBlock();
              currentBlock = {
                  catId,
                  subId,
                  startTime: slot.timeLabel,
                  startHour: slot.hour,
                  count: 1,
                  notes: new Set(note ? [note] : [])
              };
          }
      }
  });
  
  // Finalize the last block
  finalizeBlock();

  return blocks;
};

const formatSection = (title: string, date: string, blocks: TimeBlock[]): string => {
  let md = `## ${title}\n`;
  // Standardized subtitle to "日计划" for both sections as per template
  md += `**这是${date}的日计划**\n\n`;

  const morning = blocks.filter(b => b.startHour < 12);
  const afternoon = blocks.filter(b => b.startHour >= 12);

  md += `### 上午\n`;
  if (morning.length > 0) {
      morning.forEach(b => {
          // Changed format from "- [ ] ..." to "- ..."
          md += `- ${b.startTime} - ${b.endTime} ${b.name}${b.note ? `\n  ${b.note}` : ''}\n`;
      });
  } else {
      md += `(无记录)\n`;
  }

  md += `\n### 下午\n`;
  if (afternoon.length > 0) {
      afternoon.forEach(b => {
           md += `- ${b.startTime} - ${b.endTime} ${b.name}${b.note ? `\n  ${b.note}` : ''}\n`;
      });
  } else {
      md += `(无记录)\n`;
  }
  
  return md;
};

export const generateMarkdown = (slots: TimeSlot[], date: string, subActivities: SubActivity[]): string => {
  const planBlocks = getSegments(slots, subActivities, 'plan');
  const actualBlocks = getSegments(slots, subActivities, 'actual');

  // 1. Text Sections
  let md = formatSection('Day Planner (Plan)', date, planBlocks);
  md += `\n\n---\n\n`;
  md += formatSection('Day Planner (Actual)', date, actualBlocks);

  // 3. Mermaid Gantt Chart - Plan
  md += `\n\n\`\`\`mermaid\n`;
  md += `gantt\n`;
  md += `    title Daily Timeline ${date}\n`;
  md += `    dateFormat HH:mm\n`;
  md += `    axisFormat %H:%M\n`;
  md += `    tickInterval 2hour\n`;
  md += `    section Plan\n`;
  
  if (planBlocks.length > 0) {
    planBlocks.forEach(b => {
        const safeName = b.name.replace(/[:#]/g, ' '); 
        md += `    ${safeName} : ${b.startTime}, ${b.endTime}\n`;
    });
  } else {
      md += `    (No Plan) : 00:00, 00:00\n`;
  }
  md += `\`\`\`\n`;

  // 4. Mermaid Gantt Chart - Actual (Separate Block)
  md += `\n\n\`\`\`mermaid\n`;
  md += `gantt\n`;
  md += `    title Daily Timeline ${date}\n`;
  md += `    dateFormat HH:mm\n`;
  md += `    axisFormat %H:%M\n`;
  md += `    tickInterval 2hour\n`;
  md += `    section Actual\n`;

  if (actualBlocks.length > 0) {
    actualBlocks.forEach(b => {
        const safeName = b.name.replace(/[:#]/g, ' ');
        md += `    ${safeName} : ${b.startTime}, ${b.endTime}\n`;
    });
  } else {
      md += `    (No Actual) : 00:00, 00:00\n`;
  }
  
  md += `\`\`\`\n`;

  return md;
};