import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RecordingStatus, PrompterConfig } from './types';
import { AlertCircle, Download, CheckCircle2, Share2, Play, RotateCcw } from 'lucide-react';

interface VideoRecorderProps {
  status: RecordingStatus;
  config: PrompterConfig;
  onFinished: () => void;
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({ status, config, onFinished }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [fileSizeText, setFileSizeText] = useState<string>('');

  // 1. Detectar o melhor formato (priorizando MP4 para a Galeria aceitar)
  const getBestMimeType = (): { mimeType: string; extension: string } => {
    const types = [
      { mimeType: 'video/mp4;codecs=avc1,mp4a.40.2', extension: 'mp4' },
      { mimeType: 'video/mp4', extension: 'mp4' },
      { mimeType: 'video/webm;codecs=h264', extension: 'mp4' }, // H264 empacotado
      { mimeType: 'video/webm;codecs=vp8,opus', extension: 'webm' },
      { mimeType: 'video/webm', extension: 'webm' }
    ];

    for (const t of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t.mimeType)) {
        return t;
      }
    }
    return { mimeType: '', extension: 'mp4' };
  };

  // 2. Iniciar Câmera
  const startCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Câmera bloqueada. Verifique as permissões do seu navegador.");
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
        };
      }
      setError(null);
    } catch (err) {
      console.error("Erro câmera:", err);
      setError("Permissão negada. Toque no cadeado ao lado do link e permita a Câmera e Microfone.");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [startCamera]);

  // 3. Controle de Gravação sem perda de dados
  useEffect(() => {
    if (status === 'recording' && stream) {
      chunksRef.current = [];
      setVideoBlob(null);
      setVideoUrl(null);

      const { mimeType } = getBestMimeType();
      const options = mimeType ? { mimeType } : undefined;
      
      try {
        const recorder = new MediaRecorder(stream, options);

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          const { extension } = getBestMimeType();
          const finalMime = extension === 'mp4' ? 'video/mp4' : 'video/webm';
          
          // Junta todos os pedaços num arquivo único
          const blob = new Blob(chunksRef.current, { type: finalMime });
          
          if (blob.size > 1000) { // Se tiver mais de 1KB de dados
            const sizeInMB = (blob.size / (1024 * 1024)).toFixed(2);
            setFileSizeText(`${sizeInMB} MB`);
            setVideoBlob(blob);
            setVideoUrl(URL.createObjectURL(blob));
            onFinished();
          } else {
            alert("A gravação foi muito curta ou vazia. Tente gravar por pelo menos 3 segundos.");
            onFinished();
          }
        };

        // Salva dados a cada 200ms para NUNCA perder o final do vídeo
        recorder.start(200);
        mediaRecorderRef.current = recorder;
      } catch (err) {
        console.error("Erro ao criar MediaRecorder:", err);
      }

    } else if (status === 'stopping' && mediaRecorderRef.current) {
      const rec = mediaRecorderRef.current;
      if (rec.state === 'recording') {
        rec.requestData(); // FORÇA salvar todos os bytes que faltam
        rec.stop();
      }
      mediaRecorderRef.current = null;
    }
  }, [status, stream, onFinished]);

  // 4. Salvar na Galeria
  const handleSaveToGallery = async () => {
    if (!videoBlob || !videoUrl) return;

    const { extension } = getBestMimeType();
    const fileName = `video_${Date.now()}.${extension}`;
    const file = new File([videoBlob], fileName, { type: videoBlob.type });

    // Tenta abrir o menu nativo do celular (onde tem "Salvar Vídeo" / "Google Fotos")
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Gravação Teleprompter',
          text: 'Meu vídeo gravado com o Teleprompter'
        });
        return;
      } catch (e) {
        console.log("Compartilhamento manual.");
      }
    }

    // Se o celular não abrir o menu de fotos, baixa diretamente
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
      {error ? (
        <div className="text-center p-6 bg-slate-900 border border-slate-800 rounded-2xl max-w-xs m-4 z-30 shadow-xl">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-2">Acesso à Câmera</h3>
          <p className="text-slate-300 text-xs mb-4">{error}</p>
          <button 
            onClick={startCamera}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
          >
            Tentar Conectar
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

      {/* JANELA DE PRÉVIA (Mostra o vídeo gravado pronto tocando na tela!) */}
      {videoUrl && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl max-w-xs w-full flex flex-col items-center shadow-2xl">
            
            <div className="flex items-center gap-2 mb-2 text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-bold text-white">Vídeo Gravado com Sucesso!</span>
            </div>

            <p className="text-[11px] text-slate-400 mb-3">
              Tamanho do arquivo: <span className="text-blue-400 font-bold">{fileSizeText}</span>
            </p>

            {/* PLAYER DE VÍDEO PARA VOCÊ ASSISTIR ANTES DE SALVAR */}
            <div className="w-full aspect-[9/12] max-h-56 bg-black rounded-xl overflow-hidden border border-slate-800 mb-4">
              <video 
                src={videoUrl} 
                controls 
                autoPlay 
                playsInline 
                className="w-full h-full object-contain"
              />
            </div>

            <div className="w-full space-y-2">
              <button 
                onClick={handleSaveToGallery}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-lg shadow-blue-900/40 transition-all"
              >
                <Share2 className="w-4 h-4" />
                Salvar na Galeria / Compartilhar
              </button>

              <button 
                onClick={() => setVideoUrl(null)}
                className="w-full flex items-center justify-center gap-1 py-2 text-slate-400 hover:text-white text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Gravar Novamente
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default VideoRecorder;
