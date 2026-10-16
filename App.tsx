import React, { useState, useCallback, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { Settings, Play, Square, Video } from 'lucide-react';
import { PrompterConfig, RecordingStatus } from './types';
// Importações corrigidas (sem a pasta components/):
import VideoRecorder from './VideoRecorder';
import Teleprompter from './Teleprompter';
import ControlPanel from './ControlPanel';

// Capturador de Erros
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.toString() };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Erro capturado:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, backgroundColor: '#7f1d1d', color: '#fff', height: '100vh', zIndex: 9999 }}>
          <h2 style={{ fontSize: 20, fontWeight: 'bold' }}>⚠️ O aplicativo travou:</h2>
          <p style={{ marginTop: 10, fontSize: 14 }}>{this.state.error}</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: 20, padding: '10px 20px', background: '#fff', color: '#000', borderRadius: 8 }}
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const [config, setConfig] = useState<PrompterConfig>({
    script: "Bem-vindo ao Teleprompter!\n\nSe você está lendo isso na tela do seu celular, o aplicativo funcionou com sucesso.\n\nToque em GRAVAR para começar.",
    speed: 2,
    fontSize: 28,
    mirror: false,
    opacity: 0.8,
    fileName: 'meu-video'
  });

  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [showSettings, setShowSettings] = useState(false);
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
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-950 overflow-hidden text-white">
      
      {/* Menu Lateral de Configurações */}
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

      {/* Área Central */}
      <main className="relative flex-1 flex flex-col items-center justify-between p-2 md:p-6 h-full">
        
        {/* Barra Superior */}
        <div className="w-full flex items-center justify-between px-2 py-2 z-40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <Video className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-sm md:text-base font-bold text-white">ProPrompter</h1>
          </div>

          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-slate-800 border border-slate-700 rounded-full text-slate-200"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Câmera + Teleprompter */}
        <div className="relative w-full flex-1 rounded-2xl overflow-hidden border border-slate-800 bg-black flex items-center justify-center my-2">
          
          <VideoRecorder 
            status={status} 
            config={config} 
            onFinished={handleRecordingFinished}
          />
          
          <Teleprompter 
            config={config} 
            isScrolling={status === 'recording'} 
          />

          {countdown !== null && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <span className="text-8xl font-black text-white animate-pulse">
                {countdown}
              </span>
            </div>
          )}
        </div>

        {/* Botão de Gravação */}
        <div className="w-full py-2 flex items-center justify-center z-40">
          {status !== 'recording' ? (
            <button 
              onClick={startRecording}
              disabled={status !== 'idle'}
              className="flex items-center gap-2 px-8 py-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 text-white font-bold rounded-full text-base transition-transform active:scale-95 shadow-lg shadow-red-900/40"
            >
              <Play className="w-5 h-5 fill-current" />
              GRAVAR
            </button>
          ) : (
            <button 
              onClick={stopRecording}
              className="flex items-center gap-2 px-8 py-3 bg-white text-slate-950 font-bold rounded-full text-base transition-transform active:scale-95 shadow-lg"
            >
              <Square className="w-5 h-5 fill-current" />
              PARAR
            </button>
          )}
        </div>

      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

export default App;
