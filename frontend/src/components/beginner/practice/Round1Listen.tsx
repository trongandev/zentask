import React, { useEffect } from "react";
import { Volume2 } from "lucide-react";
import { useTTSAudio } from "../../../hooks/useTTSAudio";

interface Round1ListenProps {
  currentWord: any;
}

export function Round1Listen({ currentWord }: Round1ListenProps) {
  const { playAudio } = useTTSAudio();

  useEffect(() => {
    if (currentWord) {
      playAudio(currentWord?.examples?.[0]?.en || currentWord?.term);
    }
  }, [currentWord]);

  return (
    <div className="space-y-6 animate-in slide-in-from-right">
      <h2 className="text-2xl font-bold text-slate-800">Nghe và đoán nghĩa từ mới</h2>
      <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm text-center">
        <button
          onClick={() => playAudio(currentWord?.examples?.[0]?.en || currentWord?.term)}
          className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 hover:bg-blue-200 hover:scale-110 transition-all"
        >
          <Volume2 className="w-10 h-10" />
        </button>
        <p className="text-xl font-medium text-slate-700 mb-2">{currentWord?.examples?.[0]?.en || currentWord?.term}</p>
        <p className="text-slate-500 italic">"{currentWord?.examples?.[0]?.vi || currentWord?.translation}"</p>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="font-bold text-3xl text-blue-600 tracking-wide">{currentWord?.term}</p>
        </div>
      </div>
    </div>
  );
}
