import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Volume2, LayoutGrid, AlignJustify, Rows3, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";

import { cn } from "../../lib/utils";
import { useTTSAudio } from "../../hooks/useTTSAudio";
import { useAuth } from "../../contexts/AuthContext";
import { Check } from "lucide-react";
import { VoiceSelectorModal } from "../../components/practice/VoiceSelectorModal";
import { getVoiceForLanguage } from "../../lib/ttsVoiceStorage";
import axiosInstance from "@/src/services/axiosConfig";
import { Button } from "@/src/components/ui/Button";

type ViewMode = "line" | "grid" | "compact";

export function BeginnerFlashcardDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [currentSet, setCurrentSet] = useState<any>(null);
    const [loadingSet, setLoadingSet] = useState(true);

    React.useEffect(() => {
        const fetchSet = async () => {
            try {
                const res = await axiosInstance.get(`/api/beginner/lesson/${id}`);
                setCurrentSet(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingSet(false);
            }
        };
        if (id) fetchSet();
    }, [id]);

    const { playAudio, isLoading, loadingText } = useTTSAudio();
    const [viewMode, setViewMode] = useState<ViewMode>("line");
    const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
    const [currentVoiceId, setCurrentVoiceId] = useState(() => {
        return getVoiceForLanguage((currentSet as any)?.language);
    });
    const [expandedGridCardId, setExpandedGridCardId] = useState<string | null>(null);
    const [learnedWords, setLearnedWords] = useState<string[]>([]);
    const { user } = useAuth();

    React.useEffect(() => {
        if (user) {
            axiosInstance
                .get(`/api/user/beginner-progress`)
                .then((res) => (res.status === 200 ? res.data : { learnedWords: [] }))
                .then((data) => setLearnedWords(data.learnedWords || []))
                .catch(console.error);
        }
    }, [user]);

    if (loadingSet) {
        return <div className="text-center py-12">Loading...</div>;
    }

    if (!currentSet) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Không tìm thấy bộ thẻ</p>
                <Button onClick={() => navigate("/beginner")} className="mt-4 text-blue-600 font-semibold">
                    Quay lại danh sách
                </Button>
            </div>
        );
    }

    const cards = currentSet.words || [];

    const handlePlayAudio = (text: string) => {
        playAudio(text, currentVoiceId);
    };

    // LINE VIEW
    const renderLineCard = (card: any) => (
        <div key={card.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
            <div className="md:w-1/3 border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-6">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-gray-900">{card.term}</h3>
                        {learnedWords.includes(card.id) && <Check className="w-5 h-5 text-green-500" />}
                        <Button
                            onClick={() => handlePlayAudio(card.term)}
                            disabled={isLoading && loadingText === card.term}
                            className="text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-50">
                            {isLoading && loadingText === card.term ? (
                                <div className="w-5 h-5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
                            ) : (
                                <Volume2 className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                </div>
                {card.phonetic && <p className="text-gray-400 font-mono text-sm mb-2">{card.phonetic}</p>}
                <p className="text-blue-600 font-bold mb-3">{card.translation}</p>
                {card.notes && (
                    <div className="mt-3 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800 border border-yellow-100">
                        <span className="font-bold block mb-1">Ghi chú:</span>
                        {card.notes}
                    </div>
                )}
            </div>
            <div className="md:w-2/3 space-y-3">
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Ví dụ</h4>
                {card.examples?.length > 0 ? (
                    card.examples.map((ex: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2">
                            <Button
                                onClick={() => handlePlayAudio(ex.en)}
                                disabled={isLoading && loadingText === ex.en}
                                className="mt-0.5 text-gray-300 hover:text-blue-500 transition-colors shrink-0 disabled:opacity-50">
                                {isLoading && loadingText === ex.en ? (
                                    <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
                                ) : (
                                    <Volume2 className="w-4 h-4" />
                                )}
                            </Button>
                            <div>
                                <p className="text-gray-800 font-medium text-sm">{ex.en}</p>
                                <p className="text-gray-500 text-xs">{ex.vi}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-400 text-sm italic">Không có ví dụ</p>
                )}
            </div>
        </div>
    );

    // GRID VIEW
    const renderGridCard = (card: any) => {
        const isExpanded = expandedGridCardId === card.id;
        return (
            <div key={card.id} className={cn("bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3 transition-all duration-300", isExpanded ? "col-span-2" : "")}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 truncate">{card.term}</h3>
                        {learnedWords.includes(card.id) && <Check className="w-4 h-4 text-green-500 shrink-0" />}
                        <Button
                            onClick={() => handlePlayAudio(card.term)}
                            disabled={isLoading && loadingText === card.term}
                            className="text-gray-400 hover:text-blue-500 transition-colors shrink-0 disabled:opacity-50">
                            {isLoading && loadingText === card.term ? (
                                <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
                            ) : (
                                <Volume2 className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                </div>

                {card.phonetic && <p className="text-gray-400 font-mono text-xs">{card.phonetic}</p>}
                <p className="text-blue-600 font-bold text-sm">{card.translation}</p>

                {/* Toggle example */}
                <Button
                    onClick={() => setExpandedGridCardId(isExpanded ? null : card.id)}
                    className="mt-auto flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 font-medium transition-colors self-start">
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    {isExpanded ? "Ẩn ví dụ" : "Xem ví dụ"}
                </Button>

                {isExpanded && card.examples?.length > 0 && (
                    <div className="pt-3 border-t border-gray-100 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ví dụ</h4>
                        {card.examples.map((ex: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-2">
                                <Button
                                    onClick={() => handlePlayAudio(ex.en)}
                                    disabled={isLoading && loadingText === ex.en}
                                    className="mt-0.5 text-gray-300 hover:text-blue-500 transition-colors shrink-0 disabled:opacity-50">
                                    <Volume2 className="w-3.5 h-3.5" />
                                </Button>
                                <div>
                                    <p className="text-gray-800 font-medium text-sm">{ex.en}</p>
                                    <p className="text-gray-500 text-xs">{ex.vi}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // COMPACT VIEW
    const renderCompactCard = (card: any) => (
        <div key={card.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-shadow">
            <Button
                onClick={() => handlePlayAudio(card.term)}
                disabled={isLoading && loadingText === card.term}
                className="text-gray-400 hover:text-blue-500 transition-colors shrink-0 disabled:opacity-50">
                {isLoading && loadingText === card.term ? <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div> : <Volume2 className="w-4 h-4" />}
            </Button>
            <div className="min-w-0 flex-1 flex items-center justify-between">
                <div>
                    <p className="font-bold text-gray-900 text-sm truncate">{card.term}</p>
                    <p className="text-blue-600 text-xs truncate">{card.translation}</p>
                </div>
                {learnedWords.includes(card.id) && <Check className="w-4 h-4 text-green-500 shrink-0" />}
            </div>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button onClick={() => navigate("/beginner")} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <ArrowLeft className="w-6 h-6 text-gray-600" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{currentSet.title}</h1>
                        <p className="text-gray-500">{cards.length} từ vựng</p>
                    </div>
                </div>
                <Button onClick={() => setIsVoiceModalOpen(true)} className="px-4 py-2 bg-blue-50 text-blue-600 font-semibold rounded-xl hover:bg-blue-100 transition-colors">
                    Thay đổi giọng nói
                </Button>
            </div>

            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <Button
                    onClick={() => navigate(`/beginner/flashcard/${id}/practice`)}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors">
                    <Play className="w-5 h-5 fill-current" /> Ôn tập ngay
                </Button>
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
                        {(
                            [
                                { key: "line", icon: <AlignJustify className="w-4 h-4" />, title: "Dạng dòng" },
                                { key: "grid", icon: <LayoutGrid className="w-4 h-4" />, title: "Dạng lưới" },
                                { key: "compact", icon: <Rows3 className="w-4 h-4" />, title: "Thu gọn" },
                            ] as { key: ViewMode; icon: React.ReactNode; title: string }[]
                        ).map(({ key, icon, title }) => (
                            <Button
                                key={key}
                                title={title}
                                onClick={() => setViewMode(key)}
                                className={cn("p-2 rounded-lg transition-all", viewMode === key ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                                {icon}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            {cards.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-300">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Chưa có từ vựng nào</h3>
                    <p className="text-gray-500">Bộ thẻ này hiện chưa có từ vựng.</p>
                </div>
            ) : viewMode === "line" ? (
                <div className="space-y-4">{cards.map(renderLineCard)}</div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-2 gap-4">{cards.map(renderGridCard)}</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">{cards.map(renderCompactCard)}</div>
            )}

            <VoiceSelectorModal
                isOpen={isVoiceModalOpen}
                onClose={() => setIsVoiceModalOpen(false)}
                currentVoiceId={currentVoiceId}
                onSelectVoice={setCurrentVoiceId}
                language={(currentSet as any)?.language}
            />
        </div>
    );
}
