import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, ArrowRight, BookOpen, Bot, BrainCircuit, CheckCircle2, ChevronRight, Compass, Copy, Headphones, HelpCircle, MessageCircle, NotebookPen, Rocket, ShieldCheck, Sparkles, Trophy, Users, Wand2, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { onboardingService } from "../../services/onboardingService";

const MASCOTS = [
  "/mascot/Lopy%20(1).png",
  "/mascot/Lopy%20(8).png",
  "/mascot/Lopy%20(9).png",
  "/mascot/Lopy%20(10).png",
  "/mascot/Lopy%20(11).png",
  "/mascot/Lopy%20(12).png",
  "/mascot/Lopy%20(13).png",
  "/mascot/Lopy%20(14).png",
  "/mascot/Lopy%20(15).png",
  "/mascot/Lopy%20(16).png",
  "/mascot/Lopy%20(17).png",
];

type Step = {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  path?: string;
  mascot: string;
  color: string;
  bullets: string[];
  actions: string[];
  tip: string;
};

const steps: Step[] = [
  {
    id: "welcome",
    title: "Chào mừng đến với ZenTask",
    subtitle: "Lopy sẽ dẫn bạn đi một vòng qua những tính năng quan trọng nhất trong vài phút.",
    icon: Rocket,
    mascot: MASCOTS[0],
    color: "from-blue-500 to-indigo-600",
    bullets: [
      "ZenTask gom flashcard, trắc nghiệm, luyện 4 kỹ năng, Arena, AI và cộng đồng vào một nơi.",
      "Mỗi hoạt động học có thể cộng XP, tăng cấp và tạo động lực học mỗi ngày.",
      "Bạn có thể bấm 'Đến trang này' ở từng bước để mở nhanh tính năng đang được giới thiệu.",
    ],
    actions: ["Đọc hết hướng dẫn", "Bấm Tiếp để xem từng khu vực", "Có thể bấm Nhắc lại sau nếu đang bận"],
    tip: "Hướng dẫn này chỉ tự hiện ở lần đăng nhập đầu. Sau khi hoàn tất, trạng thái sẽ được lưu theo tài khoản MongoDB.",
  },
  {
    id: "dashboard",
    title: "Tổng quan học tập",
    subtitle: "Xem tiến độ, nhiệm vụ hằng ngày, streak, XP và các gợi ý nên học tiếp.",
    icon: Compass,
    path: "/",
    mascot: MASCOTS[1],
    color: "from-sky-500 to-cyan-500",
    bullets: [
      "Ô thống kê cho biết hôm nay bạn đã học bao lâu và tiến độ 7 ngày gần nhất.",
      "Điểm danh mỗi ngày để giữ streak và nhận XP nếu nhiệm vụ ngày còn lượt.",
      "Khu gợi ý sẽ nhắc các thẻ đến hạn ôn, bài cần làm và thứ hạng hiện tại.",
    ],
    actions: ["Bấm Điểm danh", "Xem thẻ đến hạn", "Theo dõi XP và cấp độ"],
    tip: "Mở ZenTask mỗi ngày 3-5 phút cũng giúp hệ thống giữ nhịp học và không quên từ mới.",
  },
  {
    id: "beginner",
    title: "Người mới bắt đầu & phòng 4 kỹ năng",
    subtitle: "Bắt đầu từ từ vựng theo cấp độ, sau đó luyện nghe, nói, điền từ và phản xạ.",
    icon: Headphones,
    path: "/beginner",
    mascot: MASCOTS[2],
    color: "from-emerald-500 to-teal-600",
    bullets: [
      "Các chủ đề beginner chia theo cấp độ/rank để người mới không bị quá tải.",
      "Phòng 4 kỹ năng tạo bài luyện nghe, nói, điền từ và phản xạ theo nội dung AI tổng hợp.",
      "Hoàn thành đúng cả 4 kỹ năng trong ngày có thể nhận thưởng XP ngày.",
    ],
    actions: ["Chọn một chủ đề beginner", "Bấm Ôn tập ngay", "Vào phòng 4 kỹ năng để luyện phản xạ"],
    tip: "Nếu mới học, hãy đi theo thứ tự từ Bạc thấp nhất, đừng nhảy quá nhanh lên bài khó.",
  },
  {
    id: "flashcards",
    title: "Flashcard: của tôi, có sẵn và công khai",
    subtitle: "Tạo bộ thẻ riêng, học bộ IELTS/TOEIC có sẵn hoặc lưu bộ công khai của người khác.",
    icon: Copy,
    path: "/flashcards",
    mascot: MASCOTS[3],
    color: "from-violet-500 to-purple-600",
    bullets: [
      "Tab Của tôi chứa bộ thẻ bạn tự tạo hoặc đã lưu về tài khoản.",
      "Tab Có sẵn chứa học liệu hệ thống như IELTS và TOEIC, không cho người dùng xóa.",
      "Tab Công khai hiển thị bộ thẻ public từ cộng đồng, có thể xem trước rồi lưu về cá nhân.",
    ],
    actions: ["Tạo bộ thẻ", "Chọn đề mục IELTS/TOEIC", "Vào Practice để luyện trắc nghiệm, điền từ, nghe, phát âm"],
    tip: "Khi tạo bộ thẻ riêng tư, hệ thống có thể yêu cầu VIP. Mặc định bộ mới sẽ công khai để cộng đồng cùng học.",
  },
  {
    id: "quiz",
    title: "Trắc nghiệm & bài mock có sẵn",
    subtitle: "Làm quiz nổi bật, quiz tự tạo, quiz công khai hoặc mock IELTS/TOEIC hệ thống.",
    icon: HelpCircle,
    path: "/quiz",
    mascot: MASCOTS[4],
    color: "from-amber-500 to-orange-600",
    bullets: [
      "Tab Của tôi ưu tiên bài nổi bật trước, sau đó đến quiz bạn tự tạo hoặc đã lưu.",
      "Tab Có sẵn tách riêng mock data cho IELTS/TOEIC để không lẫn với nội dung cá nhân.",
      "Tab Công khai cho phép học từ quiz cộng đồng và lọc theo đề mục.",
    ],
    actions: ["Bấm Tạo Quiz", "Chọn công khai/riêng tư", "Chọn đề mục để quản lý dễ hơn"],
    tip: "Dùng AI tạo quiz nhanh từ chủ đề, sau đó sửa lại câu hỏi nếu muốn làm bài nghiêm túc hơn.",
  },
  {
    id: "arena",
    title: "Arena: đấu hạng, 2v2, bot và giải đấu",
    subtitle: "Thi đấu realtime để học vui hơn: solo 1v1, đồng đội 2v2 và phòng giải đấu có mã mời.",
    icon: Trophy,
    path: "/arena",
    mascot: MASCOTS[5],
    color: "from-rose-500 to-red-600",
    bullets: [
      "Solo 1v1 ghép người thật trước; nếu chờ lâu và rank phù hợp, hệ thống có thể ghép bot.",
      "2v2 cho phép đồng đội gợi ý câu hỏi cho nhau và tính tổng điểm đội.",
      "Giải đấu dùng mã mời, cần ít nhất 2 người để bắt đầu và chỉ cộng XP, không tính rank.",
    ],
    actions: ["Bấm Bắt đầu chơi hạng", "Chọn Solo hoặc Đồng đội", "Tạo giải đấu nếu muốn chơi với bạn"],
    tip: "5 trận đầu bot dễ hơn để người mới làm quen, sau đó bot sẽ mạnh dần theo rank.",
  },
  {
    id: "ai",
    title: "Trợ lý AI, tạo ảnh và phụ đề",
    subtitle: "Dùng AI để hỏi bài, tạo ảnh minh họa, dịch prompt và hỗ trợ xử lý phụ đề video.",
    icon: Bot,
    path: "/ai-chat",
    mascot: MASCOTS[6],
    color: "from-fuchsia-500 to-pink-600",
    bullets: [
      "Trợ lý AI có thể giải thích ngữ pháp, tạo ví dụ, sửa câu và gợi ý cách học.",
      "Tạo ảnh dùng prompt tiếng Việt; backend tự dịch sang tiếng Anh trước khi gọi model ảnh.",
      "Subtitle AI có thể tạo SRT và burn phụ đề vào video qua backend FFmpeg.",
    ],
    actions: ["Mở Trợ lý AI", "Upload ảnh nếu cần phân tích", "Dùng Subtitle AI khi xử lý video học"],
    tip: "Không nhập API key ở frontend. Key nên nằm trong file .env của backend để tránh lộ khi deploy.",
  },
  {
    id: "notebook",
    title: "Sổ tay, tiện ích và dịch thuật",
    subtitle: "Ghi chú bằng bút, dùng máy tính, đồng hồ học và dịch thuật kèm giọng đọc.",
    icon: NotebookPen,
    path: "/notebook",
    mascot: MASCOTS[7],
    color: "from-slate-600 to-gray-800",
    bullets: [
      "Sổ tay hỗ trợ vẽ, tẩy, ghi chú màu, thêm ảnh/GIF, nhiều trang và tự lưu.",
      "Tiện ích có máy tính cơ bản/nâng cao, lịch sử tính, đồng hồ học Pomodoro và phương pháp tự tạo.",
      "Dịch thuật có lưu lịch sử và đọc giọng hai phía bằng voice options có sẵn.",
    ],
    actions: ["Tạo sổ tay mới", "Vào Tiện ích để thử đồng hồ", "Dùng dịch thuật khi học bài đọc"],
    tip: "Dùng sổ tay để ghi lỗi hay sai sau mỗi trận Arena hoặc bài quiz, hiệu quả hơn học lan man.",
  },
  {
    id: "social",
    title: "Bạn bè, cộng đồng và thông báo",
    subtitle: "Kết bạn, nhắn tin, chia sẻ flashcard/quiz và nhận thông báo quan trọng ở chuông.",
    icon: Users,
    path: "/friends",
    mascot: MASCOTS[8],
    color: "from-lime-500 to-green-600",
    bullets: [
      "Tìm bạn bằng tên/email, gửi lời mời, chấp nhận hoặc từ chối ngay trong trang Bạn bè.",
      "Bạn bè có thể nhắn tin và chia sẻ thư mục flashcard hoặc quiz.",
      "Khi nhận học liệu chia sẻ, bạn phải xem trước trước khi lưu vào tài khoản cá nhân.",
    ],
    actions: ["Tìm một người bạn", "Gửi lời mời", "Kiểm tra chuông thông báo khi có tin nhắn/chia sẻ"],
    tip: "Xem trước trước khi lưu giúp tránh làm rối kho flashcard/quiz cá nhân.",
  },
  {
    id: "settings",
    title: "Cá nhân hóa tài khoản",
    subtitle: "Cập nhật hồ sơ, giao diện sáng/tối, màu nhấn và các tùy chọn học tập.",
    icon: ShieldCheck,
    path: "/settings",
    mascot: MASCOTS[9],
    color: "from-indigo-500 to-blue-700",
    bullets: [
      "Trang Hồ sơ dùng để cập nhật tên, ảnh đại diện, tiểu sử và xem cấp độ hiện tại.",
      "Trang Cài đặt cho phép chọn giao diện sáng, tối hoặc theo máy, kèm màu nhấn.",
      "Các tùy chọn được lưu theo tài khoản để dùng lại ở thiết bị khác.",
    ],
    actions: ["Mở Cài đặt", "Chọn giao diện tối nếu học ban đêm", "Cập nhật hồ sơ để bạn bè dễ nhận ra"],
    tip: "Hoàn tất bước này là bạn đã sẵn sàng dùng ZenTask đầy đủ.",
  },
  {
    id: "done",
    title: "Bạn đã sẵn sàng học rồi!",
    subtitle: "Hãy chọn một mục nhỏ để bắt đầu ngay: flashcard, quiz, 4 kỹ năng hoặc Arena.",
    icon: Sparkles,
    path: "/flashcards",
    mascot: MASCOTS[10],
    color: "from-blue-600 to-violet-700",
    bullets: [
      "Nếu học một mình: bắt đầu với Flashcard hoặc Quiz có sẵn.",
      "Nếu muốn vui hơn: vào Arena để đấu hạng hoặc tạo giải đấu với bạn bè.",
      "Nếu cần trợ giúp: mở Trợ lý AI để hỏi cách học, sửa câu hoặc tạo ví dụ.",
    ],
    actions: ["Bấm Hoàn tất", "Chọn một tính năng", "Duy trì streak mỗi ngày"],
    tip: "Mục tiêu tốt nhất cho ngày đầu: hoàn thành 1 chủ đề beginner, 1 quiz và 1 trận Arena.",
  },
];

export default function FirstLoginOnboarding() {
  const { user, updateUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const forcedByUrl = searchParams.get("tour") === "1";
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const completed = Boolean(user.onboarding?.completed);
    const lastStep = Math.max(0, Math.min(steps.length - 1, Number(user.onboarding?.lastStep || 0)));
    if (forcedByUrl || !completed) {
      setStepIndex(forcedByUrl ? 0 : lastStep);
      setIsOpen(true);
    }
  }, [user?.uid, user?.onboarding?.completed, user?.onboarding?.lastStep, forcedByUrl]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goBack();
      if (event.key === "Escape") remindLater();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, stepIndex]);

  if (!user || !isOpen) return null;

  const current = steps[stepIndex];
  const Icon = current.icon;
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);

  const saveProgress = async (nextStep: number) => {
    try {
      await onboardingService.save({ lastStep: nextStep });
      updateUser({ onboarding: { ...(user.onboarding || {}), lastStep: nextStep } as any });
    } catch (err) {
      // Do not block the tour if the network is temporarily unavailable.
      console.error("Could not save onboarding progress", err);
    }
  };

  function removeTourQuery() {
    if (!forcedByUrl) return;
    const params = new URLSearchParams(location.search);
    params.delete("tour");
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }

  function goNext() {
    if (stepIndex >= steps.length - 1) {
      completeTour();
      return;
    }
    const next = stepIndex + 1;
    setStepIndex(next);
    saveProgress(next);
  }

  function goBack() {
    const next = Math.max(0, stepIndex - 1);
    setStepIndex(next);
    saveProgress(next);
  }

  async function completeTour() {
    setSaving(true);
    try {
      const onboarding = await onboardingService.save({ completed: true, lastStep: steps.length - 1 });
      updateUser({ onboarding: { ...(user.onboarding || {}), ...(onboarding || {}), completed: true, lastStep: steps.length - 1 } as any });
      toast.success("Đã hoàn tất hướng dẫn. Chúc bạn học tốt!");
      setIsOpen(false);
      removeTourQuery();
    } catch (err) {
      toast.error("Chưa lưu được trạng thái hướng dẫn. Hãy thử lại.");
    } finally {
      setSaving(false);
    }
  }

  async function skipTour() {
    setSaving(true);
    try {
      const onboarding = await onboardingService.save({ skipped: true, lastStep: stepIndex });
      updateUser({ onboarding: { ...(user.onboarding || {}), ...(onboarding || {}), completed: true, skipped: true, lastStep: stepIndex } as any });
      toast.success("Đã ẩn hướng dẫn lần đầu.");
      setIsOpen(false);
      removeTourQuery();
    } catch (err) {
      toast.error("Chưa lưu được. Hãy thử lại.");
    } finally {
      setSaving(false);
    }
  }

  function remindLater() {
    setIsOpen(false);
    saveProgress(stepIndex);
    toast("Mình sẽ nhắc lại hướng dẫn ở lần đăng nhập sau.");
    removeTourQuery();
  }

  function openFeature() {
    if (current.path) {
      navigate(current.path);
    }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/70 p-3 md:p-6 backdrop-blur-sm">
      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl md:grid-cols-[0.9fr_1.35fr]">
        <button
          type="button"
          onClick={remindLater}
          className="absolute right-4 top-4 z-20 rounded-full bg-white/90 p-2 text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-900"
          aria-label="Đóng hướng dẫn"
        >
          <X className="h-5 w-5" />
        </button>

        <div className={`relative min-h-[260px] overflow-hidden bg-gradient-to-br ${current.color} p-6 text-white md:min-h-[640px] md:p-8`}>
          <div className="absolute -left-16 -top-16 h-52 w-52 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-white/10" />
          <div className="relative z-10 flex h-full flex-col">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/20">
              <Wand2 className="h-4 w-4" />
              Hướng dẫn lần đầu
            </div>

            <div className="mt-6 flex flex-1 flex-col items-center justify-center text-center">
              <div className="relative">
                <div className="absolute inset-x-8 bottom-1 h-10 rounded-full bg-black/15 blur-xl" />
                <img src={current.mascot} alt="Lopy mascot" className="relative mx-auto max-h-52 w-auto object-contain drop-shadow-2xl md:max-h-72" />
              </div>
              <div className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-3 text-left ring-1 ring-white/15">
                <Icon className="h-7 w-7 shrink-0" />
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/70">Lopy gợi ý</p>
                  <p className="text-sm font-semibold leading-snug">{current.tip}</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white/80">
                <span>
                  Bước {stepIndex + 1}/{steps.length}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-white transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex max-h-[88vh] flex-col overflow-y-auto p-5 md:p-8">
          <div className="pr-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700">
              <Sparkles className="h-4 w-4" />
              Dành cho tài khoản mới
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 md:text-4xl">{current.title}</h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600 md:text-lg">{current.subtitle}</p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500">
                <BookOpen className="h-4 w-4" />
                Bạn cần biết
              </div>
              <div className="space-y-3">
                {current.bullets.map((item, idx) => (
                  <div key={idx} className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    <p className="text-sm font-medium leading-relaxed text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-blue-50/70 p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-blue-600">
                <BrainCircuit className="h-4 w-4" />
                Nên làm thử
              </div>
              <div className="space-y-3">
                {current.actions.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-blue-100">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">{idx + 1}</div>
                    <p className="text-sm font-bold leading-relaxed text-slate-800">{item}</p>
                  </div>
                ))}
              </div>
              {current.path && (
                <button
                  type="button"
                  onClick={openFeature}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                >
                  Đến trang này
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {steps.map((step, idx) => {
              const DotIcon = step.icon;
              const active = idx === stepIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    setStepIndex(idx);
                    saveProgress(idx);
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition ${active ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                >
                  <DotIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{idx + 1}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={skipTour} disabled={saving} className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60">
                Bỏ qua hướng dẫn
              </button>
              <button type="button" onClick={remindLater} className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
                Nhắc lại sau
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={goBack}
                disabled={stepIndex === 0}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" />
                Lùi
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl shadow-slate-950/20 transition hover:bg-slate-800 disabled:opacity-60"
              >
                {stepIndex >= steps.length - 1 ? "Hoàn tất" : "Tiếp"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
