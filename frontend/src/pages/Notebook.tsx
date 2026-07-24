import React, { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Cloud,
  Copy as CopyIcon,
  Download,
  Eraser,
  Highlighter,
  ImagePlus,
  LayoutGrid,
  Loader2,
  MousePointer2,
  NotebookPen,
  Pencil,
  Plus,
  Redo2,
  Save,
  Sparkles,
  StickyNote,
  Trash2,
  Type,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import toastService from "@/src/services/toastService";
import { NotebookBackground, NotebookDocument, NotebookItem, NotebookPageData, NotebookStroke, NotebookTool, notebookService } from "../services/notebookService";
import { Button } from "@/src/components/ui/Button";
import { Select } from "@/src/components/ui/Select";
import { Input } from "@/src/components/ui/Input";
import { Textarea } from "@/src/components/ui/Textarea";

const BOARD_WIDTH = 1200;
const BOARD_HEIGHT = 760;
const DEFAULT_COLORS = ["#111827", "#2563eb", "#dc2626", "#16a34a", "#9333ea", "#f97316", "#facc15"];
const STICKY_COLORS = ["#fff7ad", "#dbeafe", "#dcfce7", "#fce7f3", "#ede9fe", "#ffedd5"];

function uid(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clonePages(pages: NotebookPageData[]) {
  return JSON.parse(JSON.stringify(pages)) as NotebookPageData[];
}

function createBlankPage(index: number): NotebookPageData {
  return {
    id: uid("page"),
    title: `Trang ${index + 1}`,
    background: "grid",
    strokes: [],
    items: [],
  };
}

function createDefaultPayload(title = "Sổ tay mới") {
  const firstPage = createBlankPage(0);
  return {
    title,
    description: "",
    coverColor: "#2563eb",
    activePageId: firstPage.id,
    pages: [firstPage],
    settings: { boardWidth: BOARD_WIDTH, boardHeight: BOARD_HEIGHT },
  };
}

function isValidMediaUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function getMediaType(url: string): "image" | "gif" {
  const cleanUrl = url.split("?")[0].toLowerCase();
  return cleanUrl.endsWith(".gif") ? "gif" : "image";
}

function getBackgroundStyle(background: NotebookBackground): CSSProperties {
  if (background === "grid") {
    return {
      backgroundColor: "#ffffff",
      backgroundImage: "linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)",
      backgroundSize: "32px 32px",
    };
  }

  if (background === "dots") {
    return {
      backgroundColor: "#ffffff",
      backgroundImage: "radial-gradient(#cbd5e1 1.3px, transparent 1.3px)",
      backgroundSize: "26px 26px",
    };
  }

  if (background === "line") {
    return {
      backgroundColor: "#ffffff",
      backgroundImage: "linear-gradient(#dbeafe 1px, transparent 1px)",
      backgroundSize: "100% 38px",
    };
  }

  return { backgroundColor: "#ffffff" };
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: NotebookStroke) {
  if (!stroke.points.length) return;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = stroke.width;
  ctx.globalAlpha = stroke.opacity;
  ctx.strokeStyle = stroke.color;
  ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";

  ctx.beginPath();
  const [first, ...rest] = stroke.points;
  ctx.moveTo(first.x, first.y);

  if (rest.length === 0) {
    ctx.lineTo(first.x + 0.1, first.y + 0.1);
  } else {
    for (let i = 0; i < rest.length; i += 1) {
      const current = rest[i];
      const previous = stroke.points[i];
      const midX = (previous.x + current.x) / 2;
      const midY = (previous.y + current.y) / 2;
      ctx.quadraticCurveTo(previous.x, previous.y, midX, midY);
    }
  }

  ctx.stroke();
  ctx.restore();
}

interface DragState {
  id: string;
  mode: "move" | "resize";
  startClientX: number;
  startClientY: number;
  origin: NotebookItem;
}

function ToolButton({ active, icon: Icon, label, onClick }: { active?: boolean; icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-all ${
        active ? "border-blue-500 bg-blue-50 text-blue-600 shadow-sm" : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-blue-600"
      }`}
    >
      <Icon className="h-5 w-5" />
    </Button>
  );
}

export default function Notebook() {
  const [notebooks, setNotebooks] = useState<NotebookDocument[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<string>("");
  const [title, setTitle] = useState("Sổ tay mới");
  const [pages, setPages] = useState<NotebookPageData[]>([createBlankPage(0)]);
  const [activePageId, setActivePageId] = useState<string>("");
  const [tool, setTool] = useState<NotebookTool>("pen");
  const [color, setColor] = useState("#2563eb");
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [zoom, setZoom] = useState(0.82);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Đang mở sổ tay...");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<NotebookStroke | null>(null);
  const historyRef = useRef<NotebookPageData[][]>([]);
  const futureRef = useRef<NotebookPageData[][]>([]);
  const dragRef = useRef<DragState | null>(null);
  const hydratedRef = useRef(false);
  const autosaveTimerRef = useRef<number | null>(null);

  const activePage = useMemo(() => pages.find((page) => page.id === activePageId) || pages[0], [pages, activePageId]);
  const selectedItem = useMemo(() => activePage?.items.find((item) => item.id === selectedItemId) || null, [activePage, selectedItemId]);

  const payload = useMemo(
    () => ({
      title,
      description: "",
      coverColor: "#2563eb",
      activePageId: activePage?.id || activePageId,
      pages,
      settings: { boardWidth: BOARD_WIDTH, boardHeight: BOARD_HEIGHT },
    }),
    [activePage?.id, activePageId, pages, title],
  );

  const loadNotebooks = useCallback(async () => {
    setLoading(true);
    const result = await notebookService.list();
    setNotebooks(result);

    if (result.length) {
      const first = result[0];
      setActiveNotebookId(first.id);
      setTitle(first.title);
      setPages(first.pages.length ? first.pages : [createBlankPage(0)]);
      setActivePageId(first.activePageId || first.pages[0]?.id || "");
      setSaveStatus("Đã mở sổ tay");
    } else {
      const blank = createDefaultPayload("Sổ tay đầu tiên");
      setActiveNotebookId("");
      setTitle(blank.title);
      setPages(blank.pages);
      setActivePageId(blank.activePageId);
      setSaveStatus("Sổ tay mới chưa lưu");
    }

    historyRef.current = [];
    futureRef.current = [];
    setSelectedItemId(null);
    setLoading(false);
    window.setTimeout(() => {
      hydratedRef.current = true;
    }, 400);
  }, []);

  useEffect(() => {
    void loadNotebooks();
  }, [loadNotebooks]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activePage) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    activePage.strokes.forEach((stroke) => drawStroke(ctx, stroke));
  }, [activePage]);

  useEffect(() => {
    if (!hydratedRef.current || !activeNotebookId) return;

    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    setSaveStatus("Sắp tự lưu...");

    autosaveTimerRef.current = window.setTimeout(async () => {
      setSaving(true);
      setSaveStatus("Đang lưu...");
      const saved = await notebookService.update(activeNotebookId, payload, false);
      if (saved) {
        setSaveStatus("Đã lưu tự động");
        setNotebooks((prev) => prev.map((item) => (item.id === saved.id ? { ...item, title: saved.title, updatedAt: saved.updatedAt, pages: saved.pages, activePageId: saved.activePageId } : item)));
      } else {
        setSaveStatus("Lưu thất bại");
      }
      setSaving(false);
    }, 1200);

    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    };
  }, [activeNotebookId, payload]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const deltaX = (event.clientX - drag.startClientX) / zoom;
      const deltaY = (event.clientY - drag.startClientY) / zoom;

      setPages((prev) =>
        prev.map((page) => {
          if (page.id !== activePage?.id) return page;
          return {
            ...page,
            items: page.items.map((item) => {
              if (item.id !== drag.id) return item;
              if (drag.mode === "resize") {
                return {
                  ...item,
                  width: Math.max(80, Math.min(BOARD_WIDTH - item.x, drag.origin.width + deltaX)),
                  height: Math.max(60, Math.min(BOARD_HEIGHT - item.y, drag.origin.height + deltaY)),
                };
              }
              return {
                ...item,
                x: Math.max(0, Math.min(BOARD_WIDTH - item.width, drag.origin.x + deltaX)),
                y: Math.max(0, Math.min(BOARD_HEIGHT - item.height, drag.origin.y + deltaY)),
              };
            }),
          };
        }),
      );
    };

    const onPointerUp = () => {
      dragRef.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [activePage?.id, zoom]);

  const pushHistory = useCallback(() => {
    historyRef.current = [...historyRef.current, clonePages(pages)].slice(-50);
    futureRef.current = [];
  }, [pages]);

  const updateActivePage = useCallback(
    (updater: (page: NotebookPageData) => NotebookPageData) => {
      setPages((prev) => prev.map((page) => (page.id === activePageId ? updater(page) : page)));
    },
    [activePageId],
  );

  const getCanvasPoint = useCallback(
    (event: React.PointerEvent) => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: Math.max(0, Math.min(BOARD_WIDTH, (event.clientX - rect.left) / zoom)),
        y: Math.max(0, Math.min(BOARD_HEIGHT, (event.clientY - rect.top) / zoom)),
      };
    },
    [zoom],
  );

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!["pen", "highlighter", "eraser"].includes(tool)) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pushHistory();

    const point = getCanvasPoint(event);
    const stroke: NotebookStroke = {
      id: uid("stroke"),
      tool: tool as "pen" | "highlighter" | "eraser",
      color,
      width: tool === "eraser" ? strokeWidth * 3 : tool === "highlighter" ? strokeWidth * 3.5 : strokeWidth,
      opacity: tool === "highlighter" ? 0.34 : 1,
      points: [point],
    };

    currentStrokeRef.current = stroke;
    isDrawingRef.current = true;
    updateActivePage((page) => ({ ...page, strokes: [...page.strokes, stroke] }));
  };

  const drawMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;

    const point = getCanvasPoint(event);
    const stroke = currentStrokeRef.current;
    const last = stroke.points[stroke.points.length - 1];

    if (Math.hypot(point.x - last.x, point.y - last.y) < 1.8) return;

    stroke.points.push(point);
    updateActivePage((page) => ({
      ...page,
      strokes: page.strokes.map((item) => (item.id === stroke.id ? { ...stroke, points: [...stroke.points] } : item)),
    }));
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    currentStrokeRef.current = null;
  };

  const handleManualSave = async () => {
    setSaving(true);
    setSaveStatus("Đang lưu...");

    if (!activeNotebookId) {
      const created = await notebookService.create(payload);
      if (created) {
        setActiveNotebookId(created.id);
        setNotebooks((prev) => [created, ...prev]);
        setSaveStatus("Đã lưu");
      }
      setSaving(false);
      return;
    }

    const saved = await notebookService.update(activeNotebookId, payload, true);
    if (saved) setSaveStatus("Đã lưu");
    setSaving(false);
  };

  const createNotebook = async () => {
    hydratedRef.current = false;
    const nextPayload = createDefaultPayload(`Sổ tay ${notebooks.length + 1}`);
    const created = await notebookService.create(nextPayload);
    if (!created) return;

    setNotebooks((prev) => [created, ...prev]);
    setActiveNotebookId(created.id);
    setTitle(created.title);
    setPages(created.pages);
    setActivePageId(created.activePageId);
    setSelectedItemId(null);
    historyRef.current = [];
    futureRef.current = [];
    setSaveStatus("Đã lưu");
    window.setTimeout(() => {
      hydratedRef.current = true;
    }, 250);
  };

  const openNotebook = async (id: string) => {
    if (id === activeNotebookId) return;
    hydratedRef.current = false;
    setLoading(true);
    const notebook = await notebookService.get(id);
    if (notebook) {
      setActiveNotebookId(notebook.id);
      setTitle(notebook.title);
      setPages(notebook.pages.length ? notebook.pages : [createBlankPage(0)]);
      setActivePageId(notebook.activePageId || notebook.pages[0]?.id || "");
      setSelectedItemId(null);
      historyRef.current = [];
      futureRef.current = [];
      setSaveStatus("Đã mở sổ tay");
    }
    setLoading(false);
    window.setTimeout(() => {
      hydratedRef.current = true;
    }, 300);
  };

  const deleteNotebook = async () => {
    if (!activeNotebookId) return;
    if (!window.confirm("Xóa sổ tay này? Hành động này không thể hoàn tác.")) return;
    const ok = await notebookService.remove(activeNotebookId);
    if (!ok) return;
    const remaining = notebooks.filter((item) => item.id !== activeNotebookId);
    setNotebooks(remaining);
    if (remaining[0]) {
      await openNotebook(remaining[0].id);
    } else {
      const blank = createDefaultPayload("Sổ tay mới");
      setActiveNotebookId("");
      setTitle(blank.title);
      setPages(blank.pages);
      setActivePageId(blank.activePageId);
      setSelectedItemId(null);
    }
  };

  const addPage = () => {
    pushHistory();
    const page = createBlankPage(pages.length);
    setPages((prev) => [...prev, page]);
    setActivePageId(page.id);
    setSelectedItemId(null);
  };

  const duplicatePage = () => {
    if (!activePage) return;
    pushHistory();
    const page = { ...JSON.parse(JSON.stringify(activePage)), id: uid("page"), title: `${activePage.title} bản sao` } as NotebookPageData;
    setPages((prev) => [...prev, page]);
    setActivePageId(page.id);
  };

  const deletePage = () => {
    if (!activePage || pages.length <= 1) {
      toastService.error("Sổ tay cần ít nhất 1 trang.");
      return;
    }
    pushHistory();
    const nextPages = pages.filter((page) => page.id !== activePage.id);
    setPages(nextPages);
    setActivePageId(nextPages[0].id);
    setSelectedItemId(null);
  };

  const updatePageTitle = (pageId: string, value: string) => {
    setPages((prev) => prev.map((page) => (page.id === pageId ? { ...page, title: value } : page)));
  };

  const setPageBackground = (background: NotebookBackground) => {
    pushHistory();
    updateActivePage((page) => ({ ...page, background }));
  };

  const addSticky = () => {
    pushHistory();
    const item: NotebookItem = {
      id: uid("sticky"),
      type: "sticky",
      x: 180,
      y: 130,
      width: 240,
      height: 170,
      content: "Ghi chú mới...",
      color: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)],
      textColor: "#334155",
      fontSize: 20,
      zIndex: Date.now(),
    };
    updateActivePage((page) => ({ ...page, items: [...page.items, item] }));
    setSelectedItemId(item.id);
    setTool("select");
  };

  const addText = () => {
    pushHistory();
    const item: NotebookItem = {
      id: uid("text"),
      type: "text",
      x: 220,
      y: 220,
      width: 320,
      height: 90,
      content: "Nhập nội dung...",
      color: "transparent",
      textColor: "#0f172a",
      fontSize: 28,
      zIndex: Date.now(),
    };
    updateActivePage((page) => ({ ...page, items: [...page.items, item] }));
    setSelectedItemId(item.id);
    setTool("select");
  };

  const addMediaFromUrl = () => {
    const trimmed = imageUrl.trim();
    if (!isValidMediaUrl(trimmed)) {
      toastService.error("Đường dẫn ảnh chưa hợp lệ.");
      return;
    }

    pushHistory();
    const item: NotebookItem = {
      id: uid("media"),
      type: getMediaType(trimmed),
      x: 250,
      y: 150,
      width: 360,
      height: 240,
      url: trimmed,
      zIndex: Date.now(),
    };
    updateActivePage((page) => ({ ...page, items: [...page.items, item] }));
    setSelectedItemId(item.id);
    setImageUrl("");
    setShowImagePanel(false);
    setTool("select");
    toastService.success(item.type === "gif" ? "Đã thêm ảnh động" : "Đã thêm hình ảnh");
  };

  const updateItem = (itemId: string, updater: (item: NotebookItem) => NotebookItem) => {
    updateActivePage((page) => ({ ...page, items: page.items.map((item) => (item.id === itemId ? updater(item) : item)) }));
  };

  const deleteSelectedItem = () => {
    if (!selectedItemId) return;
    pushHistory();
    updateActivePage((page) => ({ ...page, items: page.items.filter((item) => item.id !== selectedItemId) }));
    setSelectedItemId(null);
  };

  const duplicateSelectedItem = () => {
    if (!selectedItem) return;
    pushHistory();
    const next = { ...selectedItem, id: uid("item"), x: selectedItem.x + 28, y: selectedItem.y + 28, zIndex: Date.now() };
    updateActivePage((page) => ({ ...page, items: [...page.items, next] }));
    setSelectedItemId(next.id);
  };

  const bringSelectedToFront = () => {
    if (!selectedItemId) return;
    updateItem(selectedItemId, (item) => ({ ...item, zIndex: Date.now() }));
  };

  const clearPage = () => {
    if (!window.confirm("Xóa toàn bộ nét vẽ và vật thể trên trang này?")) return;
    pushHistory();
    updateActivePage((page) => ({ ...page, strokes: [], items: [] }));
    setSelectedItemId(null);
  };

  const undo = () => {
    const previous = historyRef.current.pop();
    if (!previous) return;
    futureRef.current.push(clonePages(pages));
    setPages(previous);
    setSelectedItemId(null);
  };

  const redo = () => {
    const next = futureRef.current.pop();
    if (!next) return;
    historyRef.current.push(clonePages(pages));
    setPages(next);
    setSelectedItemId(null);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9\-_]+/gi, "-") || "zentask-notebook"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const startItemDrag = (event: React.PointerEvent, item: NotebookItem, mode: "move" | "resize") => {
    if (tool !== "select") return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedItemId(item.id);
    pushHistory();
    dragRef.current = {
      id: item.id,
      mode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      origin: { ...item },
    };
  };

  const boardCursor = useMemo(() => {
    if (tool === "eraser") return "cursor-cell";
    if (tool === "pen" || tool === "highlighter") return "cursor-crosshair";
    return "cursor-default";
  }, [tool]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <Loader2 className="mx-auto mb-3 h-9 w-9 animate-spin text-blue-600" />
          <p className="font-semibold text-slate-700">Đang mở sổ tay...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-96px)] min-h-0 gap-3 overflow-hidden sm:h-[calc(100vh-112px)] xl:gap-5">
      <aside className="hidden w-[280px] shrink-0 flex-col rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm xl:flex">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-500">Zentask</p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">Sổ tay</h2>
          </div>
          <Button onClick={createNotebook} className="rounded-2xl bg-blue-600 p-2.5 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-2 overflow-y-auto pr-1">
          {notebooks.map((notebook) => (
            <Button
              key={notebook.id}
              onClick={() => void openNotebook(notebook.id)}
              className={`w-full rounded-2xl border p-3 text-left transition ${
                notebook.id === activeNotebookId ? "border-blue-200 bg-blue-50" : "border-slate-100 bg-slate-50 hover:border-blue-100 hover:bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                  <NotebookPen className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">{notebook.title}</p>
                  <p className="text-xs text-slate-400">{notebook.pages.length || 1} trang</p>
                </div>
              </div>
            </Button>
          ))}
        </div>

        <div className="mt-auto rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 text-sm text-blue-900">
          <div className="mb-2 flex items-center gap-2 font-bold">
            <Sparkles className="h-4 w-4" />
            Tính năng đã có
          </div>
          <p className="text-xs leading-relaxed text-blue-800/80">
            Vẽ, tẩy, bút đánh dấu, ghi chú màu, hộp chữ, thêm ảnh hoặc ảnh động bằng đường dẫn, kéo thả, đổi kích thước, nhiều trang và tự lưu an toàn.
          </p>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-sm xl:rounded-[28px]">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 xl:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">Zentask</p>
              <h2 className="truncate text-base font-extrabold text-slate-900">Quản lý sổ tay</h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                onClick={createNotebook}
                className="flex items-center gap-1 rounded-2xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Mới
              </Button>
              <Button
                type="button"
                onClick={() => void deleteNotebook()}
                disabled={!activeNotebookId}
                className="rounded-2xl bg-white p-2 text-slate-500 shadow-sm hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                title="Xóa sổ tay"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={activeNotebookId || ""}
              onChange={(event) => {
                if (event.target.value) void openNotebook(event.target.value);
              }}
              className="min-w-0 flex-1 rounded-2xl border border-blue-100 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-300"
            >
              {notebooks.length === 0 && <option value="">Sổ tay mới chưa lưu</option>}
              {notebooks.map((notebook) => (
                <option key={notebook.id} value={notebook.id}>
                  {notebook.title} · {notebook.pages.length || 1} trang
                </option>
              ))}
            </Select>
            <Button type="button" onClick={handleManualSave} className="flex shrink-0 items-center gap-1 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-blue-600 shadow-sm hover:bg-blue-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu
            </Button>
          </div>
        </div>

        <header className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3 sm:p-4">
          <div className="min-w-[240px] flex-1">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-2xl border border-transparent bg-slate-50 px-4 py-2.5 text-lg font-extrabold text-slate-900 outline-none transition focus:border-blue-200 focus:bg-white"
              placeholder="Tên sổ tay"
            />
            <div className="mt-1 flex items-center gap-2 px-1 text-xs text-slate-500">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Cloud className="h-3.5 w-3.5" />}
              <span>{saveStatus}</span>
              {activeNotebookId && !saving && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
            </div>
          </div>

          <div className="flex max-w-full items-center gap-2 overflow-x-auto rounded-2xl bg-slate-50 p-1.5">
            <ToolButton active={tool === "select"} icon={MousePointer2} label="Chọn / kéo thả" onClick={() => setTool("select")} />
            <ToolButton active={tool === "pen"} icon={Pencil} label="Bút vẽ" onClick={() => setTool("pen")} />
            <ToolButton active={tool === "highlighter"} icon={Highlighter} label="Bút đánh dấu" onClick={() => setTool("highlighter")} />
            <ToolButton active={tool === "eraser"} icon={Eraser} label="Tẩy" onClick={() => setTool("eraser")} />
            <ToolButton icon={StickyNote} label="Ghi chú màu" onClick={addSticky} />
            <ToolButton icon={Type} label="Thêm hộp chữ" onClick={addText} />
            <ToolButton active={showImagePanel} icon={ImagePlus} label="Thêm ảnh/ảnh động bằng đường dẫn" onClick={() => setShowImagePanel((value) => !value)} />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={undo} className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-500 hover:text-blue-600" title="Hoàn tác">
              <Undo2 className="h-5 w-5" />
            </Button>
            <Button onClick={redo} className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-500 hover:text-blue-600" title="Làm lại">
              <Redo2 className="h-5 w-5" />
            </Button>
            <Button onClick={handleManualSave} className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu
            </Button>
          </div>
        </header>

        {showImagePanel && (
          <div className="flex flex-wrap items-center gap-3 border-b border-blue-100 bg-blue-50/60 px-4 py-3">
            <ImagePlus className="h-5 w-5 text-blue-600" />
            <Input
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addMediaFromUrl();
              }}
              className="min-w-[260px] flex-1 rounded-2xl border border-blue-100 bg-white px-4 py-2 text-sm outline-none focus:border-blue-300"
              placeholder="Dán đường dẫn hình ảnh hoặc ảnh động, ví dụ https://.../image.gif"
            />
            <Button onClick={addMediaFromUrl} className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
              Thêm vào trang
            </Button>
            <Button onClick={() => setShowImagePanel(false)} className="rounded-2xl p-2 text-blue-700 hover:bg-blue-100">
              <X className="h-5 w-5" />
            </Button>
          </div>
        )}

        <div className="border-b border-slate-100 bg-slate-50/80 p-3 lg:hidden">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-slate-700">Các trang</h3>
              <p className="truncate text-[11px] text-slate-400">
                {activePage?.title || "Trang hiện tại"} · {activePage?.strokes.length || 0} nét · {activePage?.items.length || 0} vật thể
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button onClick={addPage} className="rounded-xl bg-white p-2 text-blue-600 shadow-sm hover:bg-blue-50" title="Thêm trang">
                <Plus className="h-4 w-4" />
              </Button>
              <Button onClick={duplicatePage} className="rounded-xl bg-white p-2 text-slate-500 shadow-sm hover:text-blue-600" title="Nhân bản trang">
                <CopyIcon className="h-4 w-4" />
              </Button>
              <Button onClick={deletePage} className="rounded-xl bg-white p-2 text-slate-500 shadow-sm hover:text-red-600" title="Xóa trang">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {pages.map((page, index) => (
              <Button
                key={page.id}
                type="button"
                onClick={() => {
                  setActivePageId(page.id);
                  setSelectedItemId(null);
                }}
                className={`min-w-[96px] rounded-2xl border px-3 py-2 text-left shadow-sm transition ${
                  page.id === activePage?.id ? "border-blue-200 bg-white text-blue-700" : "border-transparent bg-white/70 text-slate-600"
                }`}
              >
                <div className="text-xs font-extrabold">Trang {index + 1}</div>
                <div className="truncate text-[10px] text-slate-400">{page.title}</div>
              </Button>
            ))}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[210px_1fr]">
          <aside className="hidden border-r border-slate-100 bg-slate-50/70 p-3 lg:block">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-700">Trang</h3>
              <Button onClick={addPage} className="rounded-xl bg-white p-2 text-blue-600 shadow-sm hover:bg-blue-50">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 overflow-y-auto pr-1">
              {pages.map((page, index) => (
                <Button
                  key={page.id}
                  onClick={() => {
                    setActivePageId(page.id);
                    setSelectedItemId(null);
                  }}
                  className={`w-full rounded-2xl border p-2 text-left transition ${page.id === activePage?.id ? "border-blue-200 bg-white shadow-sm" : "border-transparent bg-white/50 hover:bg-white"}`}
                >
                  <div className="mb-2 flex h-20 items-center justify-center rounded-xl border border-slate-100 bg-white text-xs font-bold text-slate-400" style={getBackgroundStyle(page.background)}>
                    {index + 1}
                  </div>
                  <Input
                    value={page.title}
                    onChange={(event) => updatePageTitle(page.id, event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    className="w-full rounded-lg bg-transparent px-1 text-xs font-bold text-slate-700 outline-none focus:bg-blue-50"
                  />
                  <p className="px-1 text-[10px] text-slate-400">
                    {page.strokes.length} nét • {page.items.length} vật thể
                  </p>
                </Button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <Button onClick={duplicatePage} className="rounded-xl bg-white p-2 text-slate-500 shadow-sm hover:text-blue-600" title="Nhân bản trang">
                <CopyIcon className="h-4 w-4" />
              </Button>
              <Button onClick={deletePage} className="rounded-xl bg-white p-2 text-slate-500 shadow-sm hover:text-red-600" title="Xóa trang">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button onClick={clearPage} className="rounded-xl bg-white p-2 text-slate-500 shadow-sm hover:text-red-600" title="Xóa nội dung">
                <Eraser className="h-4 w-4" />
              </Button>
            </div>
          </aside>

          <main className="flex min-w-0 flex-col overflow-hidden bg-[#f4f7fe]">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200/70 bg-white/70 px-4 py-3 backdrop-blur">
              <div className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow-sm">
                {DEFAULT_COLORS.map((item) => (
                  <Button
                    key={item}
                    onClick={() => setColor(item)}
                    className={`h-6 w-6 rounded-full border-2 ${color === item ? "border-slate-900" : "border-white"}`}
                    style={{ backgroundColor: item }}
                    title={item}
                  />
                ))}
                <Input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-7 w-8 cursor-pointer rounded-lg border-0 bg-transparent" />
              </div>

              <label className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-500 shadow-sm">
                Nét
                <Input type="range" min={1} max={24} value={strokeWidth} onChange={(event) => setStrokeWidth(Number(event.target.value))} />
                <span className="w-7 text-right">{strokeWidth}</span>
              </label>

              <div className="flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-sm">
                {(["plain", "grid", "dots", "line"] as NotebookBackground[]).map((bg) => (
                  <Button
                    key={bg}
                    onClick={() => setPageBackground(bg)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold ${activePage?.background === bg ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50"}`}
                  >
                    {bg === "plain" ? "Trắng" : bg === "grid" ? "Ô ly" : bg === "dots" ? "Chấm" : "Dòng"}
                  </Button>
                ))}
              </div>

              <div className="ml-auto flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-sm">
                <Button onClick={() => setZoom((value) => Math.max(0.35, value - 0.08))} className="rounded-xl p-2 text-slate-500 hover:bg-slate-50">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="w-14 text-center text-xs font-bold text-slate-500">{Math.round(zoom * 100)}%</span>
                <Button onClick={() => setZoom((value) => Math.min(1.5, value + 0.08))} className="rounded-xl p-2 text-slate-500 hover:bg-slate-50">
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              <Button onClick={exportJson} className="rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-500 shadow-sm hover:text-blue-600">
                <Download className="mr-1 inline h-4 w-4" /> Sao lưu
              </Button>
            </div>

            {selectedItem && (
              <div className="flex flex-wrap items-center gap-2 border-b border-blue-100 bg-blue-50/70 px-4 py-2 text-xs">
                <span className="font-bold text-blue-700">
                  Đang chọn: {selectedItem.type === "gif" ? "Ảnh động" : selectedItem.type === "image" ? "Hình ảnh" : selectedItem.type === "sticky" ? "Ghi chú màu" : "Hộp chữ"}
                </span>
                <Button onClick={bringSelectedToFront} className="rounded-xl bg-white px-3 py-1.5 font-bold text-slate-600 hover:text-blue-600">
                  Đưa lên trước
                </Button>
                <Button onClick={duplicateSelectedItem} className="rounded-xl bg-white px-3 py-1.5 font-bold text-slate-600 hover:text-blue-600">
                  Nhân bản
                </Button>
                <Button onClick={deleteSelectedItem} className="rounded-xl bg-white px-3 py-1.5 font-bold text-red-600 hover:bg-red-50">
                  Xóa
                </Button>
                {selectedItem.type !== "image" && selectedItem.type !== "gif" && (
                  <>
                    <label className="ml-1 flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 font-bold text-slate-600">
                      Cỡ chữ
                      <Input
                        type="range"
                        min={14}
                        max={52}
                        value={selectedItem.fontSize || 22}
                        onChange={(event) => updateItem(selectedItem.id, (item) => ({ ...item, fontSize: Number(event.target.value) }))}
                      />
                    </label>
                    <Input
                      type="color"
                      value={selectedItem.textColor || "#0f172a"}
                      onChange={(event) => updateItem(selectedItem.id, (item) => ({ ...item, textColor: event.target.value }))}
                      className="h-8 w-9 rounded-xl bg-white"
                      title="Màu chữ"
                    />
                  </>
                )}
              </div>
            )}

            <div className="relative flex-1 overflow-auto p-3 sm:p-6">
              <div className="mx-auto" style={{ width: BOARD_WIDTH * zoom, height: BOARD_HEIGHT * zoom }}>
                <div
                  ref={stageRef}
                  className={`relative origin-top-left overflow-hidden rounded-[26px] border border-slate-200 shadow-xl shadow-slate-200/70 ${boardCursor}`}
                  style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT, transform: `scale(${zoom})`, ...getBackgroundStyle(activePage?.background || "grid") }}
                  onPointerDown={() => {
                    if (tool === "select") setSelectedItemId(null);
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    width={BOARD_WIDTH}
                    height={BOARD_HEIGHT}
                    onPointerDown={startDrawing}
                    onPointerMove={drawMove}
                    onPointerUp={stopDrawing}
                    onPointerCancel={stopDrawing}
                    className="absolute inset-0 z-10 touch-none"
                    style={{ pointerEvents: ["pen", "highlighter", "eraser"].includes(tool) ? "auto" : "none" }}
                  />

                  {activePage?.items
                    .slice()
                    .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
                    .map((item) => {
                      const selected = selectedItemId === item.id;
                      const commonStyle: CSSProperties = {
                        left: item.x,
                        top: item.y,
                        width: item.width,
                        height: item.height,
                        zIndex: item.zIndex || 20,
                        pointerEvents: tool === "select" ? "auto" : "none",
                      };

                      if (item.type === "image" || item.type === "gif") {
                        return (
                          <div
                            key={item.id}
                            className={`absolute overflow-hidden rounded-2xl border-2 bg-white shadow-lg ${selected ? "border-blue-500" : "border-transparent"}`}
                            style={commonStyle}
                            onPointerDown={(event) => startItemDrag(event, item, "move")}
                          >
                            <img src={item.url} alt="Hình trong sổ tay" className="h-full w-full select-none object-contain" draggable={false} />
                            {item.type === "gif" && <span className="absolute left-2 top-2 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-bold text-white">Ảnh động</span>}
                            {selected && (
                              <Button className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-2 border-white bg-blue-600" onPointerDown={(event) => startItemDrag(event, item, "resize")} />
                            )}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={item.id}
                          className={`absolute rounded-2xl border-2 shadow-lg ${item.type === "sticky" ? "p-3" : "p-1"} ${selected ? "border-blue-500" : "border-transparent"}`}
                          style={{ ...commonStyle, backgroundColor: item.type === "sticky" ? item.color || "#fff7ad" : "transparent" }}
                          onPointerDown={(event) => startItemDrag(event, item, "move")}
                        >
                          <Textarea
                            value={item.content || ""}
                            onChange={(event) => updateItem(item.id, (prev) => ({ ...prev, content: event.target.value }))}
                            onPointerDown={(event) => {
                              event.stopPropagation();
                              setSelectedItemId(item.id);
                            }}
                            className={`h-full w-full resize-none bg-transparent font-bold leading-snug outline-none ${item.type === "sticky" ? "placeholder:text-slate-400" : ""}`}
                            style={{ color: item.textColor || "#0f172a", fontSize: item.fontSize || 22 }}
                          />
                          {selected && (
                            <Button className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-2 border-white bg-blue-600" onPointerDown={(event) => startItemDrag(event, item, "resize")} />
                          )}
                        </div>
                      );
                    })}

                  <div className="pointer-events-none absolute bottom-4 left-4 z-[5] flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 text-xs font-bold text-slate-400 backdrop-blur">
                    <LayoutGrid className="h-4 w-4" />
                    {activePage?.title || "Trang"} • {BOARD_WIDTH}×{BOARD_HEIGHT}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </section>
    </div>
  );
}
