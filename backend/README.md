# TruyenVN Backend - Hướng dẫn cài đặt

## BƯỚC 1: Cài Node.js
Vào https://nodejs.org → tải bản LTS → cài đặt

## BƯỚC 2: Tạo MongoDB Atlas (Database miễn phí)
1. Vào https://mongodb.com/atlas → Sign Up miễn phí
2. Tạo cluster → chọn M0 FREE
3. Database Access → Add User → đặt username/password
4. Network Access → Add IP → 0.0.0.0/0 (cho phép mọi IP)
5. Connect → Drivers → Copy connection string

## BƯỚC 3: Cài đặt project
Mở terminal trong thư mục backend, chạy:

  npm install

## BƯỚC 4: Cấu hình .env
Mở file .env, thay thế:
  MONGO_URI=  ← dán connection string từ Atlas vào đây
  JWT_SECRET= ← đặt chuỗi bất kỳ dài 32+ ký tự

## BƯỚC 5: Chạy server
  npm run dev    ← chế độ development (tự restart khi sửa code)
  npm start      ← chế độ production

Server chạy tại: http://localhost:5000

## BƯỚC 6: Cập nhật Frontend
Trong file index.html, thêm vào đầu thẻ <script>:

  const API = 'http://localhost:5000/api';

Sau đó thay thế tất cả DB.get/DB.set bằng fetch() gọi API.

## API Endpoints

### Auth
  POST /api/auth/register     → Đăng ký
  POST /api/auth/login        → Đăng nhập
  GET  /api/auth/me           → Lấy thông tin bản thân (cần token)
  PUT  /api/auth/profile      → Cập nhật hồ sơ (cần token)
  POST /api/auth/bookmark/:id → Toggle bookmark (cần token)
  POST /api/auth/upgrade      → Nâng cấp hội viên (cần token)

### Stories
  GET  /api/stories                    → Danh sách truyện
  GET  /api/stories/home               → Dữ liệu trang chủ
  GET  /api/stories/:id                → Chi tiết truyện
  POST /api/stories                    → Đăng truyện (tác giả)
  PUT  /api/stories/:id                → Sửa truyện (tác giả)
  POST /api/stories/:id/rate           → Đánh giá
  POST /api/stories/:id/purchase       → Mua truyện

### Chapters
  GET  /api/chapters/:storyId              → Danh sách chương
  GET  /api/chapters/:storyId/:number      → Đọc chương
  POST /api/chapters/:storyId             → Đăng chương (tác giả)
  PUT  /api/chapters/:storyId/:number     → Sửa chương (tác giả)

### Comments
  GET    /api/comments/:storyId         → Lấy bình luận
  POST   /api/comments/:storyId         → Đăng bình luận (cần token)
  POST   /api/comments/:id/like         → Like bình luận (cần token)
  DELETE /api/comments/:id              → Xóa bình luận (cần token)

## Cách gọi API từ Frontend (ví dụ đăng nhập)

  async function doLogin() {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
  }

  // Gọi API cần xác thực
  const token = localStorage.getItem('token');
  const res = await fetch(`${API}/stories`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
