import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, PieChart, Activity, Clock } from 'lucide-react';
import { CATEGORIES, getTodayDateString, addDays } from '../constants';
import { TimeSlot, ViewMode } from '../types';

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AggregatedData {
  categoryId: string;
  count: number; // number of 5-min slots
  totalMinutes: number;
  percentage: number;
}

export const StatisticsModal: React.FC<StatisticsModalProps> = ({ isOpen, onClose }) => {
  // Default to last 7 days
  const [startDate, setStartDate] = useState(addDays(getTodayDateString(), -6));
  const [endDate, setEndDate] = useState(getTodayDateString());
  const [viewMode, setViewMode] = useState<ViewMode>('actual');

  // Calculate Statistics
  // HOOK FIX: This must run unconditionally (before any return statement)
  const stats = useMemo(() => {
    // Optimization: If closed, return empty to save processing, but the hook itself still runs
    if (!isOpen) {
        return { data: [], totalMinutes: 0 };
    }

    const categoryMap = new Map<string, number>();
    let totalSlotsTracked = 0;

    // Iterate through date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const key = `slots_${dateStr}`;
      const savedData = localStorage.getItem(key);
      
      if (savedData) {
        try {
          const slots: TimeSlot[] = JSON.parse(savedData);
          slots.forEach(slot => {
            const catId = viewMode === 'plan' ? slot.planCategoryId : slot.actualCategoryId;
            if (catId) {
              categoryMap.set(catId, (categoryMap.get(catId) || 0) + 1);
              totalSlotsTracked++;
            }
          });
        } catch (e) {
          console.warn(`Failed to parse data for ${dateStr}`);
        }
      }
    }

    // Convert map to array
    const result: AggregatedData[] = [];
    categoryMap.forEach((count, categoryId) => {
      result.push({
        categoryId,
        count,
        totalMinutes: count * 5,
        percentage: totalSlotsTracked > 0 ? (count / totalSlotsTracked) * 100 : 0
      });
    });

    // Sort by duration descending
    return {
      data: result.sort((a, b) => b.count - a.count),
      totalMinutes: totalSlotsTracked * 5
    };
  }, [startDate, endDate, viewMode, isOpen]);

  // HOOK FIX: Early return placed AFTER all hooks
  if (!isOpen) return null;

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2 text-purple-600">
             <PieChart className="w-6 h-6" />
             <h2 className="text-xl font-bold text-gray-800">Statistics</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Controls */}
        <div className="p-5 grid gap-4 md:grid-cols-2 border-b border-gray-100 bg-white">
           <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Date Range</label>
              <div className="flex items-center gap-2">
                 <div className="relative flex-1">
                   <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-purple-200 outline-none"
                   />
                   <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                 </div>
                 <span className="text-gray-400">-</span>
                 <div className="relative flex-1">
                   <input 
                      type="date" 
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-purple-200 outline-none"
                   />
                   <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                 </div>
              </div>
           </div>

           <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Data Source</label>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                  onClick={() => setViewMode('plan')}
                  className={`flex-1 py-1 text-sm font-medium rounded-md transition-all ${viewMode === 'plan' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}
                >
                  Planned
                </button>
                <button 
                  onClick={() => setViewMode('actual')}
                  className={`flex-1 py-1 text-sm font-medium rounded-md transition-all ${viewMode === 'actual' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
                >
                  Actual
                </button>
              </div>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
             <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                   <Clock size={16} />
                   <span className="text-xs font-bold uppercase tracking-wide">Total Time</span>
                </div>
                <div className="text-2xl font-bold text-gray-800">
                   {formatDuration(stats.totalMinutes)}
                </div>
             </div>
             <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                   <Activity size={16} />
                   <span className="text-xs font-bold uppercase tracking-wide">Top Activity</span>
                </div>
                <div className="text-lg font-bold text-gray-800 truncate">
                   {stats.data.length > 0 ? CATEGORIES.find(c => c.id === stats.data[0].categoryId)?.name : '-'}
                </div>
                {stats.data.length > 0 && (
                  <div className="text-xs text-blue-400 font-medium">
                    {stats.data[0].percentage.toFixed(1)}% of total
                  </div>
                )}
             </div>
          </div>

          {/* Visual Distribution Bar */}
          {stats.totalMinutes > 0 && (
             <div className="mb-6">
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Distribution</h3>
                <div className="h-4 w-full flex rounded-full overflow-hidden">
                   {stats.data.map(item => {
                      const cat = CATEGORIES.find(c => c.id === item.categoryId);
                      if (!cat) return null;
                      return (
                         <div 
                           key={item.categoryId}
                           className={`${cat.colorClass}`}
                           style={{ width: `${item.percentage}%` }}
                           title={`${cat.name}: ${item.percentage.toFixed(1)}%`}
                         />
                      );
                   })}
                </div>
             </div>
          )}

          {/* List View */}
          <div className="space-y-3">
             <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Breakdown</h3>
             {stats.data.length === 0 ? (
                <div className="text-center text-gray-400 py-8 text-sm">
                   No data recorded for this period.
                </div>
             ) : (
                stats.data.map((item) => {
                   const cat = CATEGORIES.find(c => c.id === item.categoryId);
                   if (!cat) return null;
                   
                   return (
                      <div key={item.categoryId} className="flex items-center gap-3">
                         {/* Icon/Color Box */}
                         <div className={`w-8 h-8 rounded-lg ${cat.colorClass} flex items-center justify-center text-xs font-bold ${cat.textColorClass}`}>
                            {cat.name.substring(0, 1)}
                         </div>

                         {/* Bar & Label */}
                         <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                               <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                               <span className="text-xs font-medium text-gray-500">{formatDuration(item.totalMinutes)}</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                               <div 
                                  className={`h-full rounded-full ${cat.colorClass}`} 
                                  style={{ width: `${item.percentage}%` }}
                               />
                            </div>
                         </div>

                         {/* Percentage */}
                         <div className="w-12 text-right text-xs font-bold text-gray-400">
                            {item.percentage.toFixed(1)}%
                         </div>
                      </div>
                   );
                })
             )}
          </div>
          
        </div>
      </div>
    </div>
  );
};