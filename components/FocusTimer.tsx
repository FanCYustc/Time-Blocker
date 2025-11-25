import React, { useState, useEffect, useCallback } from 'react';
import { X, Play, Pause, RotateCcw, CheckCircle } from 'lucide-react';
import { TimerState, Category } from '../types';

interface FocusTimerProps {
  category: Category;
  isOpen: boolean;
  onClose: () => void;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({ category, isOpen, onClose }) => {
  const DEFAULT_TIME = 25 * 60; // 25 minutes in seconds
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIME);
  const [timerState, setTimerState] = useState<TimerState>('idle');
  
  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setTimerState('idle');
      setTimeLeft(DEFAULT_TIME);
    }
  }, [isOpen]);

  // Timer Logic
  useEffect(() => {
    let interval: number | undefined;

    if (timerState === 'running' && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerState === 'running') {
      setTimerState('completed');
    }

    return () => clearInterval(interval);
  }, [timerState, timeLeft]);

  const toggleTimer = useCallback(() => {
    if (timerState === 'idle' || timerState === 'paused') {
      setTimerState('running');
    } else if (timerState === 'running') {
      setTimerState('paused');
    }
  }, [timerState]);

  const resetTimer = () => {
    setTimerState('idle');
    setTimeLeft(DEFAULT_TIME);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((DEFAULT_TIME - timeLeft) / DEFAULT_TIME) * 100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all scale-100`}>
        {/* Header */}
        <div className={`p-6 text-center ${category.colorClass} ${category.textColorClass}`}>
          <h2 className="text-2xl font-bold">{category.name}</h2>
          <p className="opacity-80 font-medium">Focus Session</p>
        </div>

        {/* Timer Display */}
        <div className="p-8 flex flex-col items-center">
          <div className="relative w-64 h-64 flex items-center justify-center mb-8">
            {/* SVG Ring */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-gray-100"
              />
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 120}
                strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
                strokeLinecap="round"
                className={`${category.textColorClass === 'text-white' ? 'text-purple-500' : category.textColorClass} transition-all duration-1000 ease-linear`}
              />
            </svg>
            <div className="absolute text-6xl font-bold tracking-tighter text-gray-800 font-mono">
                {timerState === 'completed' ? 'Done' : formatTime(timeLeft)}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-6">
            {timerState !== 'completed' && (
                <button
                onClick={resetTimer}
                className="p-4 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                title="Reset"
                >
                <RotateCcw size={24} />
                </button>
            )}

            {timerState === 'completed' ? (
                 <button
                 onClick={onClose}
                 className="px-8 py-3 rounded-full bg-green-500 text-white font-bold text-lg hover:bg-green-600 transition-colors flex items-center gap-2"
               >
                 <CheckCircle size={24}/> Finish
               </button>
            ) : (
                <button
                onClick={toggleTimer}
                className={`p-6 rounded-full text-white shadow-lg transform active:scale-95 transition-all ${timerState === 'running' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                {timerState === 'running' ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1"/>}
                </button>
            )}
          </div>
        </div>
        
        {/* Close Button absolute */}
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
        >
            <X size={20} />
        </button>
      </div>
    </div>
  );
};
