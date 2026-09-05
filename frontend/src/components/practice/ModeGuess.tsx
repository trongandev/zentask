import React, { useState, useEffect, useMemo } from "react";
import { Flashcard } from "../../services/flashcardService";
import { cn } from "../../lib/utils";
import { CheckCircle, RotateCw, Lightbulb, ArrowLeft } from "lucide-react";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { useSM2 } from "../../hooks/useSM2";
import { Button } from "@/src/components/ui/Button";
import { useNavigate } from "react-router-dom";

interface ModeGuessProps {
  cards: Flashcard[];
  setId: string;
  onComplete?: (wrongCardIds: string[]) => void;
  completionActions?: React.ReactNode;
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

export function ModeGuess({ cards, setId, onComplete, completionActions }: ModeGuessProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [wrongCardIds, setWrongCardIds] = useState<string[]>([]);
  const wrongCardIdsRef = React.useRef<string[]>([]);
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  
  const [slots, setSlots] = useState<BlankSlot[]>([]);
  const [options, setOptions] = useState<LetterOption[]>([]);
  const [showMeaning, setShowMeaning] = useState(false);
  const navigate = useNavigate();

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
          onComplete?.(wrongCardIdsRef.current);
          setCompleted(true);
        }
      }, 1500);
    } else {
      // Wrong: shake and reset the incorrectly placed tiles
      reportWrong(currentCard.id, "guess");
      setWrongCardIds((prev) => { const next = prev.includes(currentCard.id) ? prev : [...prev, currentCard.id]; wrongCardIdsRef.current = next; return next; });
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
      <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-500 w-full">
        <div className="bg-white p-8 md:p-12 rounded-[2rem] border-2 border-slate-200/60 shadow-xl shadow-slate-200/50 flex flex-col items-center max-w-lg w-full">
          <div className="w-24 h-24 bg-green-100 rounded-[2rem] flex items-center justify-center mb-6 rotate-3 border-2 border-green-200">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Thật thông minh!</h2>
          <p className="text-slate-500 mb-8 font-bold">Bạn đã đoán đúng tất cả các từ.</p>
          <Button 
            onClick={() => { setCompleted(false); setCurrentIndex(0); setWrongCardIds([]); wrongCardIdsRef.current = []; }}
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
    <div className="w-full max-w-3xl flex flex-col items-center justify-center h-full py-8">
      <div className="w-full flex justify-between items-center mb-8 px-4">
        <span className="text-slate-500 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border-2 border-slate-100">
          Từ {currentIndex + 1} / {cards.length}
        </span>
        <div className="flex-1 ml-6 h-3 bg-slate-200 rounded-full overflow-hidden border border-slate-200/50">
          <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}></div>
        </div>
      </div>

      <div className={cn(
        "w-full bg-white rounded-[2rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 border-2 mb-10 transition-colors duration-300 relative flex flex-col items-center",
        status === "idle" ? "border-slate-200/60" : status === "correct" ? "border-green-500 bg-green-50/50" : "border-red-500 bg-red-50/50"
      )}>
        <p className="text-sm font-bold opacity-60 uppercase tracking-widest mb-8 text-slate-500">Hoàn thành từ vựng dưới đây</p>
        
        {/* Word Slots */}
        <div className={cn(
          "flex flex-wrap justify-center gap-2 md:gap-3 mb-10",
          status === "wrong" ? "animate-[shake_0.5s_ease-in-out]" : ""
        )}>
          {slots.map((slot, idx) => {
            if (slot.isSpace) {
              return <div key={idx} className="w-6" />;
            }
            
            let displayChar = "";
            let slotClass = "";
            
            if (!slot.isHidden) {
              displayChar = slot.char;
              slotClass = "bg-slate-100 text-slate-800 border-slate-200 border-b-4 border-slate-300/50";
            } else if (slot.filledWithId) {
              const opt = options.find(o => o.id === slot.filledWithId);
              displayChar = opt ? opt.char : "";
              slotClass = "bg-blue-500 text-white border-blue-600 border-b-4 cursor-pointer hover:bg-blue-600 active:border-b-2 active:translate-y-[2px] shadow-sm";
            } else {
              slotClass = "bg-slate-50/50 border-dashed border-slate-300 text-transparent border-2";
            }
            
            return (
              <div 
                key={idx} 
                onClick={() => handleSlotClick(idx)}
                className={cn(
                  "w-12 h-14 md:w-16 md:h-16 flex items-center justify-center text-2xl md:text-3xl font-black rounded-xl border-2 transition-all duration-200 select-none",
                  slotClass,
                  status === "correct" ? "bg-green-500 border-green-600 border-b-4 text-white" : "",
                  status === "wrong" && slot.isHidden && slot.filledWithId ? "bg-red-500 border-red-600 border-b-4 text-white" : ""
                )}
              >
                {displayChar}
              </div>
            );
          })}
        </div>

        {/* Translation / Hint toggle */}
        <div className="w-full flex justify-center gap-4">
          <Button
            onClick={() => setShowMeaning(true)}
            disabled={showMeaning}
            className="px-6 py-3 rounded-xl border-2 border-slate-200 border-b-4 active:border-b-2 active:translate-y-[2px] text-slate-600 font-bold hover:bg-slate-50 disabled:opacity-0 disabled:translate-y-[2px] disabled:border-b-2 transition-all flex items-center gap-2"
          >
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Xem nghĩa
          </Button>
        </div>
        
        {showMeaning && (
          <div className="mt-6 text-center animate-in fade-in slide-in-from-top-2 bg-slate-50 border-2 border-slate-100 rounded-2xl px-8 py-5">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{currentCard.translation}</h3>
            {currentCard.phonetic && <p className="text-blue-500 font-mono font-bold mt-2">{currentCard.phonetic}</p>}
          </div>
        )}
      </div>

      {/* Options */}
      <div className="w-full max-w-2xl bg-white p-8 rounded-[2rem] border-2 border-slate-200/60 shadow-lg shadow-slate-200/30">
        <div className="flex flex-wrap justify-center gap-3">
          {options.map((opt) => (
            <Button
              key={opt.id}
              onClick={() => handleOptionClick(opt)}
              disabled={opt.used || status !== "idle"}
              className={cn(
                "w-12 h-14 md:w-16 md:h-16 flex items-center justify-center text-xl md:text-3xl font-black rounded-xl transition-all duration-200",
                opt.used 
                  ? "bg-slate-100 border-2 border-slate-200 border-b-2 text-slate-400 opacity-60 scale-95 pointer-events-none translate-y-[2px]" 
                  : "bg-white text-slate-800 border-2 border-b-4 border-slate-200 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 active:translate-y-[2px] active:border-b-2"
              )}
            >
              {opt.char}
            </Button>
          ))}
        </div>
        
        <div className="mt-8 flex justify-center">
          <Button 
            onClick={handleHint}
            disabled={status !== "idle"}
            className="flex items-center gap-2 text-blue-600 font-bold bg-blue-50 border-2 border-blue-100 border-b-4 active:border-b-2 active:translate-y-[2px] px-6 py-4 rounded-xl hover:bg-blue-100 transition-all disabled:opacity-50"
          >
            <Lightbulb className="w-5 h-5" />
            Gợi ý 1 từ
          </Button>
        </div>
      </div>
    </div>
  );
}
