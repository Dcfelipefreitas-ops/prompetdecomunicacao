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
  
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Iniciar Câmera com ÁUDIO LIMPO (sem filtros que distorcem para o TikTok)
  const startCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Câmera bloqueada. Verifique as permissões.");
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: {
          echoCancellation: false,   // Desativa cancelamento que corta a voz
          noiseSuppression: false,   // Desativa redução agressiva (tira o som de 'robô')
          autoGainControl: true,     // Mantém o volume da voz estável
          channelCount: 1,           // Canal único estável
          sampleRate: 44100          // Taxa de amostragem padrão de estúdio
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
      setError("Permita o acesso à Câmera e Microfone no navegador.");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [startCamera]);

  // Função para salvar direto na galeria/compartilhar
  const autoSalvar = useCallback(async (blob: Blob, url: string) => {
    const nomeArquivo = `prompter_${Date.now()}.mp4`;
    const file = new File([blob], nomeArquivo, { type: 'video/mp4' });

    // Tenta abrir direto a janela nativa do celular (onde tem "Salvar Vídeo" para ir pra Galeria)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Gravação Teleprompter'
        });
        return;
      } catch (err) {
        console.log("Compartilhamento fechado.");
      }
    }

    // Se não abrir a janela nativa, faz o download imediato
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  // Gravação
  useEffect(() => {
    if (status === 'recording' && stream) {
      chunksRef.current = [];
      setVideoBlob(null);
      setVideoUrl(null);

      // Configuração para áudio limpo e vídeo compatível com TikTok
      let options: MediaRecorderOptions = {
        audioBitsPerSecond: 128000,   // Áudio cristalino de 128 kbps
        videoBitsPerSecond: 2500000   // 2.5 Mbps para imagem nítida
      };

      if (MediaRecorder.isTypeSupported('video/mp4')) {
        options.mimeType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
        options.mimeType = 'video/webm;codecs=h264';
      }

      try {
        const recorder = new MediaRecorder(stream, options);

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

            // DISPARA O SALVAMENTO AUTOMATICAMENTE
            autoSalvar(blob, url);
          } else {
            alert("A gravação foi muito curta. Grave por pelo menos 3 segundos.");
            onFinished();
          }
        };

        recorder.start(250);
        mediaRecorderRef.current = recorder;
      } catch (err) {
        console.error("Erro recorder:", err);
      }

    } else if (status === 'stopping' && mediaRecorderRef.current) {
      const rec = mediaRecorderRef.current;
      if (rec.state === 'recording') {
        rec.requestData();
        rec.stop();
      }
      mediaRecorderRef.current = null;
    }
  }, [status, stream, onFinished, autoSalvar]);

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

      {/* Janela que confirma a gravação e permite reenviar caso queira */}
      {videoUrl && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl max-w-xs w-full flex flex-col items-center shadow-2xl">
            <div className="flex items-center gap-2 mb-2 text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-bold text-white">Vídeo Finalizado!</span>
            </div>

            <p className="text-[11px] text-slate-400 mb-3 text-center">
              O áudio foi tratado para redes sociais (TikTok / Instagram).
            </p>

            <div className="w-full aspect-[9/12] max-h-52 bg-black rounded-xl overflow-hidden border border-slate-800 mb-3">
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
                onClick={() => videoBlob && autoSalvar(videoBlob, videoUrl)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs"
              >
                <Share2 className="w-4 h-4" />
                Salvar na Galeria Novamente
              </button>

              <button 
                onClick={() => setVideoUrl(null)}
                className="w-full flex items-center justify-center gap-1 py-2 text-slate-400 hover:text-white text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
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
