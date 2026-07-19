import axiosInstance from "./axiosConfig";
import toastService from "@/src/services/toastService";

export type NotebookTool = "select" | "pen" | "highlighter" | "eraser" | "sticky" | "text" | "image";
export type NotebookBackground = "plain" | "grid" | "dots" | "line";

export interface NotebookPoint {
    x: number;
    y: number;
    pressure?: number;
}

export interface NotebookStroke {
    id: string;
    tool: "pen" | "highlighter" | "eraser";
    color: string;
    width: number;
    opacity: number;
    points: NotebookPoint[];
}

export interface NotebookItem {
    id: string;
    type: "image" | "gif" | "sticky" | "text";
    x: number;
    y: number;
    width: number;
    height: number;
    url?: string;
    content?: string;
    color?: string;
    textColor?: string;
    fontSize?: number;
    zIndex?: number;
}

export interface NotebookPageData {
    id: string;
    title: string;
    background: NotebookBackground;
    strokes: NotebookStroke[];
    items: NotebookItem[];
}

export interface NotebookDocument {
    id: string;
    title: string;
    description?: string;
    coverColor?: string;
    activePageId: string;
    pages: NotebookPageData[];
    settings?: Record<string, any>;
    ownerId?: string;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export type NotebookPayload = Omit<NotebookDocument, "id" | "ownerId" | "createdAt" | "updatedAt">;
const fetchApi = async (endpoint: string, options: any = {}) => {
    const method = options.method || "GET";
    const data = options.body ? JSON.parse(options.body) : undefined;

    const response = await axiosInstance({
        url: `/api${endpoint}`,
        method,
        data,
    });

    return response.data;
};

export const notebookService = {
    async list(): Promise<NotebookDocument[]> {
        try {
            return await fetchApi("/notebook");
        } catch (error: any) {
            toastService.error(error.message || "Không tải được notebook.");
            return [];
        }
    },

    async get(id: string): Promise<NotebookDocument | null> {
        try {
            return await fetchApi(`/notebook/${id}`);
        } catch (error: any) {
            toastService.error(error.message || "Không tải được notebook.");
            return null;
        }
    },

    async create(payload: NotebookPayload): Promise<NotebookDocument | null> {
        try {
            const notebook = await fetchApi("/notebook", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            toastService.success("Đã tạo notebook");
            return notebook;
        } catch (error: any) {
            toastService.error(error.message || "Không tạo được notebook.");
            return null;
        }
    },

    async update(id: string, payload: NotebookPayload, showToast = false): Promise<NotebookDocument | null> {
        try {
            const notebook = await fetchApi(`/notebook/${id}`, {
                method: "PUT",
                body: JSON.stringify(payload),
            });
            if (showToast) toastService.success("Đã lưu notebook");
            return notebook;
        } catch (error: any) {
            toastService.error(error.message || "Không lưu được notebook.");
            return null;
        }
    },

    async remove(id: string): Promise<boolean> {
        try {
            await fetchApi(`/notebook/${id}`, { method: "DELETE" });
            toastService.success("Đã xóa notebook");
            return true;
        } catch (error: any) {
            toastService.error(error.message || "Không xóa được notebook.");
            return false;
        }
    },
};
