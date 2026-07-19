import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Star, Lock, BookOpen, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { SEO } from "../../components/SEO";
import axiosInstance from "../../services/axiosConfig";

// Các mức offset theo chu kỳ để tạo đường đi zigzag
const PATH_OFFSETS = [0, -30, -60, -30, 0, 30, 60, 30];

interface LessonNode {
    id: string; // "topicId_lessonIndex"
    topicId: string;
    lessonIndex: number;
    totalLessonsInTopic: number;
    wordCount: number;
    title: string;
    rankId: string;
    rankName: string;
    tierName: string;
    status: "locked" | "current" | "completed";
    color: string;
    rewardClaimed: boolean; // x2 XP relearn bonus already claimed
}

export function Beginner() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [completedLessons, setCompletedLessons] = useState<string[]>([]);
    const [rewardClaimedLessons, setRewardClaimedLessons] = useState<string[]>([]);
    const [nodes, setNodes] = useState<LessonNode[]>([]);
    const [selectedNode, setSelectedNode] = useState<LessonNode | null>(null);

    const [rankConfig, setRankConfig] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRanks = async () => {
            setIsLoading(true);
            try {
                const res = await axiosInstance.get("/api/beginner/ranks");
                setRankConfig(res.data);
            } catch (error) {
                console.error("Failed to fetch ranks", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRanks();
    }, []);

    useEffect(() => {
        const fetchProgress = async () => {
            if (!user) return;
            try {
                const res = await axiosInstance.get("/api/user/beginner-progress");
                setCompletedLessons(res.data.completedLessons || []);
                setRewardClaimedLessons(res.data.rewardClaimedLessons || []);
            } catch (error) {
                console.error("Failed to fetch progress", error);
            }
        };
        fetchProgress();
    }, [user]);

    useEffect(() => {
        const buildPath = () => {
            if (!rankConfig) return;
            const generatedNodes: LessonNode[] = [];

            // Lặp qua tất cả các rank
            for (const [rankId, rankData] of Object.entries(rankConfig as any)) {
                // Tiers thường được sắp xếp giảm dần 5->1 hoặc 3->1 trong config,
                // để hiển thị từ dễ đến khó (dưới lên trên), ta lật ngược lại hoặc theo đúng thứ tự logic.
                // Trong cấu trúc, tier số lớn = thấp nhất (dễ nhất).
                const rankDataTyped = rankData as any;
                const sortedTiers = rankDataTyped.tiers ? Object.entries(rankDataTyped.tiers).sort(([a], [b]) => Number(b) - Number(a)) : [];

                for (const [tierId, tier] of sortedTiers) {
                    const tierTyped = tier as any;
                    if (!tierTyped.data) continue;

                    for (const topic of tierTyped.data) {
                        const wordCount = topic.wordCount || 0;
                        const WORDS_PER_LESSON = 5;
                        const totalLessons = Math.ceil(wordCount / WORDS_PER_LESSON) || 1;

                        generatedNodes.push({
                            id: topic.id,
                            topicId: topic.id,
                            lessonIndex: 0,
                            totalLessonsInTopic: totalLessons,
                            wordCount: wordCount,
                            title: topic.title || "",
                            rankId,
                            rankName: (rankData as any).name,
                            tierName: `Tier ${tierId}`,
                            status: "locked",
                            color: topic.category || "from-blue-500 to-cyan-400",
                            rewardClaimed: false,
                        });
                    }
                }
            }

            // Xác định trạng thái Locked/Current/Completed
            // Mặc định node đầu tiên là Current nếu chưa học gì
            let firstUncompletedFound = false;
            const evaluatedNodes = generatedNodes.map((node) => {
                let currentLessonIndex = -1;
                let allRewardClaimed = true;
                
                for (let i = 0; i < node.totalLessonsInTopic; i++) {
                    const lessonId = `${node.topicId}_${i}`;
                    if (completedLessons.includes(lessonId)) {
                        if (!rewardClaimedLessons.includes(lessonId)) {
                            allRewardClaimed = false;
                        }
                    } else {
                        if (currentLessonIndex === -1) {
                            currentLessonIndex = i;
                        }
                        allRewardClaimed = false;
                    }
                }

                const isCompleted = currentLessonIndex === -1;
                const finalLessonIndex = isCompleted ? node.totalLessonsInTopic - 1 : currentLessonIndex;
                
                const WORDS_PER_LESSON = 5;
                let currentLessonWordCount = WORDS_PER_LESSON;
                if (finalLessonIndex === node.totalLessonsInTopic - 1) {
                    currentLessonWordCount = node.wordCount - (finalLessonIndex * WORDS_PER_LESSON);
                    if (currentLessonWordCount <= 0) currentLessonWordCount = WORDS_PER_LESSON;
                }

                if (isCompleted) {
                    return { ...node, status: "completed" as const, rewardClaimed: allRewardClaimed, lessonIndex: finalLessonIndex, wordCount: currentLessonWordCount };
                } else if (!firstUncompletedFound) {
                    firstUncompletedFound = true;
                    return { ...node, status: "current" as const, rewardClaimed: false, lessonIndex: finalLessonIndex, wordCount: currentLessonWordCount };
                } else {
                    return { ...node, status: "locked" as const, rewardClaimed: false, lessonIndex: finalLessonIndex, wordCount: currentLessonWordCount };
                }
            });

            // Để giống Duolingo (mới nhất ở dưới, cũ ở trên) ta giữ nguyên mảng
            // Tuy nhiên Zentask học từ dễ (trên) xuống khó (dưới), nên giữ nguyên.
            setNodes(evaluatedNodes);
        };

        buildPath();
    }, [completedLessons, rewardClaimedLessons, rankConfig]);

    const handleNodeClick = (node: LessonNode) => {
        if (node.status === "locked") return;
        setSelectedNode(node);
    };

    const handleStartLesson = () => {
        if (!selectedNode) return;
        navigate(`/beginner/lesson/${selectedNode.topicId}/${selectedNode.lessonIndex}`);
    };

    return (
        <div className="max-w-2xl mx-auto w-full min-h-screen bg-slate-50 font-sans pb-12">
            <SEO title="Lộ trình học tập" description="Lộ trình học tiếng Anh theo từng chủ đề." />

            {/* Các Node Lộ trình */}
            <div className="flex flex-col items-center justify-start relative w-full">
                {/* Vẽ đường nối SVG đằng sau */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[140px] pointer-events-none overflow-hidden z-0">
                    <svg className="w-full h-full" preserveAspectRatio="none">
                        {/* 
              Tạo đường line nét đứt nối các node. 
              Vì toạ độ phức tạp, ta chỉ dùng line dọc đơn giản 
              hoặc CSS zigzag để đơn giản hoá trước mắt.
            */}
                    </svg>
                </div>

                {/* Đang tải */}
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center z-10 w-full max-w-lg mx-auto">
                        <img src="/mascot/Lopy (1).png" alt="Loading Mascot" className="w-40 h-40 object-contain mb-6 animate-bounce" />
                        <h2 className="text-2xl font-black text-slate-800 animate-pulse">Đang tải lộ trình...</h2>
                        <p className="text-slate-500 mt-2 font-medium">Vui lòng đợi một chút nhé!</p>
                    </div>
                )}

                {/* Thông báo chưa có bài học */}
                {!isLoading && nodes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center z-10 bg-white rounded-3xl shadow-sm border border-slate-100 my-8 w-full max-w-lg mx-auto">
                        <div className="text-7xl mb-6">🚧</div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-3">Nội dung đang được cập nhật</h2>
                        <p className="text-slate-600 leading-relaxed font-medium">
                            Hiện tại ngôn ngữ này đang cập nhật nội dung và sớm sẽ ra mắt.
                            <br />
                            Trong quá trình chờ, bạn có thể chuyển qua ngôn ngữ <span className="font-bold text-blue-600">Tiếng Anh</span> để học thử nhé!
                        </p>
                    </div>
                )}

                {/* Render danh sách nodes*/}
                {!isLoading &&
                    nodes.map((node, index) => {
                        // Gắn Unit Header (Rank / Tier separator)
                        const showHeader = index === 0 || nodes[index - 1].rankName !== node.rankName || nodes[index - 1].tierName !== node.tierName;

                        const offset = PATH_OFFSETS[index % PATH_OFFSETS.length];
                        const isCurrent = node.status === "current";
                        const isCompleted = node.status === "completed";
                        const isLocked = node.status === "locked";
                        const isLastInTopic = node.lessonIndex === node.totalLessonsInTopic - 1;

                        return (
                            <React.Fragment key={node.id}>
                                {/* Header Phân đoạn (Rank/Tier) — phải là sibling của node để sticky hoạt động đúng */}
                                {showHeader && (
                                    <div className="w-full px-4 mt-8 mb-5 sticky top-0 z-40">
                                        <div className="bg-blue-600 rounded-2xl p-4 shadow-xl text-white flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <div>
                                                    <h2 className="text-xl font-black">
                                                        {node.rankName} - {node.tierName}
                                                    </h2>
                                                    <p className="text-blue-200 font-medium text-sm mt-1">Hoàn thành tất cả chủ đề để mở khóa hạng tiếp theo</p>
                                                </div>
                                            </div>
                                            <img src={`/rank/${node.rankId}.png`} alt={node.rankName} className="w-14 h-14 object-contain drop-shadow-md" />
                                        </div>
                                    </div>
                                )}

                                {/* Node Button */}
                                <div className={`w-full flex flex-col items-center relative z-10 ${index === 0 ? "mt-20" : ""}`}>
                                    <div className="relative my-4 " style={{ transform: `translateX(${offset}px)` }}>
                                        {/* Tooltip khi đang học */}
                                        {isCurrent && (
                                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-xl font-bold text-blue-600 shadow-lg text-sm whitespace-nowrap animate-bounce z-30">
                                                Bắt đầu
                                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45"></div>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => handleNodeClick(node)}
                                            className={cn(
                                                "w-[70px] h-[70px] rounded-full border-b-[6px] active:border-b-0 active:translate-y-[6px] transition-all flex items-center justify-center relative",
                                                isLocked
                                                    ? "bg-slate-200 border-slate-300 cursor-not-allowed"
                                                    : isCompleted
                                                      ? "bg-amber-400 border-amber-500 text-white shadow-xl shadow-amber-400/20"
                                                      : "bg-blue-500 border-blue-600 text-white shadow-xl shadow-blue-500/30 ring-4 ring-blue-500/20",
                                            )}>
                                            {/* Icon */}
                                            {isLocked ? (
                                                <Lock className="w-7 h-7 text-slate-400" />
                                            ) : isLastInTopic && isCompleted ? (
                                                <Star className="w-8 h-8 fill-current" />
                                            ) : isCompleted ? (
                                                <Check className="w-8 h-8 stroke-[3]" />
                                            ) : (
                                                <Star className="w-8 h-8 stroke-[3]" />
                                            )}

                                            {/* Vòng sáng quanh node current */}
                                            {isCurrent && <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-ping opacity-50 -z-10 scale-125"></div>}
                                        </button>

                                        {/* Nhãn bài học bên cạnh */}
                                        <div
                                            className={cn(
                                                "absolute top-1/2 -translate-y-1/2 whitespace-nowrap  font-bold text-xs md:text-sm",
                                                offset >= 0 ? "right-[100%] mr-4 text-right" : "left-[100%] ml-4 text-left",
                                                isLocked ? "text-slate-400" : "text-slate-700",
                                            )}>
                                            <p>{node.title}</p>
                                            <p className="text-xs font-medium opacity-60">
                                                Phần {node.lessonIndex + 1}/{node.totalLessonsInTopic} ({node.wordCount} từ)
                                            </p>
                                        </div>

                                        {/* Mascot ngẫu nhiên (chỉ hiện ở một số node nhất định) */}
                                        {index % 4 === 2 && (
                                            <div
                                                className={cn(
                                                    "absolute top-1/2 -translate-y-1/2 w-16 h-16 pointer-events-none drop-shadow-md hidden md:block",
                                                    offset >= 0 ? "left-[100%] ml-8" : "right-[100%] mr-8",
                                                    isLocked && "opacity-40 grayscale",
                                                )}>
                                                <img
                                                    src={`/mascot/Lopy (${[1, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17][(index * 7) % 11]}).png`}
                                                    alt="Lopy mascot"
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })}
            </div>

            {/* Modal / Popover bài học */}
            {selectedNode && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedNode(null)}>
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelectedNode(null)} className="absolute top-4 right-4 text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                        <h3 className="text-2xl font-black text-slate-800 mb-1 pr-8 leading-tight">{selectedNode.title}</h3>
                        <p className="text-slate-500 font-medium mb-6">
                            Phần {selectedNode.lessonIndex + 1}/{selectedNode.totalLessonsInTopic}
                        </p>

                        <div className="mb-8 text-center bg-blue-50 py-4 rounded-2xl border border-blue-100">
                            <p className="text-blue-800 font-bold text-lg">Bài học này gồm {selectedNode.wordCount} từ vựng</p>
                            <p className="text-blue-600 text-sm mt-1">Bấm nút bên dưới để bắt đầu luyện tập!</p>
                        </div>

                        <button
                            onClick={handleStartLesson}
                            className={cn(
                                "w-full py-4 rounded-2xl font-bold text-lg shadow-xl active:translate-y-1 transition-all border-b-4 flex items-center justify-center gap-2",
                                selectedNode.status === "completed"
                                    ? selectedNode.rewardClaimed
                                        ? "bg-slate-200 border-slate-300 hover:bg-slate-300 shadow-slate-200/30 text-slate-600"
                                        : "bg-amber-400 border-amber-500 hover:bg-amber-500 shadow-amber-400/30 text-amber-900"
                                    : "bg-blue-500 border-blue-600 hover:bg-blue-600 shadow-blue-500/30 text-white",
                            )}>
                            {selectedNode.status === "completed" ? (
                                selectedNode.rewardClaimed ? (
                                    <>
                                        <Star className="w-6 h-6" />
                                        Học lại
                                    </>
                                ) : (
                                    <>
                                        <Star className="w-6 h-6 fill-amber-900" />
                                        Học lại (Nhận x2 XP)
                                    </>
                                )
                            ) : (
                                "Bắt đầu +10XP"
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
