import React from "react";
import { Volume2 } from "lucide-react";
import { useTTSAudio } from "../../../hooks/useTTSAudio";
import { Button } from "@/src/components/ui/Button";

interface GrammarRound1DiscoveryProps {
  topicId: string;
  data: any;
}

export function GrammarRound1Discovery({ topicId, data }: GrammarRound1DiscoveryProps) {
  const { playAudio } = useTTSAudio();
  
  const examples = data.discovery;

  return (
    <div className="space-y-8 animate-in slide-in-from-right text-center">
      <h2 className="text-2xl font-bold text-slate-800">Nhận diện mẫu câu</h2>
      <p className="text-slate-500 text-lg">Hãy đọc to các câu ví dụ dưới đây và quan sát điểm chung của chúng nhé.</p>
      
      <div className="flex flex-col gap-4 mt-8">
        {examples.map((ex, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-300 transition-colors">
            <div className="text-left flex-1">
              <p className="text-2xl font-bold text-slate-800 mb-1">
                {ex.en.split(ex.highlight).map((part, i, arr) => (
                  <React.Fragment key={i}>
                    {part}
                    {i < arr.length - 1 && <span className="text-blue-600 bg-blue-50 px-1 rounded-md">{ex.highlight}</span>}
                  </React.Fragment>
                ))}
              </p>
              <p className="text-slate-500 italic text-lg">{ex.vi}</p>
            </div>
            <Button 
              onClick={() => playAudio(ex.en)}
              className="w-12 h-12 rounded-full bg-slate-50 text-blue-500 flex items-center justify-center group-hover:bg-blue-100 transition-colors"
            >
              <Volume2 className="w-6 h-6" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
