const STORAGE_KEY = "tts_voice";

const DEFAULT_VOICES: Record<string, string> = {
  en: "en-GB-SoniaNeural",
  zh: "zh-CN-XiaoxiaoNeural",
  ja: "ja-JP-NanamiNeural",
  ko: "ko-KR-SunHiNeural",
  fr: "fr-FR-DeniseNeural",
  de: "de-DE-KatjaNeural",
  es: "es-ES-ElviraNeural",
  th: "th-TH-PremwadeeNeural",
  vi: "vi-VN-HoaiMyNeural",
};

const FALLBACK_VOICE = "en-GB-SoniaNeural";

function getVoiceMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    // Migrate from old flat string format
    if (!raw.startsWith("{")) {
      const migrated: Record<string, string> = { en: raw };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function getVoiceForLanguage(language?: string): string {
  const map = getVoiceMap();
  if (language && map[language]) return map[language];
  if (language && DEFAULT_VOICES[language]) return DEFAULT_VOICES[language];
  return map["en"] || FALLBACK_VOICE;
}

export function setVoiceForLanguage(language: string | undefined, voiceId: string): void {
  const map = getVoiceMap();
  const key = language || "en";
  map[key] = voiceId;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}
