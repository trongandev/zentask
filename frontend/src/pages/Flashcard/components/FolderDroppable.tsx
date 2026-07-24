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
      className={`${theme.bg} p-6 rounded-3xl border transition-all duration-200 ${activeOver ? "border-blue-500 shadow-lg ring-4 ring-blue-500/20 scale-[1.02]" : "border-gray-200"}`}
    >
      <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${theme.text}`}>
        <FolderIcon className={`${theme.text} ${theme.fill}`} /> {folder.name}
      </h2>
      <SortableContext items={setsInFolder.map((s: any) => s.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[150px]">
          {setsInFolder.length === 0 && (
            <div
              data-flashcard-dropzone={`folder-${folder.id}`}
              className={`col-span-full flex min-h-[120px] items-center justify-center rounded-2xl border-2 border-dashed font-medium transition-all ${activeOver ? "border-blue-400 bg-white text-blue-700" : "border-gray-300 text-gray-400"}`}
            >
              Kéo thả bộ thẻ vào đây
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
