import React from "react";
import { Mic, Check } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Button } from "@/src/components/ui/Button";

interface RoundPlaceholderProps {
  roundName: string;
  isCorrect: boolean | null;
  setIsCorrect: (val: boolean | null) => void;
}

export function RoundPlaceholder({ roundName, isCorrect, setIsCorrect }: RoundPlaceholderProps) {
  return (
    <div className="space-y-6 animate-in slide-in-from-right text-center">
      <h2 className="text-2xl font-bold text-slate-800">{roundName}</h2>
      <p className="text-slate-500">Tính năng này đang được phát triển...</p>
      
      <div className="mt-12">
        <Button
          onClick={() => setIsCorrect(true)}
          disabled={isCorrect !== null}
          className={cn(
            "w-20 h-20 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mx-auto hover:bg-green-50 hover:text-green-500 hover:scale-110 transition-all border-4 shadow-xl",
            isCorrect === true ? "bg-green-100 text-green-600 border-green-200" : "border-white"
          )}
        >
          <Check className="w-8 h-8" />
        </Button>
        <p className="text-sm text-slate-400 mt-4">Bấm để hoàn thành vòng (UI Demo)</p>
      </div>
    </div>
  );
}
