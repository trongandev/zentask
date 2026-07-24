import React, { useState, useEffect } from "react";
import { cn } from "../../../lib/utils";
import { Button } from "@/src/components/ui/Button";

interface Round4CompleteWordProps {
  currentWord: any;
  isCorrect: boolean | null;
  onCheckAnswer: (isCorrect: boolean) => void;
}

interface BlankSlot {
  char: string;
  isSpace: boolean;
  isHidden: boolean;
  filledWithId: string | null;
}

interface LetterOption {
  id: string;
  char: string;
  used: boolean;
}

export function Round4CompleteWord({ currentWord, isCorrect, onCheckAnswer }: Round4CompleteWordProps) {
  const [slots, setSlots] = useState<BlankSlot[]>([]);
  const [options, setOptions] = useState<LetterOption[]>([]);

  useEffect(() => {
    if (!currentWord) return;
    const word = currentWord.term.toUpperCase();
    
    const validIndices: number[] = [];
    for (let i = 0; i < word.length; i++) {
      if (word[i] !== " ") validIndices.push(i);
    }
    
    // Hide ~40% of the letters
    const hideCount = Math.max(1, Math.floor(validIndices.length * 0.4));
    const hiddenIndices = validIndices.sort(() => 0.5 - Math.random()).slice(0, hideCount);
    
    const initialSlots: BlankSlot[] = [];
    const hiddenChars: string[] = [];
    
    for (let i = 0; i < word.length; i++) {
      const isSpace = word[i] === " ";
      const isHidden = hiddenIndices.includes(i);
      
      initialSlots.push({ char: word[i], isSpace, isHidden, filledWithId: null });
      if (isHidden) hiddenChars.push(word[i]);
    }
    
    // Noise characters
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const noiseCount = 5;
    const noiseChars = [];
    for (let i = 0; i < noiseCount; i++) {
      noiseChars.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
    }
    
    const allOptions = [...hiddenChars, ...noiseChars].map((char, idx) => ({
      id: `opt_${idx}`,
      char,
      used: false
    })).sort(() => 0.5 - Math.random());

    setSlots(initialSlots);
    setOptions(allOptions);
  }, [currentWord]);

  // When parent sets isCorrect to null (moving to next step or reset), we don't need to rebuild the options
  // because the currentWord will change and trigger the useEffect above.

  const handleOptionClick = (opt: LetterOption) => {
    if (isCorrect !== null || opt.used) return;
    
    const emptySlotIndex = slots.findIndex(s => s.isHidden && !s.filledWithId);
    if (emptySlotIndex !== -1) {
      const newSlots = [...slots];
      newSlots[emptySlotIndex].filledWithId = opt.id;
      setSlots(newSlots);
      
      const newOptions = options.map(o => o.id === opt.id ? { ...o, used: true } : o);
      setOptions(newOptions);
      
      checkWinCondition(newSlots, newOptions);
    }
  };

  const handleSlotClick = (slotIndex: number) => {
    if (isCorrect !== null) return;
    const slot = slots[slotIndex];
    if (!slot.isHidden || !slot.filledWithId) return;
    
    const optId = slot.filledWithId;
    const newOptions = options.map(o => o.id === optId ? { ...o, used: false } : o);
    setOptions(newOptions);
    
    const newSlots = [...slots];
    newSlots[slotIndex].filledWithId = null;
    setSlots(newSlots);
  };

  const checkWinCondition = (currentSlots: BlankSlot[], currentOptions: LetterOption[]) => {
    const allFilled = currentSlots.every(s => !s.isHidden || s.filledWithId !== null);
    if (!allFilled) return;
    
    let correct = true;
    for (let i = 0; i < currentSlots.length; i++) {
      const s = currentSlots[i];
      if (s.isHidden) {
        const opt = currentOptions.find(o => o.id === s.filledWithId);
        if (!opt || opt.char !== s.char) {
          correct = false;
          break;
        }
      }
    }
    
    onCheckAnswer(correct);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right text-center flex flex-col items-center">
      <h2 className="text-2xl font-bold text-slate-800 mb-8">Hoàn thiện từ</h2>
      <p className="text-xl text-slate-600 mb-8">Nghĩa: {currentWord?.translation}</p>

      {/* Word Slots */}
      <div className="flex flex-wrap justify-center gap-2 mb-12">
        {slots.map((slot, idx) => {
          if (slot.isSpace) {
            return <div key={idx} className="w-4 md:w-6" />; // Space separator
          }
          
          let displayChar = slot.char;
          let slotClass = "bg-slate-100 text-slate-800 border-slate-200"; // Visible char
          
          if (slot.isHidden) {
            if (slot.filledWithId) {
              const opt = options.find(o => o.id === slot.filledWithId);
              displayChar = opt ? opt.char : "";
              slotClass = "bg-blue-600 text-white border-blue-700 cursor-pointer hover:bg-blue-700 shadow-md transform active:scale-95";
            } else {
              displayChar = "";
              slotClass = "bg-white border-dashed border-gray-300 border-2";
            }
          }
          
          return (
            <div 
              key={idx} 
              onClick={() => handleSlotClick(idx)}
              className={cn(
                "w-12 h-14 md:w-14 md:h-16 flex items-center justify-center text-2xl font-extrabold rounded-xl border-2 transition-all duration-200 select-none",
                slotClass,
                isCorrect === true ? "bg-green-500 border-green-600 text-white shadow-lg shadow-green-500/30 transform scale-[1.02] animate-shake" : "",
                isCorrect === false && slot.isHidden && slot.filledWithId ? "bg-red-500 border-red-600 text-white shadow-lg shadow-red-500/30 transform scale-95 animate-shake" : ""
              )}
            >
              {displayChar}
            </div>
          );
        })}
      </div>

      {/* Letter Options */}
      <div className="flex flex-wrap justify-center gap-3 w-full max-w-md mx-auto">
        {options.map(opt => (
          <Button
            key={opt.id}
            onClick={() => handleOptionClick(opt)}
            disabled={opt.used || isCorrect !== null}
            className={cn(
              "w-12 h-14 md:w-14 md:h-16 flex items-center justify-center text-2xl font-bold rounded-xl border-2 transition-all shadow-sm active:scale-95",
              opt.used 
                ? "bg-slate-100 text-slate-300 border-slate-200 shadow-none cursor-default" 
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400 shadow-md cursor-pointer"
            )}
          >
            {opt.char}
          </Button>
        ))}
      </div>
    </div>
  );
}
