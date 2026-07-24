import React from "react";
import { BookOpen, MoreVertical, Lock, Globe2, Clock, Play } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LANG_MAP, getFlashcardTimeAgo } from "../../../lib/utils";
import { Button } from "@/src/components/ui/Button";

export function SortableSetItem({ set, onClick, onContextMenu, onMoreClick, popoverId, setPopoverId, onEdit, onDelete }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: set.id, data: { type: "set", set } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 99 : 1,
  };

  const cardCount = set.cardCount || 0;
  const knownCount = set.knownCount || 0;
  const almostCount = set.almostCount || 0;
  const knownPct = cardCount > 0 ? (knownCount / cardCount) * 100 : 0;
  const almostPct = cardCount > 0 ? (almostCount / cardCount) * 100 : 0;
  const progress = cardCount > 0 ? (set.learnedCount / cardCount) * 100 : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onContextMenu={(e) => onContextMenu(e, "set", set)}
      onClick={onClick}
      className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full group cursor-pointer relative overflow-hidden"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl ${set.color || "bg-blue-500"} flex items-center justify-center text-white shadow-sm`}>
          <BookOpen className="w-6 h-6" />
        </div>
        <div className="relative">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setPopoverId(popoverId === set.id ? null : set.id);
            }}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </Button>

          {popoverId === set.id && (
            <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 overflow-hidden">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  setPopoverId(null);
                  onEdit(set);
                }}
                className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Sửa & Đổi màu
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  setPopoverId(null);
                  onDelete(set);
                }}
                className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                Xóa
              </Button>
            </div>
          )}
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">{set.title}</h3>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${set.isPublic === false ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-600"}`}>
          {set.isPublic === false ? <Lock className="w-3 h-3" /> : <Globe2 className="w-3 h-3" />}
          {set.isPublic === false ? "Riêng tư" : "Công khai"}
        </span>
        {set.categoryName && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600">{set.categoryName}</span>}
        {set.language && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-600">{LANG_MAP[set.language || "en"] || set.language.toUpperCase()}</span>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 font-medium">
        <span className="flex items-center gap-1.5">
          <BookOpen className="w-4 h-4" />
          {set.cardCount} thẻ
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          {getFlashcardTimeAgo(set.lastStudied)}
        </span>
      </div>

      <div className="mt-auto">
        <div className="flex justify-between text-xs font-bold text-gray-700 mb-2">
          <span>Tiến độ</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-3 flex">
          <div className="bg-green-500 h-full transition-all" style={{ width: `${knownPct}%` }} title={`Đã nhớ: ${knownCount}`}></div>
          <div className="bg-yellow-400 h-full transition-all" style={{ width: `${almostPct}%` }} title={`Gần nhớ: ${almostCount}`}></div>
        </div>
        <div className="flex justify-between text-[10px] font-semibold text-gray-500 mb-4 px-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div> Đã nhớ ({knownCount})
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-400"></div> Gần nhớ ({almostCount})
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-200"></div> Chưa nhớ ({Math.max(0, cardCount - knownCount - almostCount)})
          </div>
        </div>
        <Button className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors pointer-events-none">
          <Play className="w-4 h-4 fill-current" />
          {cardCount === 0 ? "Thêm thẻ" : progress === 0 ? "Bắt đầu học" : progress === 100 ? "Ôn tập lại" : "Tiếp tục học"}
        </Button>
      </div>

      {set.isNew && <div className="absolute top-4 right-4 bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-md">MỚI</div>}
    </div>
  );
}
