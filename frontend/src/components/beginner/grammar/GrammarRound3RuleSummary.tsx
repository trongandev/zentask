import React from "react";
import { Lightbulb } from "lucide-react";

interface GrammarRound3RuleSummaryProps {
  topicId: string;
  data: any;
}

export function GrammarRound3RuleSummary({ topicId, data }: GrammarRound3RuleSummaryProps) {
  const { title, description } = data.rule;
  return (
    <div className="space-y-8 animate-in slide-in-from-right text-center flex flex-col items-center">
      <h2 className="text-2xl font-bold text-slate-800">Quy tắc bỏ túi</h2>
      
      <div className="bg-amber-50 p-8 rounded-3xl border-2 border-amber-200 shadow-sm w-full max-w-lg relative mt-8">
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full flex items-center justify-center border-4 border-amber-100 shadow-sm">
          <Lightbulb className="w-8 h-8 text-amber-500 fill-amber-500" />
        </div>
        
        <p className="text-2xl font-bold text-amber-900 leading-relaxed mt-4">
          {title}
        </p>
        
        <div className="mt-6 pt-6 border-t border-amber-200/50">
          <p className="text-lg text-amber-800/80">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
