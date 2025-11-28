import React, { useState, useEffect } from 'react';
import { INITIAL_CATEGORY_ID, generateTimeSlots, getTodayDateString, CATEGORIES, addDays, formatDateDisplay, migrateSlots } from './constants';
import { TimeSlot, ViewMode, SubActivity } from './types';
import { CategoryPalette } from './components/CategoryPalette';
import { Timeline } from './components/Timeline';
import { FocusTimer } from './components/FocusTimer';
import { StatisticsModal } from './components/StatisticsModal';
import { TemplateModal } from './components/TemplateModal';
import { generateMarkdown } from './services/markdown';
import { Download, Timer, Menu, X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, PieChart, LayoutTemplate } from 'lucide-react';

export default function App() {
  // --- Data Loading Logic ---
  const loadDataForDate = (date: string) => {
    // 1. Try Specific Date Key
    const key = `slots_${date}`;
    const saved = localStorage.getItem(key);
    if (saved) return migrateSlots(JSON.parse(saved));

    // 2. Try Legacy Key (only if date is today)
    if (date === getTodayDateString()) {
       const legacy = localStorage.getItem('timeblocker_data');
       if (legacy) return migrateSlots(JSON.parse(legacy));
    }

    // 3. Try Template (Auto-fill for new days)
    const template = localStorage.getItem('timeblocker_template');
    if (template) {
        try {
            const templateSlots = migrateSlots(JSON.parse(template));
            // Apply template plan to both plan and actual of the new day
            // Re-map to ensure IDs match valid current time slots if needed, though migrateSlots handles structure
            return templateSlots.map(ts => ({
                ...ts,
                planCategoryId: ts.planCategoryId,
                planSubActivityId: ts.planSubActivityId,
                // Requirement: Fill Actual too with the same plan
                actualCategoryId: ts.planCategoryId,
                actualSubActivityId: ts.planSubActivityId,
                note: ''
            }));
        } catch(e) { console.warn('Failed to load template', e); }
    }

    // 4. Default Empty
    return generateTimeSlots();
  };

  // --- Data State ---
  const [currentDate, setCurrentDate] = useState<string>(getTodayDateString());
  
  const [slots, setSlots] = useState<TimeSlot[]>(() => loadDataForDate(getTodayDateString()));

  const [subActivities, setSubActivities] = useState<SubActivity[]>(() => {
      const saved = localStorage.getItem('timeblocker_subactivities');
      return saved ? JSON.parse(saved) : [];
  });

  // --- UI State ---
  const [mode, setMode] = useState<ViewMode>('plan');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(INITIAL_CATEGORY_ID);
  const [selectedSubActivityId, setSelectedSubActivityId] = useState<string | null>(null);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTimerCategory, setActiveTimerCategory] = useState<string | null>(null);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);

  // --- Persistance ---
  useEffect(() => {
    if (slots.length > 0) {
      const key = `slots_${currentDate}`;
      localStorage.setItem(key, JSON.stringify(slots));
      
      if (currentDate === getTodayDateString()) {
        localStorage.setItem('timeblocker_data', JSON.stringify(slots));
      }
    }
  }, [slots, currentDate]);

  useEffect(() => {
      localStorage.setItem('timeblocker_subactivities', JSON.stringify(subActivities));
  }, [subActivities]);

  // --- Handlers ---

  const changeDate = (newDate: string) => {
    setCurrentDate(newDate);
    // Load fresh data for the new date
    setSlots(loadDataForDate(newDate));
  };

  const handlePrevDay = () => changeDate(addDays(currentDate, -1));
  const handleNextDay = () => changeDate(addDays(currentDate, 1));
  
  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      changeDate(e.target.value);
    }
  };

  const handleSlotClick = (index: number) => {
    const newSlots = [...slots];
    const isEraser = selectedCategoryId === 'eraser';
    
    const catId = isEraser ? null : selectedCategoryId;
    const subId = isEraser ? null : selectedSubActivityId;

    if (mode === 'plan') {
      newSlots[index].planCategoryId = catId;
      newSlots[index].planSubActivityId = subId;
    } else {
      newSlots[index].actualCategoryId = catId;
      newSlots[index].actualSubActivityId = subId;
    }
    setSlots(newSlots);
  };

  // --- Sub Activity CRUD ---
  const handleAddSubActivity = (parentId: string, name: string) => {
      const newSub: SubActivity = {
          id: Date.now().toString(),
          parentId,
          name
      };
      setSubActivities([...subActivities, newSub]);
  };

  const handleDeleteSubActivity = (id: string) => {
      setSubActivities(subActivities.filter(s => s.id !== id));
      if (selectedSubActivityId === id) {
          setSelectedSubActivityId(null);
      }
  };

  const handleSelectCategory = (catId: string, subId: string | null) => {
      setSelectedCategoryId(catId);
      setSelectedSubActivityId(subId);
      if (window.innerWidth < 768) setIsMobileMenuOpen(false); // Close mobile drawer only on full selection? Maybe annoying if just switching cats
  };

  // --- Tools ---
  const copyToClipboard = async () => {
    try {
      const md = generateMarkdown(slots, currentDate, subActivities);
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(md);
            alert(`Day Planner for ${currentDate} copied to clipboard!`);
            return;
        } catch (err) {
            console.warn("Clipboard API failed, trying fallback...", err);
        }
      }
      
      const textArea = document.createElement("textarea");
      textArea.value = md;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
            alert(`Day Planner for ${currentDate} copied to clipboard!`);
        } else {
            throw new Error("execCommand returned false");
        }
      } catch (err) {
        alert("Could not copy to clipboard. Please check browser permissions.");
      } finally {
        document.body.removeChild(textArea);
      }

    } catch (e) {
      console.error("Markdown generation failed", e);
      alert("An error occurred while generating the report.");
    }
  };

  const suggestTimer = () => {
    if (currentDate !== getTodayDateString()) {
      alert(`Focus Timer is best used for real-time tracking.\n\nPlease switch to Today (${getTodayDateString()}) to start a timer.`);
      return;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = Math.floor(now.getMinutes() / 5) * 5;
    
    const currentSlot = slots.find(s => s.hour === currentHour && s.minute === currentMin);
    
    if (currentSlot) {
      let categoryToStart = currentSlot.actualCategoryId || currentSlot.planCategoryId;
      if (!categoryToStart) {
          if (selectedCategoryId && selectedCategoryId !== 'eraser') {
              categoryToStart = selectedCategoryId;
          } else {
              categoryToStart = 'work';
          }
      }
      setActiveTimerCategory(categoryToStart);
    } else {
      alert("Could not determine current time. Please select a block manually.");
    }
  };

  const getTimerCategory = () => {
    if (!activeTimerCategory) return null;
    return CATEGORIES.find(c => c.id === activeTimerCategory);
  };

  const dateDisplay = formatDateDisplay(currentDate);

  // Helper to get name of currently selected tool
  const getSelectedToolName = () => {
      if (selectedCategoryId === 'eraser') return 'Eraser Mode';
      const cat = CATEGORIES.find(c => c.id === selectedCategoryId);
      if (!cat) return '';
      if (selectedSubActivityId) {
          const sub = subActivities.find(s => s.id === selectedSubActivityId);
          return `Painting: ${cat.name} - ${sub?.name}`;
      }
      return `Painting: ${cat.name}`;
  };

  return (
    <div className="flex flex-col h-screen md:flex-row bg-white overflow-hidden">
      
      {/* Header / Top Bar (Mobile) */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-100 bg-white z-20 flex-shrink-0">
        <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">1440<span className="text-purple-500">.</span></h1>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-500 uppercase">{mode} Mode</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Main Content Area: Timeline */}
      <div className="flex-1 flex flex-col relative h-full overflow-hidden">
        
        {/* Mode Switcher & Tools */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white/95 backdrop-blur z-20 relative shadow-sm">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setMode('plan')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'plan' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Plan
            </button>
            <button 
              onClick={() => setMode('actual')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'actual' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Actual
            </button>
          </div>

          <div className="flex gap-2">
             <button
                onClick={() => setIsTemplateOpen(true)}
                className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-full transition-colors cursor-pointer active:scale-95"
                title="Edit Master Template"
             >
                <LayoutTemplate size={20} />
             </button>
             <button
                onClick={() => setIsStatsOpen(true)}
                className="p-2 text-gray-500 hover:bg-orange-50 hover:text-orange-600 rounded-full transition-colors cursor-pointer active:scale-95"
                title="View Statistics"
             >
                <PieChart size={20} />
             </button>
             <button 
                onClick={suggestTimer}
                className="p-2 text-gray-500 hover:bg-purple-50 hover:text-purple-600 rounded-full transition-colors cursor-pointer active:scale-95"
                title="Start Focus Timer (Current Time)"
             >
                <Timer size={20} />
             </button>
             <button 
                onClick={copyToClipboard}
                className="p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-full transition-colors cursor-pointer active:scale-95"
                title="Export Markdown to Clipboard"
             >
                <Download size={20} />
             </button>
          </div>
        </div>

        {/* Date Header with Calendar & Navigation */}
        <div className="flex-shrink-0 px-4 py-3 bg-purple-500 text-white flex justify-between items-center shadow-md z-10 select-none relative">
           <div className="flex items-center gap-1">
             <button 
               onClick={handlePrevDay}
               className="p-1 hover:bg-white/20 rounded-full transition-colors"
             >
               <ChevronLeft size={24} />
             </button>
             
             <div className="flex flex-col items-center mx-2 relative group cursor-pointer">
                {/* Invisible Date Input Overlay */}
                <input 
                  type="date" 
                  value={currentDate} 
                  onChange={handleDateInput}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
                />
                <div className="flex items-baseline gap-2 px-3 py-1 rounded-lg group-hover:bg-white/10 transition-colors pointer-events-none">
                  <span className="text-2xl font-light">{dateDisplay.day}</span>
                  <div className="flex flex-col items-start leading-none">
                     <span className="text-xs uppercase tracking-wide opacity-70 font-bold">{dateDisplay.month}</span>
                     <span className="text-xs font-medium opacity-90">{dateDisplay.weekday}</span>
                  </div>
                  <CalendarIcon size={14} className="ml-1 opacity-60" />
                </div>
             </div>

             <button 
               onClick={handleNextDay}
               className="p-1 hover:bg-white/20 rounded-full transition-colors"
             >
               <ChevronRight size={24} />
             </button>
           </div>
           
           <div className="text-xs opacity-80 font-medium bg-white/20 px-2 py-1 rounded">
              {slots.filter(s => s.actualCategoryId).length * 5}m Tracked
           </div>
        </div>

        <Timeline 
          slots={slots} 
          mode={mode}
          subActivities={subActivities} 
          onSlotClick={handleSlotClick} 
          currentCategory={selectedCategoryId}
        />
        
        {/* Helper Text */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none bg-white/80 backdrop-blur px-3 py-1 rounded-full border border-gray-100 shadow-sm text-xs text-gray-400 z-10 whitespace-nowrap">
           {getSelectedToolName()}
        </div>
      </div>

      {/* Sidebar: Categories (Desktop: Sticky, Mobile: Drawer) */}
      <div className={`
        fixed inset-y-0 right-0 z-30 w-64 transform transition-transform duration-300 ease-in-out bg-white
        md:relative md:translate-x-0 md:w-72 md:shadow-none border-l border-gray-100 flex-shrink-0
        ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'}
      `}>
         <div className="h-full flex flex-col">
            <div className="md:hidden p-4 flex justify-end">
               <button onClick={() => setIsMobileMenuOpen(false)}><X className="text-gray-400"/></button>
            </div>
            
            <div className="px-6 pt-6 pb-2">
               <h2 className="text-lg font-bold text-gray-800">Category Palette</h2>
               <p className="text-xs text-gray-400 mt-1">Select a category then drag on the timeline.</p>
            </div>

            <CategoryPalette 
              selectedCategoryId={selectedCategoryId}
              selectedSubActivityId={selectedSubActivityId}
              subActivities={subActivities}
              onSelectCategory={handleSelectCategory}
              onAddSubActivity={handleAddSubActivity}
              onDeleteSubActivity={handleDeleteSubActivity}
              className="flex-1 shadow-none border-0"
            />
         </div>
      </div>

      {/* Focus Timer Modal */}
      {activeTimerCategory && (
        <FocusTimer 
          category={getTimerCategory()!} 
          isOpen={!!activeTimerCategory} 
          onClose={() => setActiveTimerCategory(null)} 
        />
      )}

      {/* Statistics Modal */}
      <StatisticsModal 
        isOpen={isStatsOpen} 
        onClose={() => setIsStatsOpen(false)} 
      />

      {/* Template Modal */}
      <TemplateModal 
        isOpen={isTemplateOpen}
        onClose={() => setIsTemplateOpen(false)}
        subActivities={subActivities}
        onAddSubActivity={handleAddSubActivity}
        onDeleteSubActivity={handleDeleteSubActivity}
      />

    </div>
  );
}
