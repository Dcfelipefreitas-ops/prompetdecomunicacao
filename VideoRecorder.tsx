import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RecordingStatus, PrompterConfig } from '../types';
import { AlertCircle, Download, CheckCircle2 } from 'lucide-react';

interface VideoRecorderProps {
  status: RecordingStatus;
  config: PrompterConfig;
  onFinished: () => void;
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({ status, config, onFinished }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [chunks, setChunks] = useState<Blob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [mimeTypeUsado, setMimeTypeUsado] = useState<string>('video/webm');

  // Função para descobrir qual formato o celular aceita (mp4 para iPhone, webm para Android/PC)
  const getSupportedMimeType = (): string => {
    const tipos = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=avc1',
      'video/mp4', // Essencial para iPhone (iOS Safari)
    ];

    for (const tipo of tipos) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(tipo)) {
        return tipo;
      }
    }
    return '';
  };

  // Inicializa a câmera com configurações compatíveis com celular
  const startCamera = useCallback(async () => {
    try {
      // Configuração flexível para não travar no celular
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'user', // Força a câmera frontal
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        },
        audio: true
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Garante que o celular inicie a reprodução do vídeo
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((e) => console.log("Aguardando interação:", e));
        };
      }
      setError(null);
    } catch (err: any) {
      console.error("Erro na câmera:", err);
      setError("Permissão da câmera/microfone negada ou não suportada. Verifique se o site usa HTTPS.");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [startCamera]);

  // Controle de Gravação
  useEffect(() => {
    if (status === 'recording' && stream) {
      setChunks([]);
      setVideoUrl(null);

      const mimeType = getSupportedMimeType();
      setMimeTypeUsado(mimeType);

      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(stream, options);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          setChunks((prev) => [...prev, e.data]);
        }
      };

      recorder.start(1000); // Salva pedaços a cada 1 segundo para maior estabilidade
      mediaRecorderRef.current = recorder;
    } else if (status === 'stopping' && mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }
  }, [status, stream]);

  // Processa o vídeo após o término da gravação
  useEffect(() => {
    if (status === 'stopping' && chunks.length > 0) {
      const type = mimeTypeUsado.includes('mp4') ? 'video/mp4' : 'video/webm';
      const blob = new Blob(chunks, { type });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      onFinished();
    }
  }, [chunks, status, onFinished, mimeTypeUsado]);

  // Baixar o vídeo
  const handleDownload = () => {
    if (!videoUrl) return;
    const extensao = mimeTypeUsado.includes('mp4') ? 'mp4' : 'webm';
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `${config.fileName || 'gravacao'}.${extensao}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setVideoUrl(null);
  };

  return (
    <div className="relative w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden">
      {error ? (
        <div className="text-center p-6 bg-slate-800 rounded-2xl border border-red-900/50 max-w-sm m-4 z-50">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-2">Sem acesso à câmera</h3>
          <p className="text-slate-400 text-xs mb-4">{error}</p>
          <button 
            onClick={startCamera}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-semibold"
          >
            Tentar Novamente
          </button>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          webkit-playsinline="true"
          className={`w-full h-full object-cover ${config.mirror ? 'scale-x-[-1]' : ''}`}
        />
      )}

      {/* Janela de Conclusão da Gravação */}
      {videoUrl && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center">
            <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Gravação Concluída!</h2>
            <p className="text-slate-400 text-xs mb-6">Seu vídeo está pronto para ser baixado.</p>
            
            <div className="space-y-2">
              <button 
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl text-sm shadow-lg shadow-blue-900/20"
              >
                <Download className="w-4 h-4" />
                Baixar Vídeo
              </button>
              <button 
                onClick={() => setVideoUrl(null)}
                className="w-full py-2 px-4 text-slate-400 hover:text-white text-xs"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoRecorder;
