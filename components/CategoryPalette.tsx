import React, { useState } from 'react';
import { Category, SubActivity } from '../types';
import { CATEGORIES } from '../constants';
import { Check, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

interface CategoryPaletteProps {
  selectedCategoryId: string;
  selectedSubActivityId: string | null;
  subActivities: SubActivity[];
  onSelectCategory: (catId: string, subId: string | null) => void;
  onAddSubActivity: (parentId: string, name: string) => void;
  onDeleteSubActivity: (id: string) => void;
  className?: string;
}

export const CategoryPalette: React.FC<CategoryPaletteProps> = ({
  selectedCategoryId,
  selectedSubActivityId,
  subActivities,
  onSelectCategory,
  onAddSubActivity,
  onDeleteSubActivity,
  className = '',
}) => {
  const [newSubActivityName, setNewSubActivityName] = useState('');
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);

  const handleAddSubmit = (parentId: string) => {
    if (newSubActivityName.trim()) {
      onAddSubActivity(parentId, newSubActivityName.trim());
      setNewSubActivityName('');
      setAddingToCategory(null);
    }
  };

  return (
    <div className={`flex flex-col gap-2 p-4 bg-white shadow-lg border-l border-gray-100 ${className}`}>
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Activities</h3>
      <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-200px)] no-scrollbar">
        {CATEGORIES.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            const categorySubs = subActivities.filter(s => s.parentId === cat.id);
            const isAdding = addingToCategory === cat.id;

            return (
              <div key={cat.id} className="flex flex-col gap-1">
                {/* Main Category Button */}
                <button
                  onClick={() => onSelectCategory(cat.id, null)}
                  className={`
                    relative flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200
                    ${cat.colorClass} ${cat.textColorClass}
                    ${isSelected ? 'ring-2 ring-offset-2 ring-gray-400 shadow-md z-10' : 'opacity-80 hover:opacity-100'}
                  `}
                >
                  <span className="flex items-center gap-2">
                    {cat.name}
                  </span>
                  {isSelected && selectedSubActivityId === null && <Check size={16} />}
                </button>

                {/* Sub-Activities List (Only show if category is selected or has items) */}
                {(isSelected || categorySubs.length > 0) && (
                  <div className={`ml-4 flex flex-col gap-1 pl-2 border-l-2 ${isSelected ? 'border-gray-300' : 'border-gray-100'}`}>
                    {categorySubs.map(sub => (
                      <div key={sub.id} className="flex items-center group">
                        <button
                          onClick={() => onSelectCategory(cat.id, sub.id)}
                          className={`
                            flex-1 text-left text-xs py-1.5 px-2 rounded
                            flex justify-between items-center
                            ${selectedSubActivityId === sub.id 
                                ? 'bg-gray-100 font-semibold text-gray-800' 
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}
                          `}
                        >
                          <span>{sub.name}</span>
                          {selectedSubActivityId === sub.id && <Check size={12} />}
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteSubActivity(sub.id); }}
                            className="p-1 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 size={12} />
                        </button>
                      </div>
                    ))}

                    {/* Add Sub Activity Input */}
                    {isAdding ? (
                        <div className="flex items-center gap-1 mt-1">
                            <input
                                autoFocus
                                type="text"
                                value={newSubActivityName}
                                onChange={(e) => setNewSubActivityName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSubmit(cat.id)}
                                onBlur={() => {
                                    // Small delay to allow button click to register
                                    setTimeout(() => setAddingToCategory(null), 200);
                                }}
                                className="w-full text-xs px-2 py-1 border rounded"
                                placeholder="Sub-activity..."
                            />
                        </div>
                    ) : (
                        <button 
                            onClick={() => setAddingToCategory(cat.id)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 mt-1"
                        >
                            <Plus size={12} /> Add sub-activity
                        </button>
                    )}
                  </div>
                )}
              </div>
            );
        })}
        
        <button
          onClick={() => onSelectCategory('eraser', null)}
          className={`
            relative flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200
            bg-white border-2 border-dashed border-gray-300 text-gray-500 mt-4
            ${selectedCategoryId === 'eraser' ? 'ring-2 ring-offset-2 ring-gray-400 scale-105' : 'hover:bg-gray-50'}
          `}
        >
            <span>Eraser</span>
            {selectedCategoryId === 'eraser' && <Check size={16} />}
        </button>
      </div>
    </div>
  );
};