import React from "react";
import { Folder as FolderIcon } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { SortableSetItem } from "./SortableSetItem";
import { FOLDER_THEMES } from "../../../lib/utils";

export function FolderDroppable({ folder, setsInFolder, onContextMenu, onSetClick, popoverId, setPopoverId, onEditSet, onDeleteSet, forceOver = false }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: `folder-${folder.id}`, data: { type: "folder", folder } });
  const activeOver = isOver || forceOver;

  const colorName = folder.color ? folder.color.replace("bg-", "") : "blue-500";
  const baseColor = colorName.split("-")[0];
  const theme = FOLDER_THEMES[baseColor] || FOLDER_THEMES.blue;

  return (
    <div
      ref={setNodeRef}
      data-flashcard-dropzone={`folder-${folder.id}`}
      onContextMenu={(e) => onContextMenu(e, "folder", folder)}
      className={`${theme.bg} p-8 rounded-[2.5rem] border border-white/50 shadow-sm transition-all duration-300 ${activeOver ? "border-blue-400 shadow-xl ring-4 ring-blue-400/20 scale-[1.01] bg-blue-50/80" : "hover:shadow-md"}`}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm ${theme.text}`}>
          <FolderIcon className={`w-6 h-6 ${theme.text} ${theme.fill}`} />
        </div>
        <h2 className={`text-2xl font-black tracking-tight ${theme.text}`}>{folder.name}</h2>
      </div>
      <SortableContext items={setsInFolder.map((s: any) => s.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[150px]">
          {setsInFolder.length === 0 && (
            <div
              data-flashcard-dropzone={`folder-${folder.id}`}
              className={`col-span-full flex min-h-[120px] items-center justify-center rounded-2xl border-2 border-dashed font-medium transition-all ${activeOver ? "border-blue-400 bg-white text-blue-700" : "border-gray-300 text-gray-400"}`}
            >
              Kéo thả bộ thẻ vào đây hoặc chuột phải vào đây để tạo bộ từ vựng mới
            </div>
          )}
          {setsInFolder.map((s: any) => (
            <SortableSetItem
              key={s.id}
              set={s}
              onClick={() => onSetClick(s)}
              onContextMenu={onContextMenu}
              popoverId={popoverId}
              setPopoverId={setPopoverId}
              onEdit={onEditSet}
              onDelete={onDeleteSet}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
