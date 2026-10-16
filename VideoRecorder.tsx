import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RecordingStatus, PrompterConfig } from './types';
import { AlertCircle, CheckCircle2, RotateCcw, Share2 } from 'lucide-react';

interface VideoRecorderProps {
  status: RecordingStatus;
  config: PrompterConfig;
  onFinished: () => void;
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({ status, config, onFinished }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordStream, setRecordStream] = useState<MediaStream | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Iniciar Câmera com Áudio Amplificado (+250% volume)
  const startCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Câmera indisponível. Permita o acesso.");
        return;
      }

      const rawStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true
        }
      });

      setStream(rawStream);

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(rawStream);
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 2.5; // Amplificação para o som ficar alto

      const destination = audioCtx.createMediaStreamDestination();
      source.connect(gainNode);

      const boostedStream = new MediaStream([
        ...rawStream.getVideoTracks(),
        ...destination.stream.getAudioTracks()
      ]);

      setRecordStream(boostedStream);

      if (videoRef.current) {
        videoRef.current.srcObject = rawStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
        };
      }
      setError(null);
    } catch (err) {
      console.error("Erro câmera:", err);
      setError("Permita o acesso à Câmera e Microfone.");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
      audioContextRef.current?.close().catch(() => {});
    };
  }, [startCamera]);

  // Salvar na Galeria
  const autoSalvar = useCallback(async (blob: Blob, url: string) => {
    const nomeArquivo = `video_${Date.now()}.mp4`;
    const file = new File([blob], nomeArquivo, { type: 'video/mp4' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Gravação Teleprompter'
        });
        return;
      } catch (err) {
        console.log("Menu de compartilhamento fechado.");
      }
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  // Gravação
  useEffect(() => {
    const activeStream = recordStream || stream;

    if (status === 'recording' && activeStream) {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }

      chunksRef.current = [];
      setVideoBlob(null);
      setVideoUrl(null);

      let options: MediaRecorderOptions = {
        audioBitsPerSecond: 128000,
        videoBitsPerSecond: 3000000
      };

      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')) {
        options.mimeType = 'video/mp4;codecs=avc1,mp4a.40.2';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        options.mimeType = 'video/mp4';
      }

      try {
        const recorder = new MediaRecorder(activeStream, options);

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/mp4' });

          if (blob.size > 1000) {
            const url = URL.createObjectURL(blob);
            setVideoBlob(blob);
            setVideoUrl(url);
            onFinished();
            autoSalvar(blob, url);
          } else {
            alert("Gravação muito curta. Grave por pelo menos 3 segundos.");
            onFinished();
          }
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
      } catch (err) {
        console.error("Erro recorder:", err);
      }

    } else if (status === 'stopping' && mediaRecorderRef.current) {
      const rec = mediaRecorderRef.current;
      if (rec.state === 'recording') {
        rec.stop();
      }
      mediaRecorderRef.current = null;
    }
  }, [status, recordStream, stream, onFinished, autoSalvar]);

  return (
    <div className="relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
      {error ? (
        <div className="text-center p-6 bg-slate-900 border border-slate-800 rounded-2xl max-w-xs m-4 z-30">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-2">Permissão Necessária</h3>
          <p className="text-slate-300 text-xs mb-4">{error}</p>
          <button 
            onClick={startCamera}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
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

      {/* JANELA DE SALVAMENTO EM TELA INTEIRA (Fica por cima de TUDO, sem nada tapando os botões) */}
      {videoUrl && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95 backdrop-blur-lg p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-sm w-full flex flex-col items-center shadow-2xl">
            
            <div className="flex items-center gap-2 mb-2 text-green-400">
              <CheckCircle2 className="w-6 h-6" />
              <h2 className="text-base font-bold text-white">Vídeo Gravado!</h2>
            </div>

            <p className="text-xs text-slate-400 mb-4 text-center">
              Assista abaixo antes de enviar para as redes:
            </p>

            {/* PLAYER DE VÍDEO */}
            <div className="w-full aspect-[9/12] max-h-64 bg-black rounded-2xl overflow-hidden border border-slate-800 mb-5 shadow-inner">
              <video 
                src={videoUrl} 
                controls 
                autoPlay 
                playsInline 
                className="w-full h-full object-contain"
              />
            </div>

            {/* BOTÕES GRANDES E LIMPOS */}
            <div className="w-full space-y-3">
              <button 
                onClick={() => videoBlob && autoSalvar(videoBlob, videoUrl)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-3.5 px-4 rounded-2xl text-sm shadow-lg shadow-blue-900/40 transition-all"
              >
                <Share2 className="w-5 h-5" />
                Salvar na Galeria
              </button>

              <button 
                onClick={() => setVideoUrl(null)}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-semibold py-3 px-4 rounded-2xl text-xs transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Gravar Outro Vídeo
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default VideoRecorder;
