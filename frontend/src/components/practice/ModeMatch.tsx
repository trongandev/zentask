import React, { useState, useEffect, useMemo } from "react";
import { Flashcard } from "../../services/flashcardService";
import { cn } from "../../lib/utils";
import { CheckCircle, RotateCw, ArrowLeft } from "lucide-react";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { useSM2 } from "../../hooks/useSM2";
import { Button } from "@/src/components/ui/Button";
import { useNavigate } from "react-router-dom";

interface ModeMatchProps {
  cards: Flashcard[];
  setId: string;
  onComplete?: (wrongCardIds: string[]) => void;
  completionActions?: React.ReactNode;
}

type MatchItem = { id: string; text: string; type: 'en' | 'vi'; flashcardId: string; isMatched: boolean };

export function ModeMatch({ cards, setId, onComplete, completionActions }: ModeMatchProps) {
  const [completed, setCompleted] = useState(false);
  const [wrongCardIds, setWrongCardIds] = useState<string[]>([]);
  const wrongCardIdsRef = React.useRef<string[]>([]);
  const [items, setItems] = useState<MatchItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [wrongPair, setWrongPair] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const navigate = useNavigate();

  const { playAudio, playSoundEffect } = useTTSAudio();
  const { reportCorrect, reportWrong, flushProgress } = useSM2(setId);


  // Initialize game
  useEffect(() => {
    initGame();
  }, [cards]);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (startTime > 0 && !completed) {
      interval = setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [startTime, completed]);

  const initGame = () => {
    // Pick up to 5 random cards for the match game
    const gameCards = [...cards].sort(() => 0.5 - Math.random()).slice(0, 5);
    
    const newItems: MatchItem[] = [];
    gameCards.forEach(c => {
      newItems.push({ id: `en_${c.id}`, text: c.term, type: 'en', flashcardId: c.id, isMatched: false });
      newItems.push({ id: `vi_${c.id}`, text: c.translation, type: 'vi', flashcardId: c.id, isMatched: false });
    });
    
    // Shuffle all items
    setItems(newItems.sort(() => 0.5 - Math.random()));
    setSelectedIds([]);
    setWrongPair([]);
    setMatchedPairs([]);
    setWrongCardIds([]); wrongCardIdsRef.current = [];
    setStartTime(Date.now());
    setTimeElapsed(0);
    setCompleted(false);
  };

  const handleSelect = (id: string) => {
    if (wrongPair.length > 0 || matchedPairs.includes(id) || selectedIds.includes(id)) return;

    const newSelected = [...selectedIds, id];
    setSelectedIds(newSelected);

    if (newSelected.length === 2) {
      const item1 = items.find(i => i.id === newSelected[0])!;
      const item2 = items.find(i => i.id === newSelected[1])!;

      if (item1.flashcardId === item2.flashcardId && item1.type !== item2.type) {
        // Match!
        const enItem = item1.type === 'en' ? item1 : item2;
        reportCorrect(item1.flashcardId, "match");
        playAudio(enItem.text, undefined, 'correct');
        
        const newMatched = [...matchedPairs, newSelected[0], newSelected[1]];
        setMatchedPairs(newMatched);
        setSelectedIds([]);
        
        if (newMatched.length === items.length) {
          setTimeout(() => {
            flushProgress();
            onComplete?.(wrongCardIdsRef.current);
            setCompleted(true);
          }, 1500);
        }
      } else {
        // Wrong match
        reportWrong(item1.flashcardId, "match");
        const wrongIds = Array.from(new Set([item1.flashcardId, item2.flashcardId]));
        setWrongCardIds((prev) => { const next = Array.from(new Set([...prev, ...wrongIds])); wrongCardIdsRef.current = next; return next; });
        playSoundEffect('wrong');
        setWrongPair(newSelected);
        setTimeout(() => {
          setWrongPair([]);
          setSelectedIds([]);
        }, 1000);
      }
    }
  };

  if (cards.length < 5) {
    return <div className="text-slate-500 font-bold bg-white p-6 rounded-2xl shadow-sm">Bộ thẻ cần ít nhất 5 từ vựng để chơi Nối từ.</div>;
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-500 w-full">
        <div className="bg-white p-8 md:p-12 rounded-[2rem] border-2 border-slate-200/60 shadow-xl shadow-slate-200/50 flex flex-col items-center max-w-lg w-full">
          <div className="w-24 h-24 bg-green-100 rounded-[2rem] flex items-center justify-center mb-6 rotate-3 border-2 border-green-200">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Quá đỉnh!</h2>
          <p className="text-slate-500 mb-2 font-bold">Bạn đã nối xong các từ.</p>
          <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl px-6 py-4 mb-8 flex items-center justify-center gap-2 w-full shadow-inner">
             <span className="text-blue-500 font-bold">Thời gian hoàn thành:</span>
             <span className="text-2xl font-black text-blue-700 tracking-tight">{timeElapsed}s</span>
          </div>
          <Button 
            onClick={initGame}
            className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl border-2 border-blue-600 border-b-4 active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center gap-2 mb-3"
          >
            <RotateCw className="w-5 h-5" />
            Chơi lại
          </Button>
          <Button 
            onClick={() => navigate(-1)}
            className="w-full py-4 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-2xl border-2 border-slate-200 border-b-4 active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Quay về
          </Button>
          {completionActions && <div className="mt-4 w-full">{completionActions}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl flex flex-col items-center justify-center h-full py-8">
      <div className="w-full flex justify-between items-center mb-10 px-4">
        <span className="text-slate-500 font-bold bg-white px-5 py-3 rounded-2xl shadow-sm border-2 border-slate-100 flex items-center gap-2">
          Thời gian: <span className="text-blue-600 text-lg font-black">{timeElapsed}s</span>
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5 w-full px-4">
        {items.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          const isWrong = wrongPair.includes(item.id);
          const isMatched = matchedPairs.includes(item.id);

          let stateClass = "bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-slate-50";
          let borderBClass = "border-b-4";

          if (isMatched) {
            stateClass = "opacity-0 scale-90 pointer-events-none"; // Disappear when matched
            borderBClass = "";
          } else if (isWrong) {
            stateClass = "bg-red-500 border-red-600 text-white shadow-lg shadow-red-500/30";
            borderBClass = "border-b-2 translate-y-[2px]";
          } else if (isSelected) {
            stateClass = "bg-blue-500 border-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105 z-10";
            borderBClass = "border-b-2 translate-y-[2px]";
          }

          return (
            <Button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              disabled={isMatched || (selectedIds.length === 2 && !isSelected && !isWrong)}
              className={cn(
                "p-4 rounded-2xl border-2 font-bold transition-all duration-300 min-h-[120px] flex items-center justify-center shadow-sm relative overflow-hidden group outline-none focus:outline-none",
                stateClass,
                !isMatched && !isSelected && !isWrong ? "active:border-b-2 active:translate-y-[2px]" : "",
                borderBClass
              )}
            >
              <span className={cn(
                "text-center break-words px-2", 
                item.type === 'en' ? "font-black text-xl md:text-2xl tracking-tight" : "font-bold text-base md:text-lg"
              )}>
                {item.text}
              </span>
              
              {/* Optional background icon hint or styling */}
              {!isMatched && !isSelected && !isWrong && (
                <div className="absolute inset-0 bg-slate-400 opacity-0 group-hover:opacity-[0.03] transition-opacity"></div>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
