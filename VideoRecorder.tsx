
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

  // Initialize Camera
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1920, height: 1080 },
        audio: true
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      console.error("Camera error:", err);
      setError("Camera or Microphone access denied. Please enable permissions.");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [startCamera]);

  // Handle Recording States
  useEffect(() => {
    if (status === 'recording' && stream) {
      setChunks([]);
      setVideoUrl(null);
      
      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'video/webm';
        }
      }

      const recorder = new MediaRecorder(stream, options);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setChunks(prev => [...prev, e.data]);
        }
      };

      recorder.onstop = () => {
        // We'll handle the final processing when chunks are ready
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
    } else if (status === 'stopping' && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, [status, stream]);

  // Handle post-recording processing
  useEffect(() => {
    if (status === 'stopping' && chunks.length > 0) {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      onFinished();
    }
  }, [chunks, status, onFinished]);

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `${config.fileName || 'teleprompter'}.webm`;
    a.click();
    setVideoUrl(null);
  };

  return (
    <div className="relative w-full h-full bg-slate-900 flex items-center justify-center">
      {error ? (
        <div className="text-center p-8 bg-slate-800 rounded-2xl border border-red-900/50 max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Access Denied</h3>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <button 
            onClick={startCamera}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-full text-sm font-semibold transition-colors"
          >
            Retry Permission
          </button>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover transition-transform duration-500 ${config.mirror ? 'scale-x-[-1]' : ''}`}
        />
      )}

      {/* Finished Modal */}
      {videoUrl && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Recording Finished!</h2>
            <p className="text-slate-400 mb-8">Your video is ready to be downloaded.</p>
            
            <div className="space-y-3">
              <button 
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-900/20"
              >
                <Download className="w-5 h-5" />
                Download Recording
              </button>
              <button 
                onClick={() => setVideoUrl(null)}
                className="w-full py-3 px-6 text-slate-400 hover:text-white transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoRecorder;
