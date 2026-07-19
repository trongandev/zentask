import axiosInstance from "./axiosConfig";

export interface CalculatorHistoryItem {
    id: string;
    expression: string;
    result: string;
    mode: string;
    type: string;
    createdAt?: string;
}

export interface TranslationHistoryItem {
    id: string;
    sourceText: string;
    translatedText: string;
    source: string;
    target: string;
    createdAt?: string;
}

export interface StudyMethodItem {
    id: string;
    name: string;
    studyMinutes: number;
    breakMinutes: number;
    breakCount: number;
    isCustom?: boolean;
    createdAt?: string;
}

const KEYS = {
    CALC: "zt_calc_history",
    TRANS: "zt_trans_history",
    STUDY: "zt_study_methods",
};

export const utilitiesService = {
    async getCalculatorHistory(): Promise<CalculatorHistoryItem[]> {
        const data = localStorage.getItem(KEYS.CALC);
        return data ? JSON.parse(data) : [];
    },

    async saveCalculatorHistory(payload: { expression: string; result: string; mode: string; type?: string }): Promise<CalculatorHistoryItem> {
        const history = await this.getCalculatorHistory();
        const item: CalculatorHistoryItem = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            expression: payload.expression,
            result: payload.result,
            mode: payload.mode,
            type: payload.type || "calculation",
            createdAt: new Date().toISOString(),
        };
        history.unshift(item);
        if (history.length > 60) history.pop();
        localStorage.setItem(KEYS.CALC, JSON.stringify(history));
        return item;
    },

    async deleteCalculatorHistory(id: string) {
        let history = await this.getCalculatorHistory();
        history = history.filter((h) => h.id !== id);
        localStorage.setItem(KEYS.CALC, JSON.stringify(history));
        return { ok: true };
    },

    async clearCalculatorHistory() {
        localStorage.removeItem(KEYS.CALC);
        return { ok: true };
    },

    async translate(payload: { text: string; source: string; target: string; save?: boolean }) {
        const query = new URLSearchParams({
            client: "gtx",
            sl: payload.source || "auto",
            tl: payload.target || "en",
            dt: "t",
            q: payload.text,
        });

        const response = await axiosInstance.get(`https://translate.googleapis.com/translate_a/single?${query.toString()}`);
        const data = response.data;
        const translatedText = Array.isArray(data?.[0]) ? data[0].map((item: any) => item?.[0] || "").join("") : payload.text;

        let item;
        if (payload.save !== false) {
            const history = await this.getTranslationHistory();
            item = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                sourceText: payload.text,
                translatedText,
                source: payload.source,
                target: payload.target,
                createdAt: new Date().toISOString(),
            };
            history.unshift(item);
            if (history.length > 60) history.pop();
            localStorage.setItem(KEYS.TRANS, JSON.stringify(history));
        }

        return { translatedText, item };
    },

    async getTranslationHistory(): Promise<TranslationHistoryItem[]> {
        const data = localStorage.getItem(KEYS.TRANS);
        return data ? JSON.parse(data) : [];
    },

    async deleteTranslationHistory(id: string) {
        let history = await this.getTranslationHistory();
        history = history.filter((h) => h.id !== id);
        localStorage.setItem(KEYS.TRANS, JSON.stringify(history));
        return { ok: true };
    },

    async clearTranslationHistory() {
        localStorage.removeItem(KEYS.TRANS);
        return { ok: true };
    },

    async getStudyMethods(): Promise<StudyMethodItem[]> {
        const data = localStorage.getItem(KEYS.STUDY);
        return data ? JSON.parse(data) : [];
    },

    async createStudyMethod(payload: { name: string; studyMinutes: number; breakMinutes: number; breakCount: number }): Promise<StudyMethodItem> {
        const methods = await this.getStudyMethods();
        const item: StudyMethodItem = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            ...payload,
            isCustom: true,
            createdAt: new Date().toISOString(),
        };
        methods.push(item);
        localStorage.setItem(KEYS.STUDY, JSON.stringify(methods));
        return item;
    },

    async updateStudyMethod(id: string, payload: { name: string; studyMinutes: number; breakMinutes: number; breakCount: number }): Promise<StudyMethodItem> {
        const methods = await this.getStudyMethods();
        const index = methods.findIndex((m) => m.id === id);
        if (index === -1) throw new Error("Method not found");
        methods[index] = { ...methods[index], ...payload };
        localStorage.setItem(KEYS.STUDY, JSON.stringify(methods));
        return methods[index];
    },

    async deleteStudyMethod(id: string) {
        let methods = await this.getStudyMethods();
        methods = methods.filter((m) => m.id !== id);
        localStorage.setItem(KEYS.STUDY, JSON.stringify(methods));
        return { ok: true };
    },
};
