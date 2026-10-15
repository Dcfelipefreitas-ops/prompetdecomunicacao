import React, { useState, useCallback, useEffect } from 'react';
import { Settings, Play, Square, Video, Type, Monitor } from 'lucide-react';
import { PrompterConfig, RecordingStatus } from './types';
import VideoRecorder from './components/VideoRecorder';
import Teleprompter from './components/Teleprompter';
import ControlPanel from './components/ControlPanel';

const App: React.FC = () => {
  const [config, setConfig] = useState<PrompterConfig>({
    script: "Bem-vindo ao ProPrompter AI.\n\nEste é o seu estúdio de gravação. Ajuste a velocidade do texto e o tamanho da fonte. Quando estiver pronto, aperte REC para começar a gravar!",
    speed: 2,
    fontSize: 32, // Tamanho melhor para celular
    mirror: false,
    opacity: 0.8,
    fileName: 'meu-video'
  });

  const [status, setStatus] = useState<RecordingStatus>('idle');
  
  // No celular, o menu começa FECHADO para não tampar a câmera
  const [showSettings, setShowSettings] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Fecha o menu automaticamente se a tela for pequena (celular)
  useEffect(() => {
    if (window.innerWidth >= 768) {
      setShowSettings(true);
    }
  }, []);

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
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-950 overflow-hidden text-white">
      
      {/* Menu Lateral / Configurações (Drawer em celulares) */}
      <aside 
        className={`fixed md:relative inset-0 md:inset-auto h-full z-50 transition-all duration-300 ease-in-out border-r border-slate-800 bg-slate-950/95 md:bg-slate-900/50 backdrop-blur-xl ${
          showSettings ? 'w-full md:w-96 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 overflow-hidden'
        }`}
      >
        <ControlPanel 
          config={config} 
          setConfig={setConfig} 
          status={status}
          onClose={() => setShowSettings(false)}
        />
      </aside>

      {/* Área Principal (Câmera + Texto) */}
      <main className="relative flex-1 flex flex-col items-center justify-center p-2 md:p-4 h-full">
        
        {/* Título Superior */}
        <div className="absolute top-4 left-4 flex items-center gap-2 z-40">
          <div className="p-1.5 bg-blue-600 rounded-lg">
            <Video className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-base md:text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            ProPrompter
          </h1>
        </div>

        {/* Botão de abrir configurações no celular */}
        {!showSettings && (
          <button 
            onClick={() => setShowSettings(true)}
            className="absolute top-4 right-4 z-40 p-2 bg-slate-800/80 border border-slate-700 rounded-full text-slate-200"
            title="Abrir Configurações"
          >
            <Settings className="w-5 h-5" />
          </button>
        )}

        {/* Janela de Vídeo e Teleprompter */}
        <div className="relative w-full h-[85vh] md:h-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-black flex items-center justify-center">
          
          {/* Gravador de Vídeo (Câmera) */}
          <VideoRecorder 
            status={status} 
            config={config} 
            onFinished={handleRecordingFinished}
          />
          
          {/* Texto que Rola */}
          <Teleprompter 
            config={config} 
            isScrolling={status === 'recording'} 
          />

          {/* Contagem Regressiva (3, 2, 1) */}
          {countdown !== null && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <span className="text-8xl md:text-9xl font-black text-white animate-pulse">
                {countdown}
              </span>
            </div>
          )}

          {/* Botões de Ação Inferiores (REC / PARAR) */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 rounded-full bg-slate-900/90 border border-slate-700 shadow-xl z-40">
            {status !== 'recording' ? (
              <button 
                onClick={startRecording}
                disabled={status !== 'idle'}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 text-white font-bold rounded-full transition-transform active:scale-95 shadow-lg shadow-red-900/30"
              >
                <Play className="w-4 h-4 fill-current" />
                GRAVAR
              </button>
            ) : (
              <button 
                onClick={stopRecording}
                className="flex items-center gap-2 px-6 py-2 bg-white hover:bg-slate-200 text-slate-950 font-bold rounded-full transition-transform active:scale-95 shadow-lg"
              >
                <Square className="w-4 h-4 fill-current" />
                PARAR
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
