export const SYSTEM_LEVELS = [
  { level: 1, xp: 0, title: "Tân Binh" },
  { level: 2, xp: 50, title: "Học Giả Mới" },
  { level: 3, xp: 150, title: "Thợ Săn Kiến Thức" },
  { level: 4, xp: 350, title: "Người Khám Phá" },
  { level: 5, xp: 650, title: "Kẻ Mộng Mơ" },
  { level: 6, xp: 1050, title: "Chiến Binh Ngôn Ngữ" },
  { level: 7, xp: 1550, title: "Người Giải Mã" },
  { level: 8, xp: 2150, title: "Sứ Giả" },
  { level: 9, xp: 2850, title: "Tri Thức Tinh Anh" },
  { level: 10, xp: 3650, title: "Tiên Phong" },
  { level: 11, xp: 4600, title: "Người Nắm Giữ Chìa Khóa" },
  { level: 12, xp: 5750, title: "Bậc Thầy Tân Cấp" },
  { level: 13, xp: 7150, title: "Trưởng Lão" },
  { level: 14, xp: 8850, title: "Nhà Thông Thái" },
  { level: 15, xp: 10900, title: "Học Giả Thông Tuệ" },
  { level: 16, xp: 13350, title: "Bậc Thầy Ngôn Ngữ" },
  { level: 17, xp: 16250, title: "Sự Hiện Diện Của Trí Tuệ" },
  { level: 18, xp: 19650, title: "Thần Thoại" },
  { level: 19, xp: 23600, title: "Kẻ Được Chọn" },
  { level: 20, xp: 28150, title: "Chúa Tể Ngôn Ngữ" },
];

export const DAILY_TASKS = [
  { 
    id: "create_material",
    title: "Khởi Tạo Chất Liệu", 
    total: 10, 
    icon: "/daily-task/material-init.png", 
    xpPerItem: 5, 
    desc: "Thêm mới thành công từ vựng vào bộ Thẻ lật cá nhân của bạn (+5XP/từ)." 
  },
  { 
    id: "quiz_master",
    title: "Bậc Thầy Đố Vui", 
    total: 2, 
    icon: "/daily-task/master-of-riddles.png", 
    xpPerItem: 20, 
    desc: "Tự thiết kế và xuất bản thành công câu hỏi trắc nghiệm mới (+20XP/câu)." 
  },
  {
    id: "daily_checkin",
    title: "Điểm Tĩnh Mỗi Ngày",
    total: 1,
    icon: "/daily-task/calm-every-day.png",
    xpPerItem: 10,
    desc: "Nhấn nút Điểm danh hàng ngày ngay khi đăng nhập ứng dụng (+10XP).",
  },
  { 
    id: "learn_past",
    title: "Ôn Cố Tri Tân", 
    total: 10, 
    icon: "/daily-task/learn-past.png", 
    xpPerItem: 2, 
    desc: "Hoàn thành việc lật và ôn tập lại từ vựng cũ đã học (+2XP/từ)." 
  },
  { 
    id: "community_share",
    title: "Kẻ Gieo Hạt Tri Thức", 
    total: 1, 
    icon: "/daily-task/sower-of-knl.png", 
    xpPerItem: 30, 
    desc: "Tạo và đăng tải bài viết chia sẻ trong phần Cộng đồng (+30XP/bài)." 
  }
];

export const SYSTEM_BADGES = [
  { id: 1, name: "Chăm chỉ", description: "Học 7 ngày liên tiếp", icon: "/achievement/hard-work.png" },
  { id: 2, name: "Cú đêm", description: "Học sau 10h tối", icon: "/achievement/owl-night.png" },
  { id: 3, name: "Thần đồng từ vựng", description: "Học 1000 từ vựng", icon: "/achievement/vocabulary-prodigy.png" },
  { id: 4, name: "Hoàn hảo", description: "Đạt 100% điểm 5 bài Quiz", icon: "/achievement/perfect.png" },
  { id: 5, name: "Thợ săn thành tích", description: "Vào top 3 bảng xếp hạng tuần", icon: "/achievement/achievements-hunter.png" },
  { id: 6, name: "Dậy sớm", description: "Học trước 6h sáng", icon: "/achievement/wakeup-early.png" },
  { id: 7, name: "Sọt rác", description: "Học liên tục 2 tiếng", icon: "/achievement/trash.png" },
  { id: 8, name: "Kẻ huỷ diệt", description: "Vượt qua 100 bài Quiz", icon: "/achievement/destroyer.png" },
  { id: 9, name: "Ngôi sao hy vọng", description: "Học bù sau khi mất chuỗi", icon: "/achievement/star-of-hope.png" },
];
