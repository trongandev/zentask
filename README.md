# ZenTask

ZenTask là nền tảng học tập đa tính năng, tập trung vào học tiếng Anh, flashcard, quiz, ghi chú, AI hỗ trợ học tập, xử lý phụ đề, bạn bè và các tiện ích cá nhân. Dự án gồm **frontend React** và **backend Node.js/Express**, dữ liệu người dùng được lưu trên **Firebase/Firestore**.

## Mục lục

- [Tính năng chính](#tính-năng-chính)
- [Các tính năng mới đã thêm](#các-tính-năng-mới-đã-thêm)
- [Cách hoạt động chi tiết](#cách-hoạt-động-chi-tiết)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Cài đặt và chạy dự án](#cài-đặt-và-chạy-dự-án)
- [Biến môi trường](#biến-môi-trường)
- [Lưu ý bảo mật](#lưu-ý-bảo-mật)
- [Quy trình Git cơ bản](#quy-trình-git-cơ-bản)

---

## Tính năng chính

ZenTask hiện bao gồm:

- Đăng nhập / đăng ký người dùng
- Dashboard học tập
- Flashcard và thư mục flashcard
- Quiz và phòng quiz
- Grammar / Tenses / Beginner course
- Subtitle AI
- AI Chat
- Notebook
- Tiện ích học tập
- Bạn bè, nhắn tin và chia sẻ học liệu
- Chuông thông báo
- Giao diện sáng / tối / theo máy
- Lưu dữ liệu theo tài khoản trên Firebase

---

## Các tính năng mới đã thêm

### 1. Subtitle AI

Tính năng Subtitle AI cho phép người dùng tạo phụ đề từ video và xuất video có phụ đề.

Các chức năng chính:

- Upload video
- Tách âm thanh từ video
- Nhận dạng giọng nói bằng Whisper
- Tạo file SRT
- Dịch phụ đề
- Burn phụ đề vào video bằng backend FFmpeg
- Giữ lại âm thanh gốc
- Hỗ trợ video ngang và video dọc
- Tự xuống dòng phụ đề để không tràn khỏi video
- Không dùng canvas để export video nhằm tránh khựng hình / freeze frame

Luồng hoạt động:

```text
Frontend upload video
→ Backend nhận video
→ FFmpeg tách audio 16kHz mono
→ Whisper backend nhận dạng giọng nói
→ Tạo SRT
→ FFmpeg burn subtitle vào video
→ Trả về MP4 final cho frontend
```

Lý do chuyển sang backend:

- Canvas/MediaRecorder trong browser dễ bị freeze
- ffmpeg.wasm nặng và dễ thiếu filter phụ đề
- Backend FFmpeg native ổn định hơn, ít lệch âm thanh và khung hình hơn

---

### 2. AI Chat

Trang AI Chat cho phép người dùng trò chuyện với AI và tạo ảnh minh họa.

Các chức năng chính:

- Chat với Gemini
- Upload hình ảnh để AI phân tích
- Tự đổi Gemini key nếu key hiện tại bị lỗi hoặc hết quota
- Tạo ảnh bằng Hugging Face
- Người dùng có thể nhập prompt tiếng Việt
- Backend tự dịch prompt sang tiếng Anh trước khi gửi sang Hugging Face
- Hiển thị nội dung có `**chữ đậm**` đúng định dạng
- Giao diện thân thiện, không hiển thị thuật ngữ kỹ thuật với người dùng

Luồng chat:

```text
Người dùng nhập câu hỏi / upload ảnh
→ Frontend gửi lên backend
→ Backend gọi Gemini bằng key trong .env
→ Nếu key lỗi, backend thử key tiếp theo
→ Trả câu trả lời về frontend
```

Luồng tạo ảnh:

```text
Người dùng nhập mô tả ảnh bằng tiếng Việt
→ Backend dùng Gemini dịch sang tiếng Anh
→ Backend gửi prompt tiếng Anh sang Hugging Face
→ Hugging Face trả ảnh
→ Frontend hiển thị và cho tải ảnh
```

Lưu ý:

- API key Gemini và Hugging Face chỉ nằm trong backend `.env`
- Frontend không giữ key để tránh lộ khi build public

---

### 3. Notebook / Sổ tay

Notebook là trang ghi chú học tập dạng bảng trắng.

Các chức năng chính:

- Vẽ bằng bút
- Bút đánh dấu
- Tẩy
- Thêm ghi chú màu
- Thêm hộp chữ
- Thêm hình ảnh hoặc ảnh động bằng đường dẫn
- Kéo thả vật thể
- Đổi kích thước vật thể
- Nhiều trang trong một sổ tay
- Nhân bản trang
- Xóa trang
- Đổi nền trang: trắng, ô ly, chấm, dòng kẻ
- Hoàn tác / làm lại
- Zoom
- Sao lưu dữ liệu
- Tự lưu lên Firebase
- Giao diện mobile đã được tối ưu

Cách lưu dữ liệu:

Notebook không lưu dưới dạng ảnh tĩnh. Mỗi nét vẽ, ghi chú, text, ảnh/GIF được lưu dưới dạng dữ liệu cấu trúc.

Ví dụ:

```json
{
  "title": "Sổ tay học tiếng Anh",
  "pages": [
    {
      "title": "Trang 1",
      "background": "grid",
      "strokes": [],
      "items": []
    }
  ]
}
```

Ưu điểm:

- Nhẹ hơn ảnh
- Có thể sửa lại từng phần
- Có thể kéo, xóa, đổi kích thước
- Dễ mở rộng thêm tính năng sau này

---

### 4. Flashcard

Flashcard đã được cải thiện thêm phần thư mục và kéo thả.

Các chức năng chính:

- Tạo bộ thẻ
- Tạo thư mục flashcard
- Kéo bộ thẻ vào thư mục
- Kéo bộ thẻ ra vùng chưa phân loại
- Vùng "Bộ thẻ chưa phân loại" vẫn nhận thả kể cả khi đang rỗng
- Fix lỗi kéo ra ngoài nhưng `folderId` không đổi
- Lưu thay đổi folder lên Firebase

Cách hoạt động kéo thả:

```text
Người dùng kéo bộ thẻ
→ Frontend xác định vùng thả bằng tọa độ con trỏ
→ Nếu thả vào thư mục: set folderId = folder.id
→ Nếu thả vào vùng chưa phân loại: set folderId = null
→ Gửi cập nhật lên backend/Firebase
```

Điểm đã sửa:

- Không phụ thuộc hoàn toàn vào `over.id` của thư viện kéo thả
- Ưu tiên xác định vùng thả thực tế bằng vị trí con trỏ
- Vùng chưa phân loại có dropzone riêng, kể cả khi rỗng

---

### 5. Bạn bè

Trang Bạn bè cho phép người dùng kết nối và chia sẻ học liệu.

Các chức năng chính:

- Tìm người dùng theo tên hoặc email
- Gửi lời mời kết bạn
- Chấp nhận hoặc từ chối lời mời
- Gửi thông báo vào chuông khi có lời mời
- Gửi thông báo khi lời mời được chấp nhận
- Danh sách bạn bè
- Nhắn tin giữa bạn bè
- Chia sẻ thư mục flashcard
- Chia sẻ quiz
- Xem trước học liệu trước khi lưu
- Lưu flashcard/quiz được chia sẻ vào tài khoản cá nhân

Luồng kết bạn:

```text
Người A gửi lời mời
→ Backend tạo friend_request
→ Backend tạo notification cho người B
→ Người B chấp nhận hoặc từ chối
→ Nếu chấp nhận, backend tạo friendship
→ Backend gửi notification cho người A
```

Luồng chia sẻ flashcard:

```text
Người A chia sẻ thư mục flashcard
→ Tin nhắn chia sẻ xuất hiện trong chat
→ Người B bấm xem trước
→ Frontend hiển thị danh sách thẻ
→ Người B bấm lưu
→ Backend copy bộ thẻ vào tài khoản người B
```

Lưu ý quan trọng:

Người nhận không tự động lưu flashcard ngay. Hệ thống bắt buộc người nhận xem trước trước khi lưu để tránh lưu nhầm nội dung không mong muốn.

---

### 6. Chuông thông báo

Thông báo dùng để báo các sự kiện quan trọng trong app.

Các loại thông báo mới:

- Lời mời kết bạn
- Lời mời được chấp nhận
- Tin nhắn mới
- Chia sẻ flashcard
- Chia sẻ quiz

Khi người dùng bấm vào thông báo liên quan bạn bè, app sẽ dẫn về trang:

```text
/friends
```

---

### 7. Tiện ích

Trang Tiện ích gồm 3 nhóm: máy tính, đồng hồ và dịch thuật.

Route:

```text
/utilities
```

#### 7.1. Máy tính

Có 2 chế độ:

- Máy tính cơ bản
- Máy tính nâng cao

Máy tính cơ bản gồm:

- Cộng
- Trừ
- Nhân
- Chia
- Phần trăm
- Đổi dấu
- Xóa
- Xóa lùi
- Dấu thập phân
- Tính kết quả

Máy tính nâng cao gồm:

- Giải phương trình
- Giải hệ phương trình 2 ẩn
- Tính biểu thức nâng cao
- Căn bậc hai
- Bình phương
- Lũy thừa
- Pi
- Giá trị tuyệt đối
- sin / cos / tan
- log / ln
- Làm tròn
- Dấu ngoặc
- Mẫu công thức có sẵn

Người dùng không cần gõ `sqrt`, `^`, `sin` thủ công. Có nút để chèn công thức.

Ví dụ:

```text
Bấm √ → tự chèn √()
Bấm x² → tự chèn ^2
Bấm Hệ 2 ẩn → tự chèn mẫu hệ phương trình
```

Lịch sử tính:

- Mỗi phép tính được lưu vào Firebase
- Bấm vào lịch sử sẽ hiện lại phép tính và kết quả
- Có thể xóa lịch sử

#### 7.2. Đồng hồ

Có 3 chế độ:

- Đếm xuôi
- Đếm ngược
- Phương pháp học

Đếm xuôi hoạt động như đồng hồ bấm giờ:

```text
Bắt đầu
Tạm dừng
Đặt lại
```

Đếm ngược hoạt động như hẹn giờ:

```text
Nhập thời gian
Bắt đầu
Tạm dừng
Đặt lại
Thông báo khi hết giờ
```

Phương pháp học:

Có sẵn một số phương pháp học như:

- Pomodoro nhẹ
- Tập trung sâu
- Ôn bài nhanh
- Nước rút 60 phút

Người dùng có thể tạo phương pháp riêng gồm:

- Tên phương pháp
- Thời gian học
- Thời gian mỗi lần nghỉ
- Số lần nghỉ

Người dùng cũng có thể:

- Sửa phương pháp học tự tạo
- Xóa phương pháp học tự tạo
- Hủy khi đang chỉnh sửa
- Lưu phương pháp lên Firebase

Cách chia thời gian nghỉ:

```text
Tổng thời gian học được chia đều theo số lần nghỉ.
Ví dụ học 60 phút, nghỉ 2 lần:
Học 20 phút
Nghỉ
Học 20 phút
Nghỉ
Học 20 phút
```

Khi đến giờ nghỉ hoặc kết thúc phiên học, app hiển thị thông báo trong web.

#### 7.3. Dịch thuật

Dịch thuật gồm:

- Dịch văn bản thường
- Chọn ngôn ngữ nguồn
- Chọn ngôn ngữ đích
- Lưu lịch sử dịch
- Đọc giọng văn bản gốc
- Đọc giọng bản dịch
- Chọn giọng đọc từ danh sách giọng có sẵn

Lịch sử dịch được lưu theo tài khoản.

---

### 8. Grammar - Câu điều kiện

Trang lý thuyết ngữ pháp phần câu điều kiện đã được bổ sung đầy đủ.

Các loại đã có mô phỏng:

- Loại 0
- Loại 1
- Loại 2
- Loại 3

Mỗi loại gồm:

- Công thức
- Cách dùng
- Ví dụ tiếng Anh
- Nghĩa tiếng Việt
- Mô phỏng tình huống
- Công tắc chuyển giữa thực tế và giả định

Ví dụ:

```text
Loại 0: Sự thật hiển nhiên
If water reaches 100°C, it boils.

Loại 1: Điều có thể xảy ra ở hiện tại/tương lai
If it rains, I will stay at home.

Loại 2: Điều không có thật ở hiện tại
If I had more time, I would learn English every day.

Loại 3: Điều không có thật trong quá khứ
If I had studied harder, I would have passed the exam.
```

---

### 9. Giao diện sáng / tối

Trong trang Cài đặt, người dùng có thể chọn giao diện:

- Sáng
- Tối
- Theo máy

Ngoài ra có thể chọn màu nhấn:

- Xanh dương
- Tím
- Xanh lá
- Cam
- Hồng
- Ghi

Cài đặt được lưu vào Firebase theo tài khoản.

Dữ liệu mẫu:

```json
{
  "appSettings": {
    "theme": "dark",
    "accentColor": "purple"
  }
}
```

---

## Cách hoạt động chi tiết

### Frontend

Frontend chịu trách nhiệm:

- Hiển thị giao diện
- Nhận thao tác người dùng
- Gọi API backend
- Hiển thị dữ liệu trả về
- Quản lý trạng thái tạm thời trong trình duyệt
- Hiển thị preview flashcard/quiz trước khi lưu
- Hiển thị thông báo trong web

### Backend

Backend chịu trách nhiệm:

- Xác thực người dùng
- Gọi Firebase Admin
- Lưu dữ liệu Firestore
- Gọi Gemini API
- Gọi Hugging Face API
- Chạy FFmpeg native
- Xử lý Whisper backend
- Tạo thông báo
- Copy dữ liệu chia sẻ giữa người dùng

### Firebase / Firestore

Firestore lưu:

- Người dùng
- Flashcard
- Quiz
- Notebook
- Bạn bè
- Tin nhắn
- Thông báo
- Lịch sử máy tính
- Lịch sử dịch
- Phương pháp học
- Cài đặt giao diện

---

## Cấu trúc dự án

Ví dụ cấu trúc repo:

```text
zentask/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── features/
│   │   ├── pages/
│   │   ├── services/
│   │   └── lib/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── config/
│   │   └── app.js
│   ├── package.json
│   └── .env
│
└── README.md
```

Các file quan trọng mới:

```text
frontend/src/pages/Friends.tsx
frontend/src/pages/Utilities.tsx
frontend/src/pages/Notebook.tsx
frontend/src/pages/AIChat.tsx
frontend/src/features/subtitle-ai/SubtitleAI.tsx

frontend/src/services/friendsService.ts
frontend/src/services/utilitiesService.ts
frontend/src/services/notebookService.ts
frontend/src/services/aiChatService.ts

backend/src/routes/friends.js
backend/src/routes/utilities.js
backend/src/routes/notebook.js
backend/src/routes/ai.js
backend/src/routes/subtitle.js
```

---

## Cài đặt và chạy dự án

### 1. Clone repo

```bash
git clone https://github.com/your-username/zentask.git
cd zentask
```

### 2. Cài backend

```bash
cd backend
npm install
npm run dev
```

Backend mặc định chạy ở:

```text
http://localhost:3001
```

### 3. Cài frontend

Mở terminal khác:

```bash
cd frontend
npm install
npm run dev
```

Frontend mặc định chạy ở:

```text
http://localhost:5173
```

---

## Biến môi trường

### Frontend `.env`

```env
VITE_API_BACKEND=http://localhost:3001
```

### Backend `.env`

Ví dụ:

```env
PORT=3001
NODE_ENV=development

GEMINI_MODEL=gemini-2.5-flash
GEMINI_TRANSLATE_MODEL=gemini-2.5-flash

GEMINI_API_KEY=
GEMINI_API_KEYS=

API_KEY_AI_1=
API_KEY_AI_2=
API_KEY_AI_3=
API_KEY_AI_4=
API_KEY_AI_5=

HF_TOKEN=
HF_TOKENS=
HF_IMAGE_MODEL=black-forest-labs/FLUX.1-dev
HF_PROVIDER=auto

AI_UPLOAD_MAX_MB=8
```

Nếu dùng Firebase Admin, cần cấu hình service account theo cách dự án backend hiện đang dùng.

---

## FFmpeg

Tính năng burn subtitle cần FFmpeg native.

### Cài trên Windows

```bash
winget install Gyan.FFmpeg
```

Kiểm tra:

```bash
ffmpeg -version
ffmpeg -filters | findstr /i "ass subtitles"
```

Cần có filter `ass` hoặc `subtitles` để burn phụ đề.

---

## Lưu ý bảo mật

Không commit các file sau lên GitHub:

```text
.env
.env.local
.env.production
node_modules
dist
build
uploads
tmp
```

Nên có `.gitignore`:

```gitignore
node_modules
dist
build
.env
.env.local
.env.production
.DS_Store
*.log
uploads
tmp
```

Không đưa các key này lên GitHub:

- Gemini API key
- Hugging Face token
- Firebase Admin private key
- Các token đăng nhập
- File cấu hình riêng của server

---

## Quy trình Git cơ bản

Sau khi sửa code:

```bash
git status
git add .
git commit -m "feat: add friends utilities notebook ai subtitle and theme features"
git push origin main
```

Nếu branch là `master`:

```bash
git push origin master
```

---

## Ghi chú phát triển tiếp

Một số hướng có thể nâng cấp sau này:

- Realtime chat bằng Socket.IO
- Realtime collaboration cho Notebook
- Upload ảnh Notebook lên Firebase Storage
- Chia sẻ Notebook giữa bạn bè
- Tìm kiếm trong lịch sử chat và dịch thuật
- Xuất Notebook ra PDF
- Đồng bộ notification realtime
- Thêm markdown đầy đủ trong AI Chat
- Thêm import/export flashcard nâng cao
- Thêm phân quyền chia sẻ flashcard/quiz
