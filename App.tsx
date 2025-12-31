
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Settings, Play, Square, Download, Video, VideoOff, Type, Maximize2, RotateCcw, Monitor } from 'lucide-react';
import { PrompterConfig, RecordingStatus } from './types';
import VideoRecorder from './components/VideoRecorder';
import Teleprompter from './components/Teleprompter';
import ControlPanel from './components/ControlPanel';

const App: React.FC = () => {
  const [config, setConfig] = useState<PrompterConfig>({
    script: "Welcome to ProPrompter AI. This is a professional studio environment designed for content creators. Paste your script on the left, adjust the scroll speed and font size, then hit record to start your session. \n\nSmooth scrolling ensures you never lose your place while looking directly into the lens. Good luck with your recording!",
    speed: 2,
    fontSize: 48,
    mirror: false,
    opacity: 0.8,
    fileName: 'my-video'
  });

  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [showSettings, setShowSettings] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);

  const startRecording = useCallback(() => {
    let count = 3;
    setCountdown(count);
    setStatus('starting');
    
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(interval);
        setCountdown(null);
        setStatus('recording');
      }
    }, 1000);
  }, []);

  const stopRecording = useCallback(() => {
    setStatus('stopping');
  }, []);

  const handleRecordingFinished = useCallback(() => {
    setStatus('idle');
  }, []);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-950 overflow-hidden">
      {/* Sidebar Controls */}
      <aside className={`transition-all duration-300 ease-in-out border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl z-50 ${showSettings ? 'w-full md:w-96' : 'w-0 overflow-hidden md:w-0'}`}>
        <ControlPanel 
          config={config} 
          setConfig={setConfig} 
          status={status}
          onClose={() => setShowSettings(false)}
        />
      </aside>

      {/* Main Studio Area */}
      <main className="relative flex-1 flex flex-col items-center justify-center p-4">
        {/* Header Branding */}
        <div className="absolute top-6 left-6 flex items-center gap-3 z-40 pointer-events-none">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Video className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            ProPrompter AI
          </h1>
        </div>

        {/* Studio View */}
        <div className="relative w-full h-full max-w-6xl aspect-video rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-black group">
          <VideoRecorder 
            status={status} 
            config={config} 
            onFinished={handleRecordingFinished}
          />
          
          <Teleprompter 
            config={config} 
            isScrolling={status === 'recording'} 
          />

          {/* Countdown Overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <span className="text-9xl font-black text-white animate-ping">
                {countdown}
              </span>
            </div>
          )}

          {/* Minimal Floating Controls */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/50 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {!showSettings && (
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-300"
                title="Open Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
            
            <div className="w-px h-6 bg-slate-700 mx-2" />

            {status !== 'recording' ? (
              <button 
                onClick={startRecording}
                disabled={status !== 'idle'}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 text-white font-semibold rounded-full transition-all active:scale-95 shadow-lg shadow-red-900/20"
              >
                <Play className="w-4 h-4 fill-current" />
                REC
              </button>
            ) : (
              <button 
                onClick={stopRecording}
                className="flex items-center gap-2 px-6 py-2 bg-slate-100 hover:bg-white text-slate-950 font-semibold rounded-full transition-all active:scale-95 shadow-lg"
              >
                <Square className="w-4 h-4 fill-current" />
                STOP
              </button>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-4 flex gap-6 text-slate-500 text-sm">
          <span className="flex items-center gap-1.5"><Monitor className="w-4 h-4" /> 1080p Studio</span>
          <span className="flex items-center gap-1.5"><Type className="w-4 h-4" /> Smooth Scroll v2.0</span>
        </div>
      </main>
    </div>
  );
};

export default App;
