import React, { useEffect, useState } from "react";
import { Clock, ChevronRight, GraduationCap } from "lucide-react";
import { useFlashcardStore } from "../../services/flashcardService";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";

export function DueFlashcards() {
  const { getDueCards } = useFlashcardStore();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCards = async () => {
      const data = await getDueCards();
      setCards(data || []);
      setLoading(false);
    };
    fetchCards();
  }, [getDueCards]);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-gray-100 h-full shadow-sm flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 flex flex-col h-full shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg">Từ vựng cần ôn tập</h3>
        </div>
        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">{cards.length > 0 ? `${cards.length} từ` : "Đã xong"}</span>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-6 custom-scrollbar">
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center h-full text-gray-500 space-y-3 py-8">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-2">
              <GraduationCap className="w-8 h-8 text-gray-400" />
            </div>
            <p className="font-medium text-sm">
              Bạn đã ôn tập xong tất cả từ vựng.
              <br />
              Tuyệt vời!
            </p>
          </div>
        ) : (
          cards.map((card, idx) => (
            <div
              key={card.id}
              className="group p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors flex items-center justify-between cursor-pointer"
              onClick={() => navigate(`/flashcard/practice/${card.progress.setId}`)}
            >
              <div>
                <h4 className="font-bold text-gray-900 text-base">{card.term}</h4>
                <p className="text-sm text-gray-500 group-hover:text-gray-700 blur-[3px] group-hover:blur-none transition-all duration-300 select-none">{card.translation}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
            </div>
          ))
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-gray-100">
        <button
          onClick={() => navigate("/flashcards")}
          className={cn(
            "w-full py-3.5 flex items-center justify-center gap-2 text-sm font-bold rounded-xl transition-all",
            cards.length > 0 ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20" : "bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200",
          )}
        >
          {cards.length > 0 ? "Ôn tập ngay" : "Đi tới bộ thẻ của bạn"}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
