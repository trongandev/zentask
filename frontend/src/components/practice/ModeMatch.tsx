import React, { useState, useEffect, useMemo } from "react";
import { Flashcard } from "../../services/flashcardService";
import { cn } from "../../lib/utils";
import { CheckCircle, RotateCw } from "lucide-react";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { useSM2 } from "../../hooks/useSM2";

interface ModeMatchProps {
  cards: Flashcard[];
  setId: string;
}


type MatchItem = { id: string; text: string; type: 'en' | 'vi'; flashcardId: string; isMatched: boolean };

export function ModeMatch({ cards, setId }: ModeMatchProps) {
  const [completed, setCompleted] = useState(false);
  const [items, setItems] = useState<MatchItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [wrongPair, setWrongPair] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [timeElapsed, setTimeElapsed] = useState<number>(0);

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
            setCompleted(true);
          }, 1500);
        }
      } else {
        // Wrong match
        reportWrong(item1.flashcardId, "match");
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
    return <div className="text-gray-500">Bộ thẻ cần ít nhất 5 từ vựng để chơi Nối từ.</div>;
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Quá đỉnh!</h2>
        <p className="text-gray-500 mb-2">Bạn đã nối xong các từ.</p>
        <p className="text-xl font-bold text-blue-600 mb-8">Thời gian: {timeElapsed} giây</p>
        <button 
          onClick={initGame}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all active:scale-95"
        >
          <RotateCw className="w-5 h-5" />
          Chơi lại
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl flex flex-col items-center justify-center h-full py-8">
      <div className="w-full flex justify-between items-center mb-8 px-4">
        <span className="text-gray-500 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
          Thời gian: <span className="text-blue-600">{timeElapsed}s</span>
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full px-4">
        {items.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          const isWrong = wrongPair.includes(item.id);
          const isMatched = matchedPairs.includes(item.id);

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              disabled={isMatched || (selectedIds.length === 2 && !isSelected && !isWrong)}
              className={cn(
                "p-4 rounded-2xl border-2 text-center font-bold transition-all duration-300 min-h-[100px] flex items-center justify-center shadow-sm",
                isMatched 
                  ? "opacity-0 scale-90 pointer-events-none" 
                  : isWrong
                    ? "bg-red-50 border-red-500 text-red-700 shadow-red-500/20"
                    : isSelected
                      ? "bg-blue-50 border-blue-500 text-blue-700 shadow-blue-500/20 scale-105"
                      : "bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-gray-50 hover:shadow-md active:scale-95"
              )}
            >
              <span className={cn("text-lg", item.type === 'en' ? "font-extrabold text-xl" : "font-medium")}>
                {item.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
