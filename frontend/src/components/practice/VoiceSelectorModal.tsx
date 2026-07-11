import React, { useState, useEffect } from "react";
import { X, Play, Volume2, CheckCircle2 } from "lucide-react";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { voiceOptions } from "../../lib/voiceOptions";
import { setVoiceForLanguage } from "../../lib/ttsVoiceStorage";
import { Modal } from "../shared/Modal";

const LANG_CODE_TO_VOICE_LANGUAGE: Record<string, string> = {
  en: "English",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  th: "ภาษาไทย",
  vi: "Tiếng Việt",
};

interface VoiceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVoiceId: string;
  onSelectVoice: (voiceId: string) => void;
  language?: string;
}

export function VoiceSelectorModal({ isOpen, onClose, currentVoiceId, onSelectVoice, language }: VoiceSelectorModalProps) {
  const { playAudio, stopAudio, isLoading, isPlaying } = useTTSAudio();
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopAudio();
      setPlayingId(null);
    }
  }, [isOpen]);

  const filteredVoices = language && LANG_CODE_TO_VOICE_LANGUAGE[language]
    ? voiceOptions.filter((v) => v.language === LANG_CODE_TO_VOICE_LANGUAGE[language])
    : voiceOptions;

  if (!isOpen) return null;

  const handlePlaySample = async (voiceId: string, sampleText: string) => {
    if (isPlaying && playingId === voiceId) {
      stopAudio();
      setPlayingId(null);
      return;
    }
    setPlayingId(voiceId);
    await playAudio(sampleText, voiceId);
    if (!isPlaying) {
      // If it failed or finished quickly
      // Note: isPlaying might not update synchronously, but onended handles its own state
      // setPlayingId(null) will be handled if we wanted, but tying UI to isPlaying is better
    }
  };

  const handleSelect = (voiceId: string) => {
    onSelectVoice(voiceId);
    setVoiceForLanguage(language, voiceId);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chọn giọng nói" desc="Cá nhân hóa trải nghiệm học tập của bạn">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-4 md:grid-cols-2">
            {filteredVoices.map((voice) => (
              <div
                key={voice.id}
                className={`flex flex-col p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  currentVoiceId === voice.id ? "border-blue-600 bg-blue-50/50" : "border-gray-100 hover:border-blue-300 hover:bg-gray-50"
                }`}
                onClick={() => handleSelect(voice.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">{voice.avatar}</div>
                    <div>
                      <h3 className="font-bold text-gray-900">{voice.name}</h3>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">
                        {voice.language} - {voice.country}
                      </p>
                    </div>
                  </div>
                  {currentVoiceId === voice.id && <CheckCircle2 className="w-6 h-6 text-blue-600" />}
                </div>

                <p className="text-sm text-gray-600 mb-4 flex-1">{voice.description}</p>

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex gap-2">
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg font-medium">{voice.gender === "female" ? "Nữ" : "Nam"}</span>
                    {voice.premium && <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-lg font-medium">Premium</span>}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlaySample(voice.id, voice.sample);
                    }}
                    disabled={isLoading && playingId === voice.id}
                    className={`p-2 rounded-xl transition-all ${
                      playingId === voice.id && isPlaying ? "bg-blue-600 text-white shadow-md shadow-blue-500/30" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                    }`}
                  >
                    {isLoading && playingId === voice.id ? (
                      <div className="w-5 h-5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
                    ) : playingId === voice.id && isPlaying ? (
                      <Volume2 className="w-5 h-5 animate-pulse" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
