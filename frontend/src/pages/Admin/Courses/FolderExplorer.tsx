import React, { useState, useEffect } from "react";
import { Folder, FolderOpen, Book, FileText, ChevronRight, X, ArrowLeft, ArrowRight, Plus, Trash2, Edit } from "lucide-react";
import { useContextMenu } from "../../../hooks/useContextMenu";
import { useDroppable } from "@dnd-kit/core";

interface Props {
  node: { type: "root" | "course" | "rank" | "tier"; data: any };
  onNavigate: (type: "course" | "rank" | "tier" | "lesson", data: any) => void;
  onClose: () => void;
  canBack: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
  undo: () => void;
  handleCreateLesson: () => void;
  handleDeleteLesson: (id: string) => void;
  onRefresh?: () => void;
}

import axiosInstance from "../../../services/axiosConfig";
import toastService from "../../../services/toastService";
import { Button } from "@/src/components/ui/Button";

export function FolderExplorer({ node, onNavigate, onClose, canBack, canForward, onBack, onForward, undo, handleCreateLesson, handleDeleteLesson, onRefresh }: Props) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();

  // Droppable zone for tier
  const { setNodeRef, isOver } = useDroppable({
    id: `tier-${node.data.id || node.data._id}`,
    data: { type: "tier", tier: node.data },
    disabled: node.type !== "tier",
  });

  // Reset selection when node changes
  useEffect(() => {
    setSelectedItems([]);
  }, [node.data.id]);

  const getChildType = (parentType: string) => {
    switch (parentType) {
      case "root": return "course";
      case "course": return "rank";
      case "rank": return "tier";
      case "tier": return "lesson";
      default: return null;
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.ctrlKey && e.key === "a") {
        e.preventDefault();
        const children = getChildren();
        setSelectedItems(children.map((c: any) => c.id || c._id));
      } else if (e.ctrlKey && e.key === "c") {
        e.preventDefault();
        if (selectedItems.length > 0) {
          localStorage.setItem("zentask_admin_clipboard", JSON.stringify({ action: "copy", items: selectedItems, childType: getChildType(node.type) }));
          toastService.success(`Đã copy ${selectedItems.length} mục`);
        }
      } else if (e.ctrlKey && e.key === "x") {
        e.preventDefault();
        if (selectedItems.length > 0) {
          localStorage.setItem("zentask_admin_clipboard", JSON.stringify({ action: "cut", items: selectedItems, childType: getChildType(node.type) }));
          toastService.success(`Đã cắt ${selectedItems.length} mục`);
        }
      } else if (e.ctrlKey && e.key === "v") {
        e.preventDefault();
        const clipboard = localStorage.getItem("zentask_admin_clipboard");
        if (clipboard) {
          try {
            const parsed = JSON.parse(clipboard);
            const expectedChildType = getChildType(node.type);
            
            if (parsed.childType !== expectedChildType) {
               toastService.error("Không thể dán mục này vào thư mục hiện tại");
               return;
            }
            
            axiosInstance.post("/api/admin/courses/paste", {
               action: parsed.action,
               itemIds: parsed.items,
               targetParentId: node.data.id || node.data._id,
               childType: parsed.childType
            }).then(() => {
               toastService.success(`Đã dán ${parsed.items.length} mục thành công`);
               if (parsed.action === "cut") {
                  localStorage.removeItem("zentask_admin_clipboard");
               }
               if (onRefresh) onRefresh();
            }).catch(err => {
               toastService.error(err.response?.data?.error || "Lỗi khi dán dữ liệu");
            });
          } catch(err) {
            toastService.error("Dữ liệu trong clipboard không hợp lệ");
          }
        } else {
          toastService.error("Không có dữ liệu để dán");
        }
      } else if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItems, undo, node, onRefresh]);
  const renderBreadcrumbs = () => {
    let title = "Hệ thống Khóa học";
    if (node.type === "course") title = `Khóa học: ${node.data.name}`;
    if (node.type === "rank") title = `Rank ${node.data.name}`;
    if (node.type === "tier") title = `Tier ${node.data.tierNum} (${node.data.cefr})`;
    return <h2 className="text-xl font-bold text-slate-700">{title}</h2>;
  };

  const getChildren = () => {
    if (node.type === "root") return node.data.courses || [];
    if (node.type === "course") return node.data.ranks || [];
    if (node.type === "rank") return node.data.tiers || [];
    if (node.type === "tier") return node.data.lessons || [];
    return [];
  };

  const children = getChildren();

  const handleItemClick = (e: React.MouseEvent, item: any) => {
    if (e.ctrlKey) {
      setSelectedItems((prev) => (prev.includes(item.id || item._id) ? prev.filter((id) => id !== (item.id || item._id)) : [...prev, item.id || item._id]));
    } else {
      setSelectedItems([item.id || item._id]);
    }
  };

  const handleItemDoubleClick = (item: any) => {
    if (node.type === "root") onNavigate("course", item);
    else if (node.type === "course") onNavigate("rank", item);
    else if (node.type === "rank") onNavigate("tier", item);
    else if (node.type === "tier") onNavigate("lesson", item);
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 flex flex-col h-full p-8 select-none transition-all ${isOver ? "bg-blue-50/50 border-[3px] border-dashed border-blue-400 m-2 rounded-2xl shadow-inner" : "bg-white"}`}
      onClick={() => setSelectedItems([])} // Clear selection when clicking outside
      onContextMenu={(e) => {
        if (node.type === "tier") handleContextMenu(e, { action: "background" });
      }}
    >
      <div className="mb-8 border-b border-slate-100 pb-4 flex justify-between items-start">
        <div>
          <div className="flex gap-2 items-center mb-2">
            <Button onClick={onBack} disabled={!canBack} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md disabled:opacity-30">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Button onClick={onForward} disabled={!canForward} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md disabled:opacity-30">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
          {renderBreadcrumbs()}
          <p className="text-slate-500 mt-1">
            {children.length} mục con {selectedItems.length > 0 && `- Đang chọn ${selectedItems.length}`}
          </p>
        </div>
        <Button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
          <X className="w-6 h-6" />
        </Button>
      </div>

      {children.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <FolderOpen className="w-16 h-16 mb-4 text-slate-200" />
          <p>Thư mục trống</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 content-start">
          {children.map((item: any) => {
            const id = item.id || item._id;
            const isSelected = selectedItems.includes(id);
            return (
              <div
                key={id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleItemClick(e, item);
                }}
                onDoubleClick={() => {
                  handleItemDoubleClick(item);
                }}
                onContextMenu={(e) => {
                  e.stopPropagation();
                  if (node.type === "tier") handleContextMenu(e, { action: "item", data: item });
                }}
                className={`group flex flex-col items-center gap-3 p-4 rounded-xl cursor-pointer transition-all hover:scale-105 active:scale-95 border ${isSelected ? "bg-blue-50 border-blue-200" : "border-transparent hover:bg-slate-50 hover:border-slate-200"}`}
              >
                {node.type === "root" && (
                  <div className="relative">
                    <Folder className="w-14 h-14 text-indigo-400 group-hover:text-indigo-500" />
                    <img src={`/flag/${item.languageCode}.svg`} alt="flag" className="w-6 h-4 object-cover absolute bottom-0 right-[-4px]" />
                  </div>
                )}
                {node.type === "course" && <img src={`/rank/${item.rankId}.png`} alt={item.rankId} className="w-12 object-cover rounded-[2px]" />}
                {node.type === "rank" && (
                  <div className="relative">
                    <Folder className="w-14 h-14 text-amber-400 group-hover:text-amber-500" />
                    <img src={`/rank/${node.data.rankId}.png`} alt={node.data.rankId} className="w-6 object-cover absolute bottom-0 right-[-4px]" />
                  </div>
                )}
                {node.type === "tier" && <FileText className={`w-14 h-14 ${isSelected ? "text-blue-500" : "text-slate-400 group-hover:text-blue-500"}`} />}

                <span className={`font-semibold text-sm text-center line-clamp-2 ${isSelected ? "text-blue-700" : "text-slate-700"}`}>
                  {node.type === "root" && item.name}
                  {node.type === "course" && item.name}
                  {node.type === "rank" && `Tier ${item.tierNum}`}
                  {node.type === "tier" && item.title}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div className="fixed bg-white border border-slate-200 shadow-xl rounded-lg py-1 w-48 z-50 overflow-hidden" style={{ top: contextMenu.y, left: contextMenu.x }}>
          {contextMenu.data.action === "background" && (
            <Button
              className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
              onClick={() => {
                handleCreateLesson();
                closeContextMenu();
              }}
            >
              <Plus className="w-4 h-4" /> Thêm chủ đề mới
            </Button>
          )}

          {contextMenu.data.action === "item" && (
            <>
              <Button
                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                onClick={() => {
                  onNavigate("lesson", contextMenu.data.data);
                  closeContextMenu();
                }}
              >
                <Edit className="w-4 h-4" /> Chỉnh sửa
              </Button>
              <Button
                className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                onClick={() => {
                  handleDeleteLesson(contextMenu.data.data.id);
                  closeContextMenu();
                }}
              >
                <Trash2 className="w-4 h-4" /> Xóa
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
