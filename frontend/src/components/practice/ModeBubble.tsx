import React, { useState, useEffect, useMemo, useRef } from "react";
import { Flashcard } from "../../services/flashcardService";
import { cn } from "../../lib/utils";
import { CheckCircle, RotateCw, ArrowLeft } from "lucide-react";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { useSM2 } from "../../hooks/useSM2";
import { Button } from "@/src/components/ui/Button";
import { useNavigate } from "react-router-dom";

interface ModeBubbleProps {
  cards: Flashcard[];
  setId: string;
  onComplete?: (wrongCardIds: string[]) => void;
  completionActions?: React.ReactNode;
}

export function ModeBubble({ cards, setId, onComplete, completionActions }: ModeBubbleProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [wrongCardIds, setWrongCardIds] = useState<string[]>([]);
  const wrongCardIdsRef = React.useRef<string[]>([]);
  const [bubbles, setBubbles] = useState<any[]>([]);
  const [animatingSuccess, setAnimatingSuccess] = useState(false);
  const navigate = useNavigate();

  const containerRef = useRef<HTMLDivElement>(null);
  const bubblesData = useRef<any[]>([]);
  const animationRef = useRef<number>(0);

  const { playAudio, playSoundEffect } = useTTSAudio();
  const { reportCorrect, reportWrong, flushProgress } = useSM2(setId);

  const currentCard = cards[currentIndex];

  useEffect(() => {
    if (!currentCard || cards.length < 5) return;

    // Generate bubbles
    const wrongCards = [...cards]
      .filter((c) => c.id !== currentCard.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 4);
    const options = [currentCard, ...wrongCards].sort(() => 0.5 - Math.random());

    const containerWidth = containerRef.current ? containerRef.current.clientWidth : 800;
    const containerHeight = containerRef.current ? containerRef.current.clientHeight : 600;

    const newBubbles = options.map((opt, i) => {
      const size = 110 + Math.random() * 40; // slightly larger for bento style text

      // Random starting positions within bounds
      const x = Math.random() * (containerWidth - size);
      const y = Math.random() * (containerHeight - size);

      // Random velocities (speed between 1 and 3)
      const speed = 1.5 + Math.random() * 1.5;
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      return {
        id: `bubble_${opt.id}_${currentIndex}`,
        cardId: opt.id,
        term: opt.term,
        size,
        x,
        y,
        vx,
        vy,
        error: false,
      };
    });

    bubblesData.current = newBubbles;
    setBubbles([...newBubbles]);
    setAnimatingSuccess(false);
  }, [currentIndex, currentCard, cards]);

  useEffect(() => {
    if (animatingSuccess || bubbles.length === 0) return;

    let lastTime = performance.now();

    const animate = (time: number) => {
      // dt is roughly 1.0 at 60fps
      const dt = Math.min((time - lastTime) / 16.66, 3);
      lastTime = time;

      if (containerRef.current) {
        const { clientWidth: width, clientHeight: height } = containerRef.current;

        bubblesData.current.forEach((bubble) => {
          bubble.x += bubble.vx * dt;
          bubble.y += bubble.vy * dt;

          // Bounce off walls
          if (bubble.x <= 0) {
            bubble.x = 0;
            bubble.vx *= -1;
          } else if (bubble.x + bubble.size >= width) {
            bubble.x = width - bubble.size;
            bubble.vx *= -1;
          }

          if (bubble.y <= 0) {
            bubble.y = 0;
            bubble.vy *= -1;
          } else if (bubble.y + bubble.size >= height) {
            bubble.y = height - bubble.size;
            bubble.vy *= -1;
          }

          // Update DOM
          const el = document.getElementById(bubble.id);
          if (el) {
            el.style.transform = `translate(${bubble.x}px, ${bubble.y}px)`;
          }
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [animatingSuccess, bubbles]);

  const handleBubbleClick = (cardId: string) => {
    if (animatingSuccess) return;

    if (cardId === currentCard.id) {
      setAnimatingSuccess(true);
      reportCorrect(currentCard.id, "bubble");
      playAudio(currentCard.term, undefined, "correct");
      setTimeout(() => {
        if (currentIndex < cards.length - 1) {
          setCurrentIndex((curr) => curr + 1);
        } else {
          flushProgress();
          onComplete?.(wrongCardIdsRef.current);
          setCompleted(true);
        }
      }, 1500);
    } else {
      reportWrong(currentCard.id, "bubble");
      setWrongCardIds((prev) => { const next = prev.includes(currentCard.id) ? prev : [...prev, currentCard.id]; wrongCardIdsRef.current = next; return next; });
      playSoundEffect("wrong");
      setBubbles((prev) => prev.map((b) => (b.cardId === cardId ? { ...b, error: true } : b)));
      setTimeout(() => {
        setBubbles((prev) => prev.map((b) => (b.cardId === cardId ? { ...b, error: false } : b)));
      }, 500);
    }
  };

  if (cards.length < 5) {
    return <div className="text-slate-500 font-bold bg-white p-6 rounded-2xl shadow-sm">Bộ thẻ cần ít nhất 5 từ vựng để chơi Bắn bong bóng.</div>;
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-500 w-full">
        <div className="bg-white p-8 md:p-12 rounded-[2rem] border-2 border-slate-200/60 shadow-xl shadow-slate-200/50 flex flex-col items-center max-w-lg w-full">
          <div className="w-24 h-24 bg-green-100 rounded-[2rem] flex items-center justify-center mb-6 rotate-3 border-2 border-green-200">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Chiến thắng!</h2>
          <p className="text-slate-500 mb-8 font-bold">Bạn có phản xạ rất tuyệt vời.</p>
          <Button
            onClick={() => {
              setCompleted(false);
              setCurrentIndex(0);
              setWrongCardIds([]);
              wrongCardIdsRef.current = [];
            }}
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
    <div ref={containerRef} className="w-full h-full rounded-[2rem] shadow-sm border-2 border-slate-200/60 flex flex-col relative overflow-hidden bg-gradient-to-b from-blue-50/50 to-white">
      <style>{`
        @keyframes pop {
          0% { transform: scale(1) translateY(0); opacity: 1; }
          50% { transform: scale(1.2) translateY(-20px); opacity: 0.8; }
          100% { transform: scale(0) translateY(-40px); opacity: 0; }
        }
        .bubble-pop {
          animation: pop 0.5s ease-out forwards !important;
        }
        @keyframes shake {
          0%, 100% { margin-left: 0; }
          25% { margin-left: -5px; }
          75% { margin-left: 5px; }
        }
        .bubble-error {
          animation: shake 0.2s ease-in-out 2;
          background: #fee2e2 !important;
          border-color: #ef4444 !important;
          color: #b91c1c !important;
        }
      `}</style>

      {/* Target Word */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 z-20 w-full px-4 flex justify-center pointer-events-none">
        <div
          className={cn(
            "bg-white px-8 py-5 rounded-[2rem] shadow-xl shadow-slate-200/50 border-2 text-center transition-all duration-300",
            animatingSuccess ? "bg-green-500 text-white border-green-600 scale-110 shadow-green-500/30" : "border-slate-200/60",
          )}
        >
          <p className="text-sm font-bold uppercase tracking-widest mb-2 opacity-60">Tìm từ có nghĩa:</p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">{currentCard.translation}</h2>
          <div className="mt-3 text-sm font-bold opacity-50 bg-black/5 rounded-full inline-block px-3 py-1">
            {currentIndex + 1} / {cards.length}
          </div>
        </div>
      </div>

      {/* Bubbles container */}
      <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
        {bubbles.map((bubble) => {
          const isError = bubbles.find((b) => b.id === bubble.id)?.error;
          return (
            <div
              id={bubble.id}
              key={bubble.id}
              style={{
                width: `${bubble.size}px`,
                height: `${bubble.size}px`,
                transform: `translate(${bubble.x}px, ${bubble.y}px)`,
                position: "absolute",
                top: 0,
                left: 0,
              }}
              className="will-change-transform pointer-events-none"
            >
              <Button
                onClick={() => handleBubbleClick(bubble.cardId)}
                disabled={animatingSuccess}
                className={cn(
                  "w-full h-full rounded-full flex items-center justify-center font-bold text-center p-4 cursor-pointer pointer-events-auto shadow-[0_8px_16px_rgba(59,130,246,0.2),inset_0_-8px_12px_rgba(0,0,0,0.1),inset_0_4px_8px_rgba(255,255,255,0.7)] transition-transform active:scale-95 origin-center",
                  "bg-gradient-to-b from-blue-300 to-blue-500 border-2 border-blue-400/50 text-white text-xl md:text-2xl",
                  isError ? "bubble-error" : "",
                  animatingSuccess && bubble.cardId === currentCard.id ? "bubble-pop" : "",
                  animatingSuccess && bubble.cardId !== currentCard.id ? "opacity-20" : "",
                )}
              >
                {/* Glossy reflection effect */}
                <div className="absolute top-[10%] left-[20%] w-[40%] h-[20%] bg-white rounded-full opacity-40 -rotate-12"></div>
                <span className="relative z-10 font-black tracking-tight leading-tight break-words pointer-events-none drop-shadow-md">{bubble.term}</span>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
