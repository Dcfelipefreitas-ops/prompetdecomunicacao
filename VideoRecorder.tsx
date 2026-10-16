import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RecordingStatus, PrompterConfig } from './types';
import { AlertCircle, Download, CheckCircle2, Share2 } from 'lucide-react';

interface VideoRecorderProps {
  status: RecordingStatus;
  config: PrompterConfig;
  onFinished: () => void;
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({ status, config, onFinished }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]); // Evita que o vídeo fique vazio
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [mimeTypeUsado, setMimeTypeUsado] = useState<string>('video/mp4');

  // Descobre o formato correto do celular (MP4 para iPhone/Android)
  const getSupportedMimeType = (): string => {
    const tipos = [
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];
    for (const tipo of tipos) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(tipo)) {
        return tipo;
      }
    }
    return '';
  };

  // Iniciar Câmera
  const startCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Câmera indisponível. Verifique as permissões do navegador.");
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
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
      setError("Permissão da câmera negada. Permita o acesso nas configurações do celular.");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [startCamera]);

  // Gravação Robusta (espera todos os dados serem processados)
  useEffect(() => {
    if (status === 'recording' && stream) {
      chunksRef.current = [];
      setVideoBlob(null);
      setVideoUrl(null);

      const mimeType = getSupportedMimeType();
      setMimeTypeUsado(mimeType);

      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(stream, options);

      // Guarda os pedaços de vídeo continuamente
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      // Só cria o arquivo final quando o gravador parar TOTALMENTE
      recorder.onstop = () => {
        const finalType = mimeType.includes('mp4') ? 'video/mp4' : 'video/webm';
        const blob = new Blob(chunksRef.current, { type: finalType });
        
        if (blob.size > 0) {
          setVideoBlob(blob);
          setVideoUrl(URL.createObjectURL(blob));
          onFinished();
        } else {
          alert("Ocorreu um erro: o vídeo gravado estava sem dados. Tente novamente.");
        }
      };

      recorder.start(500); // Coleta dados a cada meio segundo
      mediaRecorderRef.current = recorder;

    } else if (status === 'stopping' && mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    }
  }, [status, stream, onFinished]);

  // Função para Salvar Direto na Galeria / Fotos
  const handleSaveToGallery = async () => {
    if (!videoBlob) return;

    const extensao = mimeTypeUsado.includes('mp4') ? 'mp4' : 'webm';
    const nomeArquivo = `${config.fileName || 'meu_video'}_${Date.now()}.${extensao}`;
    const file = new File([videoBlob], nomeArquivo, { type: videoBlob.type });

    // Se o celular suportar compartilhamento nativo (iPhone e Android modernos)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Meu Vídeo Gravado',
          text: 'Vídeo gravado pelo Teleprompter'
        });
        return; // No iPhone, o usuário clica em "Salvar Vídeo" e vai direto pra Galeria!
      } catch (err) {
        console.log("Compartilhamento cancelado:", err);
      }
    }

    // Caso o navegador não tenha o botão nativo, faz o download padrão
    if (videoUrl) {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = nomeArquivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
      {error ? (
        <div className="text-center p-6 bg-slate-900 border border-slate-800 rounded-2xl max-w-xs m-4 z-30 shadow-xl">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-2">Acesso à Câmera</h3>
          <p className="text-slate-300 text-xs mb-4 leading-relaxed">{error}</p>
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

      {/* Janela de Conclusão com opção de salvar na Galeria */}
      {videoUrl && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-xs w-full text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-14 h-14 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 className="text-lg font-bold text-white mb-1">Gravação Pronta!</h2>
            <p className="text-slate-400 text-xs mb-5">Salve o vídeo diretamente na galeria do seu celular.</p>

            <div className="space-y-2.5">
              <button 
                onClick={handleSaveToGallery}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-3 px-4 rounded-xl text-sm shadow-lg shadow-blue-900/30 transition-all"
              >
                <Share2 className="w-4 h-4" />
                Salvar na Galeria
              </button>

              <button 
                onClick={() => setVideoUrl(null)}
                className="w-full py-2.5 text-slate-400 hover:text-white text-xs font-medium"
              >
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
