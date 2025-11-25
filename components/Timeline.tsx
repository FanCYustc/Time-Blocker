import React, { useRef, useEffect } from 'react';
import { TimeSlot, Category, ViewMode, SubActivity } from '../types';
import { CATEGORIES } from '../constants';

interface TimelineProps {
  slots: TimeSlot[];
  mode: ViewMode;
  subActivities: SubActivity[];
  onSlotClick: (index: number) => void;
  currentCategory: string; // Used for "painting" cursor effect
}

interface Segment {
  categoryId: string | null;
  subActivityId: string | null;
  count: number;
  startIndex: number; // 0-11 within the hour
}

export const Timeline: React.FC<TimelineProps> = ({ slots, mode, subActivities, onSlotClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Scroll to 8am on mount
  useEffect(() => {
    if (containerRef.current) {
      // 8:00 AM is the 8th hour row (index 8)
      const eightAmElement = containerRef.current.children[8] as HTMLElement;
      if (eightAmElement) {
        eightAmElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, []);

  // Handle global mouse up to stop dragging
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  const getCategory = (id: string | null): Category | undefined => {
    return CATEGORIES.find((c) => c.id === id);
  };

  const getSubActivityName = (id: string | null): string | undefined => {
      return subActivities.find(s => s.id === id)?.name;
  };

  const handleMouseDown = (index: number, e: React.MouseEvent) => {
    // Only initiate drag on left click
    if (e.button === 0) {
      isDragging.current = true;
      onSlotClick(index);
    }
  };

  const handleMouseEnter = (index: number) => {
    if (isDragging.current) {
      onSlotClick(index);
    }
  };

  // Helper to group slots into continuous segments for an hour
  const getSegments = (hourSlots: TimeSlot[]): Segment[] => {
    const segments: Segment[] = [];
    if (hourSlots.length === 0) return segments;

    // Determine category/subActivity IDs based on mode
    const getSlotData = (slot: TimeSlot) => {
        if (mode === 'plan') return { cat: slot.planCategoryId, sub: slot.planSubActivityId || null };
        return { cat: slot.actualCategoryId, sub: slot.actualSubActivityId || null };
    };

    const first = getSlotData(hourSlots[0]);
    let currentRun: Segment = {
      categoryId: first.cat,
      subActivityId: first.sub,
      startIndex: 0,
      count: 0
    };

    hourSlots.forEach((slot, index) => {
      const { cat, sub } = getSlotData(slot);
      
      // Merge if Category AND SubActivity match
      if (cat === currentRun.categoryId && sub === currentRun.subActivityId) {
        currentRun.count++;
      } else {
        segments.push({ ...currentRun });
        currentRun = { categoryId: cat, subActivityId: sub, startIndex: index, count: 1 };
      }
    });
    // Push the final segment
    segments.push({ ...currentRun });
    return segments;
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div 
      className="flex-1 overflow-y-auto bg-white relative no-scrollbar pb-24 select-none" 
      ref={containerRef}
    >
      {hours.map((hour) => {
        const hourStartIndex = hour * 12;
        // Get the 12 slots for this hour
        const hourSlots = slots.slice(hourStartIndex, hourStartIndex + 12);
        const segments = getSegments(hourSlots);
        
        return (
          <div key={`h-${hour}`} className="flex border-b border-gray-50 min-h-[3.5rem] relative">
            {/* Hour Label */}
            <div className="w-14 flex-shrink-0 flex items-center justify-center border-r border-gray-100 bg-gray-50/50 text-xs font-bold text-gray-500 z-10">
              {hour.toString().padStart(2, '0')}:00
            </div>

            {/* Grid Container */}
            <div className="flex-1 relative">
              
              {/* Layer 1: Visual Merged Blocks (Background & Labels) */}
              <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                {segments.map((seg, i) => {
                  const category = getCategory(seg.categoryId);
                  const subName = getSubActivityName(seg.subActivityId);
                  
                  // Calculate global indices to check continuity across hours
                  const globalStart = hourStartIndex + seg.startIndex;
                  const globalEnd = globalStart + seg.count - 1;
                  
                  // Helper for looking up slot data
                  const getSlotData = (idx: number) => {
                    const s = slots[idx];
                    if (!s) return { cat: null, sub: null };
                    return mode === 'plan' 
                        ? { cat: s.planCategoryId, sub: s.planSubActivityId } 
                        : { cat: s.actualCategoryId, sub: s.actualSubActivityId };
                  };

                  const prev = getSlotData(globalStart - 1);
                  const next = getSlotData(globalEnd + 1);

                  // Check if the adjacent slot matches both category and sub-activity
                  const isSameAsPrev = prev.cat === seg.categoryId && prev.sub === seg.subActivityId;
                  const isSameAsNext = next.cat === seg.categoryId && next.sub === seg.subActivityId;

                  const roundedLeft = !isSameAsPrev ? 'rounded-l-md' : '';
                  const roundedRight = !isSameAsNext ? 'rounded-r-md' : '';

                  // Inline style for grid spanning
                  const gridStyle = { gridColumn: `span ${seg.count} / span ${seg.count}` };

                  if (!category) {
                    // Render empty slots as a flex container of dashed boxes
                    return (
                      <div 
                        key={i} 
                        style={gridStyle} 
                        className="flex h-full"
                      >
                         {Array.from({ length: seg.count }).map((_, idx) => (
                           <div key={idx} className="flex-1 border-r border-dashed border-gray-100 last:border-r-0" />
                         ))}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={i}
                      style={gridStyle}
                      className={`
                        relative h-full flex items-center justify-center overflow-hidden
                        ${category.colorClass} 
                        ${roundedLeft} ${roundedRight}
                        transition-colors duration-150
                        px-1 py-0.5 m-[1px]
                        border-white border-opacity-20
                      `}
                    >
                      {/* Only show label if segment is wide enough (>= 10 mins or very short text) */}
                      <span className={`
                        text-xs font-semibold truncate w-full text-center
                        ${category.textColorClass}
                        ${seg.count === 1 ? 'opacity-0 xl:opacity-100' : 'opacity-100'}
                      `}>
                        {subName || category.name}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Layer 2: Interaction Grid (Transparent Overlay) */}
              <div className="grid grid-cols-12 h-full relative z-0">
                {hourSlots.map((slot, localIndex) => (
                  <div
                    key={slot.id}
                    onMouseDown={(e) => handleMouseDown(hourStartIndex + localIndex, e)}
                    onMouseEnter={() => handleMouseEnter(hourStartIndex + localIndex)}
                    className="h-full border-r border-transparent hover:bg-black/5 transition-colors cursor-pointer"
                    title={`${slot.timeLabel} ${getCategory(mode === 'plan' ? slot.planCategoryId : slot.actualCategoryId)?.name || ''}`}
                  />
                ))}
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
};