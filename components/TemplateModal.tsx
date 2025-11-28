import React, { useState, useEffect } from 'react';
import { Save, LayoutTemplate } from 'lucide-react';
import { TimeSlot, SubActivity } from '../types';
import { generateTimeSlots, migrateSlots, INITIAL_CATEGORY_ID } from '../constants';
import { CategoryPalette } from './CategoryPalette';
import { Timeline } from './Timeline';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  subActivities: SubActivity[];
  onAddSubActivity: (parentId: string, name: string) => void;
  onDeleteSubActivity: (id: string) => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  subActivities,
  onAddSubActivity,
  onDeleteSubActivity
}) => {
  // Local state for the template slots
  const [templateSlots, setTemplateSlots] = useState<TimeSlot[]>(() => {
    const saved = localStorage.getItem('timeblocker_template');
    return saved ? migrateSlots(JSON.parse(saved)) : generateTimeSlots();
  });

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(INITIAL_CATEGORY_ID);
  const [selectedSubActivityId, setSelectedSubActivityId] = useState<string | null>(null);

  // Persist template whenever it changes
  useEffect(() => {
    localStorage.setItem('timeblocker_template', JSON.stringify(templateSlots));
  }, [templateSlots]);

  const handleSlotClick = (index: number) => {
    const newSlots = [...templateSlots];
    const isEraser = selectedCategoryId === 'eraser';
    
    // We only update the 'plan' fields for the template definition
    // When applying to real days, we'll copy this to both plan and actual
    newSlots[index].planCategoryId = isEraser ? null : selectedCategoryId;
    newSlots[index].planSubActivityId = isEraser ? null : selectedSubActivityId;
    
    setTemplateSlots(newSlots);
  };

  const handleSelectCategory = (catId: string, subId: string | null) => {
    setSelectedCategoryId(catId);
    setSelectedSubActivityId(subId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full h-full max-w-6xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                <LayoutTemplate size={20} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-gray-800">Master Template</h2>
                <p className="text-xs text-gray-500">Define your ideal day. This pattern will auto-fill new days.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <Save size={16} /> Done
          </button>
        </div>

        {/* Editor Body */}
        <div className="flex-1 flex overflow-hidden">
            {/* Sidebar Palette */}
            <div className="w-64 border-r border-gray-100 bg-white flex flex-col flex-shrink-0 overflow-y-auto">
                <div className="p-4 border-b border-gray-50">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Palette</p>
                </div>
                <CategoryPalette 
                    selectedCategoryId={selectedCategoryId}
                    selectedSubActivityId={selectedSubActivityId}
                    subActivities={subActivities}
                    onSelectCategory={handleSelectCategory}
                    onAddSubActivity={onAddSubActivity}
                    onDeleteSubActivity={onDeleteSubActivity}
                    className="flex-1 shadow-none border-0"
                />
            </div>

            {/* Timeline Preview */}
            <div className="flex-1 flex flex-col bg-gray-50/30 overflow-hidden relative">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-purple-200 pointer-events-none">
                    Editing Template Mode
                </div>
                <Timeline 
                    slots={templateSlots}
                    mode="plan" // Always show as plan in template editor
                    subActivities={subActivities}
                    onSlotClick={handleSlotClick}
                    currentCategory={selectedCategoryId}
                />
            </div>
        </div>
      </div>
    </div>
  );
};
