import React, { useState, useEffect, useMemo } from "react";
import { Flashcard } from "../../services/flashcardService";
import { cn } from "../../lib/utils";
import { CheckCircle, RotateCw, Lightbulb, Volume2 } from "lucide-react";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { useSM2 } from "../../hooks/useSM2";

interface ModeGuessProps {
  cards: Flashcard[];
  setId: string;
}


interface LetterOption {
  id: string;
  char: string;
  used: boolean;
}

interface BlankSlot {
  char: string;
  isSpace: boolean;
  isHidden: boolean;
  filledWithId: string | null;
}

export function ModeGuess({ cards, setId }: ModeGuessProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  
  const [slots, setSlots] = useState<BlankSlot[]>([]);
  const [options, setOptions] = useState<LetterOption[]>([]);
  const [showMeaning, setShowMeaning] = useState(false);

  const { playAudio, playSoundEffect } = useTTSAudio();
  const { reportCorrect, reportWrong, flushProgress } = useSM2(setId);


  const currentCard = cards[currentIndex];

  useEffect(() => {
    if (!currentCard) return;
    
    const word = currentCard.term.toUpperCase();
    
    // Find all valid non-space indices
    const validIndices: number[] = [];
    for (let i = 0; i < word.length; i++) {
      if (word[i] !== ' ') validIndices.push(i);
    }
    
    // Determine how many to hide (about 50%, min 1)
    const hideCount = Math.max(1, Math.floor(validIndices.length * 0.5));
    
    // Pick random indices to hide
    const hiddenIndices = validIndices.sort(() => 0.5 - Math.random()).slice(0, hideCount);
    
    const initialSlots: BlankSlot[] = [];
    const hiddenChars: string[] = [];
    
    for (let i = 0; i < word.length; i++) {
      const isSpace = word[i] === ' ';
      const isHidden = hiddenIndices.includes(i);
      
      initialSlots.push({
        char: word[i],
        isSpace,
        isHidden,
        filledWithId: null
      });
      
      if (isHidden) hiddenChars.push(word[i]);
    }
    
    // Generate extra random characters for noise
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const noiseCount = 6;
    const noiseChars = [];
    for (let i = 0; i < noiseCount; i++) {
      noiseChars.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
    }
    
    const allOptions = [...hiddenChars, ...noiseChars].map((char, idx) => ({
      id: `opt_${idx}`,
      char,
      used: false
    })).sort(() => 0.5 - Math.random()); // Shuffle options

    setSlots(initialSlots);
    setOptions(allOptions);
    setStatus("idle");
    setShowMeaning(false);
  }, [currentIndex, currentCard]);

  const handleOptionClick = (opt: LetterOption) => {
    if (status !== "idle" || opt.used) return;
    
    // Find first empty hidden slot
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
    if (status !== "idle") return;
    const slot = slots[slotIndex];
    if (!slot.isHidden || !slot.filledWithId) return;
    
    // Return option
    const optId = slot.filledWithId;
    const newOptions = options.map(o => o.id === optId ? { ...o, used: false } : o);
    setOptions(newOptions);
    
    const newSlots = [...slots];
    newSlots[slotIndex].filledWithId = null;
    setSlots(newSlots);
  };

  const checkWinCondition = (currentSlots: BlankSlot[], currentOptions: LetterOption[]) => {
    // Check if all hidden slots are filled
    const allFilled = currentSlots.every(s => !s.isHidden || s.filledWithId !== null);
    if (!allFilled) return;
    
    // Check if correct
    let isCorrect = true;
    for (let i = 0; i < currentSlots.length; i++) {
      const s = currentSlots[i];
      if (s.isHidden) {
        const opt = currentOptions.find(o => o.id === s.filledWithId);
        if (!opt || opt.char !== s.char) {
          isCorrect = false;
          break;
        }
      }
    }
    
    setStatus(isCorrect ? "correct" : "wrong");
    
    if (isCorrect) {
      reportCorrect(currentCard.id, "guess");
      playAudio(currentCard.term, undefined, 'correct');
      setTimeout(() => {
        if (currentIndex < cards.length - 1) {
          setCurrentIndex(curr => curr + 1);
        } else {
          flushProgress();
          setCompleted(true);
        }
      }, 1500);
    } else {
      // Wrong: shake and reset the incorrectly placed tiles
      reportWrong(currentCard.id, "guess");
      playSoundEffect('wrong');
      setTimeout(() => {
        setStatus("idle");
      }, 800);
    }
  };


  const handleHint = () => {
    // Reveal one correct character
    const emptySlotIndex = slots.findIndex(s => s.isHidden && !s.filledWithId);
    if (emptySlotIndex !== -1) {
      const correctChar = slots[emptySlotIndex].char;
      // Find an unused option with this char
      const opt = options.find(o => !o.used && o.char === correctChar);
      if (opt) {
        handleOptionClick(opt);
      }
    }
  };

  if (!currentCard) return null;

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Thật thông minh!</h2>
        <p className="text-gray-500 mb-8">Bạn đã đoán đúng tất cả các từ.</p>
        <button 
          onClick={() => { setCompleted(false); setCurrentIndex(0); }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all active:scale-95"
        >
          <RotateCw className="w-5 h-5" />
          Chơi lại
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl flex flex-col items-center justify-center h-full py-8">
      <div className="w-full flex justify-between items-center mb-8 px-4">
        <span className="text-gray-500 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
          Từ {currentIndex + 1} / {cards.length}
        </span>
      </div>

      <div className={cn(
        "w-full bg-white rounded-3xl p-8 shadow-lg border-2 mb-10 transition-colors duration-300 relative flex flex-col items-center",
        status === "idle" ? "border-gray-100" : status === "correct" ? "border-green-500 bg-green-50/30" : "border-red-500 bg-red-50/30"
      )}>
        <p className="text-sm font-bold opacity-60 uppercase tracking-widest mb-6 text-gray-500">Hoàn thành từ vựng dưới đây</p>
        
        {/* Word Slots */}
        <div className={cn(
          "flex flex-wrap justify-center gap-2 mb-8",
          status === "wrong" ? "animate-[shake_0.5s_ease-in-out]" : ""
        )}>
          {slots.map((slot, idx) => {
            if (slot.isSpace) {
              return <div key={idx} className="w-4" />;
            }
            
            let displayChar = "";
            let slotClass = "";
            
            if (!slot.isHidden) {
              displayChar = slot.char;
              slotClass = "bg-gray-100 text-gray-800 border-gray-200";
            } else if (slot.filledWithId) {
              const opt = options.find(o => o.id === slot.filledWithId);
              displayChar = opt ? opt.char : "";
              slotClass = "bg-blue-600 text-white border-blue-700 cursor-pointer hover:bg-blue-700 shadow-md transform active:scale-95";
            } else {
              slotClass = "bg-white border-dashed border-gray-300 text-transparent border-2";
            }
            
            return (
              <div 
                key={idx} 
                onClick={() => handleSlotClick(idx)}
                className={cn(
                  "w-12 h-14 md:w-16 md:h-18 flex items-center justify-center text-2xl md:text-3xl font-extrabold rounded-xl border-2 transition-all duration-200 select-none",
                  slotClass,
                  status === "correct" ? "bg-green-500 border-green-600 text-white" : "",
                  status === "wrong" && slot.isHidden && slot.filledWithId ? "bg-red-500 border-red-600 text-white" : ""
                )}
              >
                {displayChar}
              </div>
            );
          })}
        </div>

        {/* Translation / Hint toggle */}
        <div className="w-full flex justify-center gap-4">
          <button
            onClick={() => setShowMeaning(true)}
            disabled={showMeaning}
            className="px-6 py-2 rounded-full border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 disabled:opacity-0 transition-all flex items-center gap-2"
          >
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            Xem nghĩa
          </button>
        </div>
        
        {showMeaning && (
          <div className="mt-4 text-center animate-in fade-in slide-in-from-top-2">
            <h3 className="text-xl font-bold text-gray-800">{currentCard.translation}</h3>
            {currentCard.phonetic && <p className="text-gray-400 font-mono mt-1">{currentCard.phonetic}</p>}
          </div>
        )}
      </div>

      {/* Options */}
      <div className="w-full max-w-2xl bg-gray-50/80 backdrop-blur p-6 rounded-3xl border border-gray-100 shadow-inner">
        <div className="flex flex-wrap justify-center gap-3">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleOptionClick(opt)}
              disabled={opt.used || status !== "idle"}
              className={cn(
                "w-12 h-14 md:w-16 md:h-16 flex items-center justify-center text-xl md:text-2xl font-bold rounded-xl shadow-sm transition-all duration-300",
                opt.used 
                  ? "bg-gray-200 text-gray-400 opacity-50 scale-95 pointer-events-none" 
                  : "bg-white text-gray-800 border-2 border-b-4 border-gray-200 hover:border-blue-400 hover:text-blue-600 hover:-translate-y-1 active:translate-y-1 active:border-b-2"
              )}
            >
              {opt.char}
            </button>
          ))}
        </div>
        
        <div className="mt-8 flex justify-center">
          <button 
            onClick={handleHint}
            disabled={status !== "idle"}
            className="flex items-center gap-2 text-blue-600 font-bold bg-blue-50 px-6 py-3 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            <Lightbulb className="w-5 h-5" />
            Gợi ý 1 từ
          </button>
        </div>
      </div>
    </div>
  );
}
