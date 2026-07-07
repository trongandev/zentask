import React, { useState, useEffect, useMemo, useRef } from "react";
import { Flashcard } from "../../services/flashcardService";
import { cn } from "../../lib/utils";
import { CheckCircle, RotateCw } from "lucide-react";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { useSM2 } from "../../hooks/useSM2";

interface ModeBubbleProps {
  cards: Flashcard[];
  setId: string;
}


export function ModeBubble({ cards, setId }: ModeBubbleProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [bubbles, setBubbles] = useState<any[]>([]);
  const [animatingSuccess, setAnimatingSuccess] = useState(false);

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
      const size = 100 + Math.random() * 40;

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
          setCompleted(true);
        }
      }, 1500);
    } else {
      reportWrong(currentCard.id, "bubble");
      playSoundEffect("wrong");
      setBubbles((prev) => prev.map((b) => (b.cardId === cardId ? { ...b, error: true } : b)));
      setTimeout(() => {
        setBubbles((prev) => prev.map((b) => (b.cardId === cardId ? { ...b, error: false } : b)));
      }, 500);
    }
  };


  if (cards.length < 5) {
    return <div className="text-gray-500">Bộ thẻ cần ít nhất 5 từ vựng để chơi Bắn bong bóng.</div>;
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Chiến thắng!</h2>
        <p className="text-gray-500 mb-8">Bạn có phản xạ rất tuyệt vời.</p>
        <button
          onClick={() => {
            setCompleted(false);
            setCurrentIndex(0);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all active:scale-95"
        >
          <RotateCw className="w-5 h-5" />
          Chơi lại
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col relative overflow-hidden bg-gradient-to-b from-blue-50 to-white">
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
      <div className="absolute top-10 left-1/2 -translate-x-1/2 z-20 w-full px-4 flex justify-center">
        <div
          className={cn(
            "bg-white px-8 py-4 rounded-3xl shadow-xl border border-gray-100 text-center transition-all duration-300",
            animatingSuccess ? "bg-green-500 text-white border-green-600 scale-110 shadow-green-500/50" : "",
          )}
        >
          <p className="text-sm font-bold opacity-60 uppercase tracking-widest mb-1">Tìm từ có nghĩa:</p>
          <h2 className="text-4xl font-extrabold">{currentCard.translation}</h2>
          <div className="mt-2 text-sm font-bold opacity-50">
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
              <button
                onClick={() => handleBubbleClick(bubble.cardId)}
                disabled={animatingSuccess}
                className={cn(
                  "w-full h-full rounded-full flex items-center justify-center font-bold text-center p-4 cursor-pointer pointer-events-auto shadow-[inset_0_-10px_20px_rgba(0,0,0,0.1),0_5px_15px_rgba(0,0,0,0.1)] transition-colors active:scale-95 origin-center",
                  "bg-gradient-to-br from-blue-100 to-blue-300 border-2 border-blue-400 text-blue-900 text-lg",
                  isError ? "bubble-error" : "",
                  animatingSuccess && bubble.cardId === currentCard.id ? "bubble-pop" : "",
                  animatingSuccess && bubble.cardId !== currentCard.id ? "opacity-20" : "",
                )}
              >
                {/* Glossy reflection effect */}
                <div className="absolute top-[15%] left-[15%] w-[30%] h-[30%] bg-white rounded-full opacity-60"></div>
                <span className="relative z-10 leading-tight break-words pointer-events-none drop-shadow-sm">{bubble.term}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
