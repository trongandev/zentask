import React, { useState, useEffect } from "react";
import { cn } from "../../../lib/utils";
import { Shuffle } from "lucide-react";

interface Round7WordBuilderProps {
  currentWord: any;
  isCorrect: boolean | null;
  onCheckAnswer: (answer: string, correct: boolean) => void;
}

const DraggableItem = ({ id, text, index, moveItem, isUsed, onClick }: any) => {
  return (
    <button
      onClick={() => onClick(id, text)}
      disabled={isUsed}
      className={cn(
        "px-4 py-2 rounded-xl text-lg font-bold transition-all shadow-sm border-2",
        isUsed ? "bg-slate-100 text-transparent border-transparent cursor-not-allowed" : "bg-white text-slate-800 border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer",
      )}
    >
      {text}
    </button>
  );
};

export function Round7WordBuilder({ currentWord, isCorrect, onCheckAnswer }: Round7WordBuilderProps) {
  const [parts, setParts] = useState<{ id: string; text: string }[]>([]);
  const [selectedParts, setSelectedParts] = useState<{ id: string; text: string }[]>([]);

  useEffect(() => {
    if (!currentWord) return;
    const targetText = (currentWord.examples?.[0]?.en || currentWord.example?.[0]?.en || currentWord.term).trim();
    const isPhrase = targetText.includes(" ");

    let splitParts: string[] = [];
    if (isPhrase) {
      splitParts = targetText.split(/\s+/);
    } else {
      splitParts = Array.from(targetText);
    }

    const initialParts = splitParts
      .map((text, index) => ({
        id: `part-${index}-${text}`,
        text,
      }))
      .sort(() => Math.random() - 0.5);

    setParts(initialParts);
    setSelectedParts([]);
  }, [currentWord]);

  const handleSelectPart = (id: string, text: string) => {
    if (isCorrect !== null) return;
    setSelectedParts((prev) => [...prev, { id, text }]);
  };

  const handleRemovePart = (indexToRemove: number) => {
    if (isCorrect !== null) return;
    setSelectedParts((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleCheck = () => {
    const targetText = (currentWord.examples?.[0]?.en || currentWord.example?.[0]?.en || currentWord.term).trim();
    const isPhrase = targetText.includes(" ");
    const userAnswer = selectedParts.map((p) => p.text).join(isPhrase ? " " : "");
    const correct = userAnswer === targetText;
    onCheckAnswer(userAnswer, correct);
  };

  // Auto-check when all parts are selected
  useEffect(() => {
    if (selectedParts.length === parts.length && parts.length > 0 && isCorrect === null) {
      handleCheck();
    }
  }, [selectedParts, parts, isCorrect]);

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto gap-8 animate-in fade-in zoom-in duration-500">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-slate-800 mb-2">Sắp xếp lại</h3>
        <p className="text-slate-500">
          Nhấn vào các phần tử bên dưới để tạo thành từ/câu có nghĩa:{" "}
          <span className="font-bold text-blue-600">{currentWord.examples?.[0]?.vi || currentWord.example?.[0]?.vi || currentWord.translation}</span>
        </p>
      </div>

      {/* Answer Area */}
      <div className="w-full min-h-[80px] p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 flex flex-wrap gap-2 items-center justify-center">
        {selectedParts.length === 0 && <span className="text-slate-400">Kết quả của bạn sẽ hiển thị ở đây...</span>}
        {selectedParts.map((part, index) => (
          <button
            key={`${part.id}-selected-${index}`}
            onClick={() => handleRemovePart(index)}
            disabled={isCorrect !== null}
            className={cn(
              "px-4 py-2 rounded-xl text-lg font-bold bg-blue-500 text-white shadow-md transition-all hover:bg-blue-600 hover:scale-105",
              isCorrect === true && "bg-green-500 hover:bg-green-500 cursor-default",
              isCorrect === false && "bg-red-500 hover:bg-red-500 cursor-default",
            )}
          >
            {part.text}
          </button>
        ))}
      </div>

      {/* Selection Area */}
      <div className="flex flex-wrap gap-3 justify-center">
        {parts.map((part, index) => {
          const isUsed = selectedParts.some((p) => p.id === part.id);
          return <DraggableItem key={part.id} id={part.id} text={part.text} index={index} isUsed={isUsed} onClick={handleSelectPart} />;
        })}
      </div>

      {/* Action buttons (optional reset) */}
      {selectedParts.length > 0 && isCorrect === null && (
        <button onClick={() => setSelectedParts([])} className="text-sm font-semibold text-slate-400 hover:text-slate-600 flex items-center gap-1">
          <Shuffle className="w-4 h-4" /> Làm lại
        </button>
      )}
    </div>
  );
}
