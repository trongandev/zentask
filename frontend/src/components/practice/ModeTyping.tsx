import React, { useState, useEffect, useRef, useCallback } from "react";
import { Flashcard } from "../../services/flashcardService";
import { cn } from "../../lib/utils";
import { CheckCircle, RotateCw, Keyboard, Settings as SettingsIcon } from "lucide-react";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { useSM2 } from "../../hooks/useSM2";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";

interface ModeTypingProps {
  cards: Flashcard[];
  setId: string;
  onComplete?: (wrongCardIds: string[]) => void;
  completionActions?: React.ReactNode;
}


interface Meteorite {
  id: string;
  card: Flashcard;
  x: number;
  y: number;
  speed: number;
  imageIndex: number;
  isExploding: boolean;
}

export function ModeTyping({ cards, setId, onComplete, completionActions }: ModeTypingProps) {
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [completed, setCompleted] = useState(false);
  const [wrongCardIds, setWrongCardIds] = useState<string[]>([]);
  const wrongCardIdsRef = useRef<string[]>([]);
  const [meteorites, setMeteorites] = useState<Meteorite[]>([]);
  const [typedText, setTypedText] = useState("");
  const [lockedTargetId, setLockedTargetId] = useState<string | null>(null);

  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem("zentask_typing_config");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return { speedMultiplier: 1.0, spawnDelay: 3000 };
  });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    localStorage.setItem("zentask_typing_config", JSON.stringify(config));
  }, [config]);

  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const lastSpawnTime = useRef<number>(0);

  // Game refs to avoid dependency cycle in requestAnimationFrame
  const unlearnedRef = useRef<Flashcard[]>([]);
  const learnedRef = useRef<Flashcard[]>([]);
  const meteoritesRef = useRef<Meteorite[]>([]);
  const typedTextRef = useRef<string>("");
  const lockedTargetRef = useRef<string | null>(null);

  const { playAudio, playSoundEffect } = useTTSAudio();
  const { reportCorrect, reportWrong, flushProgress } = useSM2(setId);
  // Store SM-2 functions in refs so animation loop can access them
  const reportCorrectRef = useRef(reportCorrect);
  const reportWrongRef = useRef(reportWrong);
  const flushProgressRef = useRef(flushProgress);
  useEffect(() => { reportCorrectRef.current = reportCorrect; }, [reportCorrect]);
  useEffect(() => { reportWrongRef.current = reportWrong; }, [reportWrong]);
  useEffect(() => { wrongCardIdsRef.current = wrongCardIds; }, [wrongCardIds]);
  useEffect(() => { flushProgressRef.current = flushProgress; }, [flushProgress]);


  useEffect(() => {
    // Initialize game
    unlearnedRef.current = [...cards];
    learnedRef.current = [];
    setCompleted(false);
    setMeteorites([]);
    meteoritesRef.current = [];
    setTypedText("");
    typedTextRef.current = "";
    setLockedTargetId(null);
    lockedTargetRef.current = null;
  }, [cards]);

  const spawnMeteorite = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;

      let isDecoy = false;
      let cardToSpawn = null;

      // 30% chance of decoy if we have learned cards
      if (learnedRef.current.length > 0 && Math.random() < 0.3) {
        isDecoy = true;
        cardToSpawn = learnedRef.current[Math.floor(Math.random() * learnedRef.current.length)];
      } else if (unlearnedRef.current.length > 0) {
        isDecoy = false;
        cardToSpawn = unlearnedRef.current.shift();
      } else if (learnedRef.current.length > 0) {
        isDecoy = true;
        cardToSpawn = learnedRef.current[Math.floor(Math.random() * learnedRef.current.length)];
      }

      if (!cardToSpawn) return;

      const newMeteorite: Meteorite = {
        id: `meteor_${Date.now()}_${Math.random()}`,
        card: cardToSpawn,
        x: Math.random() * (containerWidth - 150) + 20,
        y: -100 - Math.random() * 50,
        speed: 0.15 + Math.random() * 0.15,
        imageIndex: Math.floor(Math.random() * 3) + 1,
        isExploding: false,
        isDecoy, // add this to the interface dynamically by spreading or explicitly adding it
      } as Meteorite & { isDecoy: boolean };

      meteoritesRef.current = [...meteoritesRef.current, newMeteorite];
      setMeteorites([...meteoritesRef.current]);
    }
  };

  useEffect(() => {
    if (completed) return;

    let lastTime = performance.now();

    const animate = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;

      // Spawn logic: continuously spawn based on config delay
      const hasRealTargets = meteoritesRef.current.some((m: any) => !m.isDecoy);

      if (unlearnedRef.current.length > 0 || hasRealTargets) {
        if (time - lastSpawnTime.current > config.spawnDelay) {
          spawnMeteorite();
          lastSpawnTime.current = time;
        }
      }

      if (containerRef.current) {
        const containerHeight = containerRef.current.clientHeight;

        let needsUpdate = false;
        const newMeteorites = [...meteoritesRef.current];

        for (let i = newMeteorites.length - 1; i >= 0; i--) {
          const m = newMeteorites[i] as any;

          if (!m.isExploding) {
            m.y += m.speed * config.speedMultiplier * dt * 0.1;
            needsUpdate = true;

            // Check if hit bottom
            if (m.y > containerHeight - 50) {
              // Missed!
              if (!m.isDecoy) {
                // Push real card back to queue
                unlearnedRef.current = [...unlearnedRef.current, m.card];
                reportWrongRef.current(m.card.id, "typing");
                setWrongCardIds((prev) => { const next = prev.includes(m.card.id) ? prev : [...prev, m.card.id]; wrongCardIdsRef.current = next; return next; });
                playSoundEffect("wrong");
              }

              // Remove meteorite
              newMeteorites.splice(i, 1);

              // Reset typing lock if this was the target
              if (lockedTargetRef.current === m.id) {
                typedTextRef.current = "";
                setTypedText("");
                lockedTargetRef.current = null;
                setLockedTargetId(null);
              }
            }
          }
        }

        if (needsUpdate) {
          meteoritesRef.current = newMeteorites;
          setMeteorites(newMeteorites);
        }
      }

      // Check win condition
      if (unlearnedRef.current.length === 0 && !meteoritesRef.current.some((m: any) => !m.isDecoy)) {
        flushProgressRef.current();
        onComplete?.(wrongCardIdsRef.current);
        setCompleted(true);
        return;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [completed]);

  // Handle typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (completed) return;

      // Ignore special keys
      if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1) {
        if (e.key === "Backspace") {
          // If we delete the whole word, remove lock
          if (typedTextRef.current.length <= 1) {
            typedTextRef.current = "";
            setTypedText("");
            lockedTargetRef.current = null;
            setLockedTargetId(null);
          } else {
            typedTextRef.current = typedTextRef.current.slice(0, -1);
            setTypedText(typedTextRef.current);
          }
        }
        return;
      }

      if (meteoritesRef.current.length === 0) return;

      const nextChar = e.key.toLowerCase();
      let targetMeteor: any = null;

      if (!lockedTargetRef.current) {
        // Find the lowest falling meteorite that starts with the character
        const candidates = meteoritesRef.current.filter((m) => !m.isExploding && m.card.term.toLowerCase().startsWith(nextChar)).sort((a, b) => b.y - a.y);

        if (candidates.length > 0) {
          targetMeteor = candidates[0];
          lockedTargetRef.current = targetMeteor.id;
          setLockedTargetId(targetMeteor.id);
        }
      } else {
        targetMeteor = meteoritesRef.current.find((m) => m.id === lockedTargetRef.current);
      }

      if (!targetMeteor || targetMeteor.isExploding) return;

      const targetWord = targetMeteor.card.term.toLowerCase().trim();
      const newTypedText = typedTextRef.current + nextChar;

      // Check if it matches prefix
      if (targetWord.startsWith(newTypedText)) {
        typedTextRef.current = newTypedText;
        setTypedText(newTypedText);

        // Check if fully typed
        if (newTypedText === targetWord) {
          // Boom!
          playAudio(targetMeteor.card.term, undefined, "correct");
          if (!targetMeteor.isDecoy) {
            reportCorrectRef.current(targetMeteor.card.id, "typing");
          }
          targetMeteor.isExploding = true;
          setMeteorites([...meteoritesRef.current]);

          if (!targetMeteor.isDecoy) {
            learnedRef.current.push(targetMeteor.card);
          }

          typedTextRef.current = "";
          setTypedText("");
          lockedTargetRef.current = null;
          setLockedTargetId(null);

          // Remove after explosion animation
          setTimeout(() => {
            meteoritesRef.current = meteoritesRef.current.filter((m) => m.id !== targetMeteor.id);
            setMeteorites([...meteoritesRef.current]);
          }, 800); // Wait for GIF to play
        }
      } else {
        // Wrong key - ignore
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [completed]);

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-full animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Tuyệt vời!</h2>
        <p className="text-gray-500 mb-8">Bạn đã bảo vệ thành công căn cứ.</p>
        <Button
          onClick={() => {
            unlearnedRef.current = [...cards];
            learnedRef.current = [];
            setCompleted(false);
            setWrongCardIds([]); wrongCardIdsRef.current = [];
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all active:scale-95"
        >
          <RotateCw className="w-5 h-5" />
          Chơi lại
        </Button>
        {completionActions}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col h-full relative overflow-hidden bg-gray-900 rounded-3xl border-4 border-gray-800 shadow-2xl">
      {/* Background stars */}
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "30px 30px" }} />

      {/* Top info */}
      <div className="absolute top-4 left-4 z-20 flex gap-4">
        <div className="bg-white/10 backdrop-blur text-white px-4 py-2 rounded-xl border border-white/20 flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-blue-400" />
          <span className="font-bold font-mono">
            Từ cần học: {unlearnedRef.current.length + meteorites.filter((m: any) => !m.isDecoy && !m.isExploding).length} / {cards.length}
          </span>
        </div>
      </div>

      {/* Settings */}
      <div className="absolute top-4 right-4 z-30 flex flex-col items-end gap-2">
        <Button onClick={() => setShowSettings(!showSettings)} className="bg-white/10 hover:bg-white/20 backdrop-blur text-white p-3 rounded-xl border border-white/20 transition-colors">
          <SettingsIcon className="w-5 h-5" />
        </Button>

        {showSettings && (
          <div className="bg-gray-800 border border-gray-700 p-4 rounded-2xl shadow-xl w-64 animate-in fade-in slide-in-from-top-2">
            <h3 className="text-white font-bold mb-4">Cài đặt trò chơi</h3>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm flex justify-between mb-1">
                  <span>Tốc độ rơi</span>
                  <span className="text-white font-bold">{Math.round(config.speedMultiplier * 100)}%</span>
                </label>
                <Input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={config.speedMultiplier}
                  onChange={(e) => setConfig({ ...config, speedMultiplier: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm flex justify-between mb-1">
                  <span>Khoảng cách sinh ra</span>
                  <span className="text-white font-bold">{config.spawnDelay / 1000}s</span>
                </label>
                <Input
                  type="range"
                  min="1"
                  max="6"
                  step="0.5"
                  value={config.spawnDelay / 1000}
                  onChange={(e) => setConfig({ ...config, spawnDelay: parseFloat(e.target.value) * 1000 })}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Game area */}
      <div ref={containerRef} className="flex-1 relative w-full h-full">
        {meteorites.map((meteor) => (
          <div
            key={meteor.id}
            className={cn("absolute flex flex-col items-center justify-center transition-transform", meteor.isExploding ? "z-50" : "")}
            style={{
              transform: `translate(${meteor.x}px, ${meteor.y}px)`,
              width: "150px",
            }}
          >
            {/* Meteorite Image or Explosion */}
            <div className={cn("relative w-24 h-24 mb-2 flex items-center justify-center", !meteor.isExploding && "animate-[spin_13s_linear_infinite]")}>
              {meteor.isExploding ? (
                <img src="/meteorite/explosion.gif" alt="Explosion" className="w-40 h-40 object-contain absolute z-10 scale-150" />
              ) : (
                <img
                  src={`/meteorite/${meteor.imageIndex}.png`}
                  alt="Meteorite"
                  className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(255,100,0,0.8)]"
                  onError={(e) => {
                    // Fallback if image doesn't exist
                    (e.target as HTMLElement).style.display = "none";
                    (e.target as HTMLElement).parentElement!.innerHTML =
                      '<div class="w-full h-full rounded-full bg-gradient-to-br from-orange-500 to-red-600 shadow-[0_0_20px_rgba(255,100,0,0.8)]"></div>';
                  }}
                />
              )}
            </div>

            {/* Word Display */}
            <div
              className={cn(
                "px-4 py-2 rounded-xl backdrop-blur-md border shadow-lg text-lg font-bold font-mono tracking-wider transition-opacity duration-300",
                meteor.isExploding ? "opacity-0" : "bg-gray-900/80 border-orange-500/50 text-white",
              )}
            >
              {/* Highlight typed characters */}
              {lockedTargetId === meteor.id && !meteor.isExploding ? (
                <>
                  <span className="text-orange-400">{meteor.card.term.substring(0, typedText.length)}</span>
                  <span className="opacity-70">{meteor.card.term.substring(typedText.length)}</span>
                </>
              ) : (
                <span className="text-white">{meteor.card.term}</span>
              )}
            </div>

            {/* Translation tooltip-like */}
            <div className={cn("mt-2 text-xs font-medium text-orange-200/80 bg-black/40 px-2 py-1 rounded transition-opacity duration-300", meteor.isExploding ? "opacity-0" : "")}>
              {meteor.card.translation}
            </div>
          </div>
        ))}

        {/* Base / Ground */}
        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-blue-900/80 to-transparent border-t-2 border-blue-500/30 flex items-end justify-center pb-2">
          <div className="text-blue-200/50 text-sm font-bold tracking-widest uppercase">Căn cứ ZENTASK</div>
        </div>
      </div>

      {/* Typing indicator (bottom center) */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20">
        <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl px-8 py-3 text-2xl font-mono text-white min-w-[200px] h-[60px] flex items-center justify-center">
          {typedText || <span className="text-white/30 text-sm tracking-widest">GÕ TỪ Ở ĐÂY...</span>}
          <span className="animate-pulse ml-1 w-2 h-6 bg-orange-500 inline-block"></span>
        </div>
      </div>
    </div>
  );
}
