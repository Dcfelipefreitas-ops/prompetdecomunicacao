
import React from 'react';
import { X, Type, FastForward, Eye, Layers, FileText, ChevronRight } from 'lucide-react';
import { PrompterConfig, RecordingStatus } from '../types';

interface ControlPanelProps {
  config: PrompterConfig;
  setConfig: React.Dispatch<React.SetStateAction<PrompterConfig>>;
  status: RecordingStatus;
  onClose: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ config, setConfig, status, onClose }) => {
  const updateConfig = (key: keyof PrompterConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const isRecording = status !== 'idle';

  return (
    <div className="h-full flex flex-col p-6 space-y-8 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-blue-500" />
          Settings
        </h2>
        <button 
          onClick={onClose}
          className="md:hidden p-2 hover:bg-slate-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Script Input */}
        <section className="space-y-3">
          <label className="text-sm font-medium text-slate-400 flex items-center gap-2 uppercase tracking-wider">
            <FileText className="w-4 h-4" />
            Your Script
          </label>
          <textarea
            value={config.script}
            onChange={(e) => updateConfig('script', e.target.value)}
            disabled={isRecording}
            placeholder="Paste your lines here..."
            className="w-full h-48 bg-slate-800 border border-slate-700 rounded-xl p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none transition-all"
          />
        </section>

        {/* Speed Control */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-slate-400 flex items-center gap-2 uppercase tracking-wider">
              <FastForward className="w-4 h-4" />
              Scroll Speed
            </label>
            <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-blue-400">{config.speed}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="10"
            step="0.5"
            value={config.speed}
            onChange={(e) => updateConfig('speed', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </section>

        {/* Font Size Control */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-slate-400 flex items-center gap-2 uppercase tracking-wider">
              <Type className="w-4 h-4" />
              Font Size
            </label>
            <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-blue-400">{config.fontSize}px</span>
          </div>
          <input
            type="range"
            min="24"
            max="120"
            step="4"
            value={config.fontSize}
            onChange={(e) => updateConfig('fontSize', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </section>

        {/* Toggles */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => updateConfig('mirror', !config.mirror)}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${config.mirror ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
          >
            <Eye className="w-5 h-5" />
            <span className="text-xs font-medium uppercase tracking-tight">Mirror Text</span>
          </button>
          
          <button 
            onClick={() => updateConfig('opacity', config.opacity === 1 ? 0.6 : 1)}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${config.opacity < 1 ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-xs font-medium uppercase tracking-tight">Fade BG</span>
          </button>
        </div>

        {/* File Name */}
        <section className="space-y-3 pt-4">
          <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">File Name</label>
          <div className="relative">
            <input
              type="text"
              value={config.fileName}
              onChange={(e) => updateConfig('fileName', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">.mp4</span>
          </div>
        </section>
      </div>

      <div className="flex-1" />
      
      <div className="pt-6 border-t border-slate-800 text-[10px] text-slate-600 uppercase tracking-[0.2em] text-center">
        Created with Gemini AI Studio
      </div>
    </div>
  );
};

const SettingsIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
  </svg>
);

export default ControlPanel;
