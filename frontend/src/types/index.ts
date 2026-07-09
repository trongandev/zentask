// Video types
export interface VideoInfo {
    name: string;
    duration: string;
    resolution: string;
    fps: string;
    codec: string;
    size: string;
    durationSeconds?: number;
    width?: number;
    height?: number;
}

export interface VideoFileData {
    file: File;
    blobURL: string;
    info: VideoInfo;
}

// Subtitle types
export interface SubtitleBlock {
    index: number;
    timestamp: string;
    text: string;
    start?: number;
    end?: number;
}

export interface SubtitleData {
    content: string;
    blocks: SubtitleBlock[];
    count: number;
    wordCount: number;
    lineCount: number;
    language?: string;
    sourceLanguage?: string;
}

// Whisper types
export interface WhisperChunk {
    text: string;
    timestamp: [number, number | null];
    language?: string;
}

export interface WhisperResult {
    text: string;
    chunks: WhisperChunk[];
    language: string;
    languageCode: string | null;
    languageName: string;
    whisperLanguage: string | null;
    autoDetected: boolean;
}

export interface WhisperOptions {
    language?: string | null;
    task?: 'transcribe' | 'translate';
    chunkLengthS?: number;
    strideLengthS?: number;
    autoDetect?: boolean;
    languageProbeS?: number;
}

// FFmpeg types
export interface BurnOptions {
    fontSize?: number;
    fontColor?: string;
    marginV?: number;
    maxRenderWidth?: number;
    maxRenderHeight?: number;
    fallbackCaptureFPS?: number;
    maxCaptureFPS?: number;
    stallTimeoutMs?: number;
    pauseWhenHidden?: boolean;
    preferMp4?: boolean;
}

export interface BurnResult {
    blob: Blob;
    mimeType: string;
}

// Translation types
export interface TranslationOptions {
    batchSize?: number;
    delay?: number;
    maxRetries?: number;
    retryDelay?: number;
}

// UI State types
export interface ProcessingState {
    isActive: boolean;
    title: string;
    desc: string;
}

export interface SubtitleState {
    // Video
    videoFile: File | null;
    videoBlob: string | null;
    videoInfo: VideoInfo;

    // Models
    ffmpegLoaded: boolean;
    whisperLoaded: boolean;
    whisperModel: string;

    // Audio
    audioData: Uint8Array | null;

    // Subtitle
    subtitleContent: string;
    detectedLanguage: string | null;
    sourceLanguage: string | null;

    // Output
    outputBlob: Blob | null;
    outputMime: string | null;

    // UI
    isProcessing: boolean;
    processingTitle: string;
    processingDesc: string;
    progress: number;
    status: string;
    currentStep: string;
    consoleLogs: string[];

    // Stats
    subtitleCount: number;
    wordCount: number;
    lineCount: number;
}

// Context types
export type SubtitleAction =
    | { type: 'SET_VIDEO'; payload: { file: File; blob: string; info: Partial<VideoInfo> } }
    | { type: 'SET_VIDEO_INFO'; payload: Partial<VideoInfo> }
    | { type: 'SET_FFMPEG_LOADED'; payload: boolean }
    | { type: 'SET_WHISPER_LOADED'; payload: { loaded: boolean; model?: string } }
    | { type: 'SET_AUDIO'; payload: Uint8Array }
    | { type: 'SET_SUBTITLE'; payload: { content: string; language?: string; sourceLanguage?: string; count?: number; words?: number; lines?: number } }
    | { type: 'SET_DETECTED_LANGUAGE'; payload: string }
    | { type: 'SET_OUTPUT'; payload: { blob: Blob; mime: string } }
    | { type: 'SET_PROCESSING'; payload: { active: boolean; title?: string; desc?: string } }
    | { type: 'SET_PROGRESS'; payload: number }
    | { type: 'SET_STATUS'; payload: string }
    | { type: 'SET_CURRENT_STEP'; payload: string }
    | { type: 'ADD_CONSOLE_LOG'; payload: string }
    | { type: 'CLEAR_CONSOLE' }
    | { type: 'CLEAR_SUBTITLE' }
    | { type: 'RESET' };

export interface SubtitleContextValue {
    state: SubtitleState;
    dispatch: React.Dispatch<SubtitleAction>;
}

// Service callbacks
export interface ServiceCallbacks {
    onLog: (msg: string) => void;
    onProgress: (ratio: number) => void;
    onStatus: (msg: string) => void;
    onChunkDone?: (text: string, ratio: number) => void;
}

// Model types
export interface WhisperModel {
    id: string;
    size: string;
    note: string;
}

export interface WhisperLanguageInfo {
    code: string | null;
    whisper: string | null;
    label: string;
}

export interface LanguageInfo {
    whisper: string;
    label: string;
}

// Translation
export interface TranslationSupportResult {
    supported: boolean;
    via: string;
    message: string;
}