import React, { useState, useEffect } from 'react';
import { X, Play, Volume2, CheckCircle2 } from 'lucide-react';
import { voiceOptions } from '../../lib/voiceOptions';
import { useTTSAudio } from '../../hooks/useTTSAudio';

interface VoiceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVoiceId: string;
  onSelectVoice: (voiceId: string) => void;
}

export function VoiceSelectorModal({ isOpen, onClose, currentVoiceId, onSelectVoice }: VoiceSelectorModalProps) {
  const { playAudio, stopAudio, isLoading, isPlaying } = useTTSAudio();
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopAudio();
      setPlayingId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePlaySample = async (voiceId: string, sampleText: string) => {
    if (isPlaying && playingId === voiceId) {
      stopAudio();
      setPlayingId(null);
      return;
    }
    setPlayingId(voiceId);
    await playAudio(sampleText, voiceId);
    if (!isPlaying) { // If it failed or finished quickly
      // Note: isPlaying might not update synchronously, but onended handles its own state
      // setPlayingId(null) will be handled if we wanted, but tying UI to isPlaying is better
    }
  };

  const handleSelect = (voiceId: string) => {
    onSelectVoice(voiceId);
    localStorage.setItem('tts_voice', voiceId);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Chọn giọng nói</h2>
            <p className="text-gray-500 mt-1">Cá nhân hóa trải nghiệm học tập của bạn</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-4 md:grid-cols-2">
            {voiceOptions.map((voice) => (
              <div
                key={voice.id}
                className={`flex flex-col p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  currentVoiceId === voice.id
                    ? 'border-blue-600 bg-blue-50/50'
                    : 'border-gray-100 hover:border-blue-300 hover:bg-gray-50'
                }`}
                onClick={() => handleSelect(voice.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                      {voice.avatar}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{voice.name}</h3>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">{voice.language} - {voice.country}</p>
                    </div>
                  </div>
                  {currentVoiceId === voice.id && (
                    <CheckCircle2 className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mb-4 flex-1">{voice.description}</p>
                
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex gap-2">
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg font-medium">
                      {voice.gender === 'female' ? 'Nữ' : 'Nam'}
                    </span>
                    {voice.premium && (
                      <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-lg font-medium">
                        Premium
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlaySample(voice.id, voice.sample);
                    }}
                    disabled={isLoading && playingId === voice.id}
                    className={`p-2 rounded-xl transition-all ${
                      playingId === voice.id && isPlaying
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
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
    </div>
  );
}
