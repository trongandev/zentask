export const LANGUAGE_LEVELS: Record<string, { id: string; name: string; description: string }[]> = {
  en: [
    { id: "A1", name: "A1 (Mới bắt đầu)", description: "Chưa biết gì hoặc biết rất ít. Giao tiếp cơ bản." },
    { id: "A2", name: "A2 (Sơ cấp)", description: "Giao tiếp trong các tình huống quen thuộc hàng ngày." },
    { id: "B1", name: "B1 (Trung cấp)", description: "Đọc hiểu cơ bản, tự tin xử lý các tình huống khi đi du lịch." },
    { id: "B2", name: "B2 (Trung cao cấp)", description: "Hiểu ý chính của văn bản phức tạp, giao tiếp lưu loát." },
    { id: "C1", name: "C1 (Cao cấp)", description: "Diễn đạt trôi chảy, sử dụng ngôn ngữ linh hoạt cho công việc, học tập." },
    { id: "C2", name: "C2 (Thành thạo)", description: "Hiểu dễ dàng hầu hết mọi thứ, diễn đạt chính xác các ý nghĩa tinh tế." },
  ],
  zh: [
    { id: "HSK1", name: "HSK 1 (Mới bắt đầu)", description: "Hiểu và sử dụng các từ vựng, câu tiếng Trung đơn giản nhất." },
    { id: "HSK2", name: "HSK 2 (Sơ cấp)", description: "Giao tiếp cơ bản về các chủ đề quen thuộc hàng ngày." },
    { id: "HSK3", name: "HSK 3 (Trung cấp)", description: "Giao tiếp cơ bản trong cuộc sống, học tập và công việc." },
    { id: "HSK4", name: "HSK 4 (Trung cao cấp)", description: "Thảo luận về nhiều chủ đề, giao tiếp lưu loát với người bản xứ." },
    { id: "HSK5", name: "HSK 5 (Cao cấp)", description: "Đọc báo chí, tạp chí, xem phim ảnh truyền hình Trung Quốc." },
    { id: "HSK6", name: "HSK 6 (Thành thạo)", description: "Dễ dàng hiểu thông tin tiếng Trung, diễn đạt lưu loát ý kiến cá nhân." },
  ],
  ja: [
    { id: "N5", name: "N5 (Mới bắt đầu)", description: "Hiểu một chút tiếng Nhật cơ bản." },
    { id: "N4", name: "N4 (Sơ cấp)", description: "Hiểu tiếng Nhật cơ bản dùng trong đời sống hàng ngày." },
    { id: "N3", name: "N3 (Trung cấp)", description: "Có thể giao tiếp ở mức độ nhất định trong các tình huống hàng ngày." },
    { id: "N2", name: "N2 (Trung cao cấp)", description: "Hiểu tiếng Nhật dùng trong các tình huống đa dạng, giao tiếp lưu loát." },
    { id: "N1", name: "N1 (Thành thạo)", description: "Có khả năng hiểu tiếng Nhật dùng trong nhiều hoàn cảnh đa dạng." },
  ],
  ko: [
    { id: "TOPIK1", name: "TOPIK 1 (Sơ cấp 1)", description: "Tiến hành các chức năng ngôn ngữ cơ bản trong cuộc sống." },
    { id: "TOPIK2", name: "TOPIK 2 (Sơ cấp 2)", description: "Sử dụng tiếng Hàn ở những nơi công cộng đơn giản." },
    { id: "TOPIK3", name: "TOPIK 3 (Trung cấp 1)", description: "Không gặp khó khăn khi duy trì các quan hệ xã hội cơ bản." },
    { id: "TOPIK4", name: "TOPIK 4 (Trung cấp 2)", description: "Hiểu nội dung tin tức, đọc các văn bản chung." },
    { id: "TOPIK5", name: "TOPIK 5 (Cao cấp 1)", description: "Thực hiện chức năng ngôn ngữ ở mức độ nghiên cứu, chuyên môn." },
    { id: "TOPIK6", name: "TOPIK 6 (Cao cấp 2)", description: "Thực hiện thành thạo công việc chuyên môn không khó khăn gì." },
  ]
};

export const getDefaultLevels = () => [
  { id: "Beginner", name: "Mới bắt đầu", description: "Chưa biết gì hoặc biết rất ít." },
  { id: "Intermediate", name: "Trung cấp", description: "Có thể giao tiếp cơ bản, hiểu các đoạn hội thoại đơn giản." },
  { id: "Advanced", name: "Nâng cao", description: "Giao tiếp thành thạo, hiểu tài liệu phức tạp." },
];
