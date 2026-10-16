import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RecordingStatus, PrompterConfig } from './types';
import { AlertCircle } from 'lucide-react';

interface VideoRecorderProps {
  status: RecordingStatus;
  config: PrompterConfig;
  onFinishedVideo: (blob: Blob, url: string) => void;
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({ status, config, onFinishedVideo }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordStream, setRecordStream] = useState<MediaStream | null>(null);

  // Iniciar Câmera e Pré-amplificador de Som
  const startCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Câmera bloqueada. Permita o acesso nas configurações.");
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

      // Amplificador de volume de som (+250%)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(rawStream);
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 2.5;

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

  // Gravação
  useEffect(() => {
    const activeStream = recordStream || stream;

    if (status === 'recording' && activeStream) {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }

      chunksRef.current = [];

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
            onFinishedVideo(blob, url);
          } else {
            alert("A gravação foi muito curta. Grave por mais de 3 segundos.");
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
  }, [status, recordStream, stream, onFinishedVideo]);

  return (
    <div className="relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
      {error ? (
        <div className="text-center p-6 bg-slate-900 border border-slate-800 rounded-2xl max-w-xs m-4 z-30">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-2">Permissão da Câmera</h3>
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
    </div>
  );
};

export default VideoRecorder;
