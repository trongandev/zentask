export const LANGUAGE_OPTIONS = [
  {
    label: "Detect language",
    value: "auto",
    audioCharacter: "en-US-JennyNeural",
  },
  { label: "English", value: "en", audioCharacter: "en-US-JennyNeural" },
  { label: "Vietnamese", value: "vi", audioCharacter: "vi-VN-HoaiMyNeural" },
  { label: "Spanish", value: "es", audioCharacter: "es-ES-ElviraNeural" },
  { label: "French", value: "fr", audioCharacter: "fr-FR-DeniseNeural" },
  { label: "German", value: "de", audioCharacter: "de-DE-KatjaNeural" },
  { label: "Chinese", value: "zh", audioCharacter: "zh-CN-XiaoxiaoNeural" },
  { label: "Japanese", value: "ja", audioCharacter: "ja-JP-NanamiNeural" },
  { label: "Korean", value: "ko", audioCharacter: "ko-KR-SunHiNeural" },
  { label: "Thai", value: "th", audioCharacter: "th-TH-NichapaNeural" },
];

export const getAudioCharacterByLanguage = (langCode) => {
  const lang = LANGUAGE_OPTIONS.find((l) => l.value === langCode);
  return lang ? lang.audioCharacter : "en-US-JennyNeural";
};
