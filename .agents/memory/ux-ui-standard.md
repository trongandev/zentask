# Tiêu chuẩn UX/UI của Zentask (Dựa trên Beginner.tsx)

Tài liệu này định nghĩa phong cách thiết kế giao diện (UI) và trải nghiệm người dùng (UX) chuẩn cho toàn bộ dự án Zentask, được đúc kết từ trang mẫu `Beginner.tsx`.

## 1. Phong cách chung (Vibe & Aesthetic)
- **Gamified & Playful (Gam hóa & Tươi vui):** Lấy cảm hứng mạnh mẽ từ cấu trúc của Duolingo (nút bấm vật lý, thẻ bo góc) nhưng **sử dụng màu sắc nhận diện thương hiệu riêng của Zentask**. Giao diện thân thiện, khuyến khích sự tương tác.
- **Sáng và Rõ ràng:** Nền sáng (`slate-50`), nội dung nổi bật, không dùng thiết kế tối (dark mode) làm mặc định cho các trang học tập.
- **Bo góc (Rounded corners):** Sử dụng triệt để bo tròn để tạo sự thân thiện (`rounded-2xl`, `rounded-3xl`, `rounded-[2rem]`, `rounded-full`). Rất ít góc nhọn.

## 2. Bảng màu (Color Palette)
- **Màu nền (Background):** `bg-slate-50`, `bg-slate-100`, hoặc `bg-white/80` (kết hợp với `backdrop-blur` cho các panel/header nổi).
- **Màu nhấn / Trạng thái (Accent & States):**
  - **Màu chủ đạo (Primary/Active):** Xanh dương thương hiệu (`bg-blue-500`, viền dưới đậm hơn `#2563eb` hoặc `blue-600`).
  - **Hoàn thành (Completed/Gold):** Vàng (`bg-yellow-400`, viền dưới `#d97706`). Dùng cho sao, cấp độ.
  - **Khóa / Chưa mở (Locked/Disabled):** Xám nhạt (`bg-slate-200`, viền dưới `#e2e8f0`).
- **Màu chữ (Typography):**
  - Chữ chính: `text-slate-800` hoặc `text-slate-900`.
  - Chữ phụ / Ghi chú: `text-slate-500` hoặc `text-slate-400`.
  - Text nhấn mạnh: `text-blue-500` hoặc màu trạng thái tương ứng.

## 3. Nút bấm & Tương tác (Tactile Buttons & Interactions)
Nút bấm chính trong hệ thống **phải** có cảm giác vật lý (tactile/3D feel):
- **Cấu trúc nút chuẩn:**
  - Viền ngoài: `border-[4px] border-white`.
  - Đổ bóng vật lý (Shadow dưới đáy): `shadow-[0_8px_0_0_{Màu_đậm_hơn}]`.
- **Hiệu ứng khi tương tác:**
  - **Hover:** Nâng lên nhẹ `hover:-translate-y-1` và tăng bóng dưới đáy `hover:shadow-[0_12px_0_0_{Màu_đậm_hơn}]`.
  - **Active (Click):** Nhấn xuống `active:translate-y-2` và xóa/giảm bóng đáy `active:shadow-[0_0_0_0_{Màu_đậm_hơn}]`. Hoặc với button vuông: `border-b-4` và `active:border-b-0 active:translate-y-1`.
- **Animations:** Sử dụng transition mượt mà (`transition-all duration-200`), animate cho icon (`hover:scale-110`).

## 4. Typography (Nghệ thuật chữ)
- **Tiêu đề (Headings):** Dùng `font-black` (rất đậm) cho các tiêu đề chính, tạo cảm giác mạnh mẽ, rõ ràng (ví dụ: `text-2xl font-black text-slate-800`).
- **Nhãn phụ (Labels/Eyebrows):** Dùng chữ in hoa, khoảng cách chữ rộng (`uppercase tracking-wider`), kích thước nhỏ (`text-[10px]` hoặc `text-xs`), in đậm (`font-bold text-slate-400/500`) để làm nhãn phụ hoặc topic.
- **Body Text:** `font-medium` để nội dung dễ đọc.

## 5. Modal & Panels
- **Backdrop:** Nền mờ kính tối màu: `bg-slate-900/40 backdrop-blur-sm`.
- **Modal Container:** Khối nổi với nền trắng, bóng đổ lớn (`shadow-2xl`), và bo góc cực lớn (`rounded-[2rem]`).
- **Header của Modal:** Phân cách bằng `border-b border-slate-100`, có nút đóng tròn trịa (`w-10 h-10 rounded-full bg-slate-100`).
- **Animation Modal:** Dùng Tailwind-animate: `animate-in fade-in zoom-in-95 duration-200`.

## 6. Icon & Mascot
- Sử dụng icon của thư viện `lucide-react` (nét vẽ khá tròn, chỉnh stroke lớn `stroke-[3]` hoặc `stroke-[4]` nếu dùng làm điểm nhấn).
- Tận dụng mascot (Lopy) để trang trí (`opacity-50 grayscale` khi làm nền hoặc dạng hình ảnh lớn ở modal cổ vũ).

---
*Ghi chú: Khi thiết kế hoặc refactor bất kỳ trang nào (như Auth, Settings), cần đối chiếu với các nguyên tắc trên để đảm bảo tính đồng nhất (consistency) cho toàn bộ ứng dụng Zentask.*
