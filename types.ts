
export interface PrompterConfig {
  script: string;
  speed: number;
  fontSize: number;
  mirror: boolean;
  opacity: number;
  fileName: string;
}

export type RecordingStatus = 'idle' | 'starting' | 'recording' | 'stopping' | 'processing';
