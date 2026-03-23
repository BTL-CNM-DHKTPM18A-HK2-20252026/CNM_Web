# Tài liệu Triển khai Đăng nhập bằng mã QR (QR Code Login Implementation)

Tính năng đăng nhập bằng mã QR thiết lập một kênh giao tiếp thời gian thực giữa trình duyệt (Web) và ứng dụng di động (App - nơi người dùng đã đăng nhập sẵn). Dưới đây là kiến trúc và các bước thực hiện chi tiết.

## 1. Cơ chế hoạt động (The Flow)

Quy trình dựa trên việc quản lý trạng thái phiên đăng nhập (Session) tạm thời và giao tiếp Real-time.

1.  **Web Client**: Gửi yêu cầu `GET /auth/qr-session` lên Server để lấy một mã định danh duy nhất (UUID).
2.  **Server**: 
    *   Tạo UUID mới.
    *   Lưu vào **Redis** với trạng thái `PENDING` và thời gian sống (TTL) ngắn (ví dụ 120 giây).
    *   Trả UUID về cho Web.
3.  **Web Client**: 
    *   Hiển thị QR Code chứa chuỗi định danh (thường là JSON: `{"action": "login", "uuid": "..."}`).
    *   Mở kết nối **WebSocket** (qua Socket.io) và tham gia vào "room" có tên là UUID đó để nghe thông báo.
4.  **Mobile App**: 
    *   Người dùng quét mã QR $\rightarrow$ App giải mã lấy được UUID.
    *   App gửi yêu cầu `POST /auth/qr-confirm` kèm theo `UUID` và `Access Token` hiện tại của App lên Server.
5.  **Server**: 
    *   Xác nhận UUID hợp lệ trong Redis.
    *   Lấy thông tin người dùng từ Token của App.
    *   Cập nhật trạng thái UUID trong Redis thành `AUTHORIZED`.
    *   Phát tín hiệu (Emit) qua WebSocket tới Web Client: "Xác thực thành công" kèm theo Token mới cho Web.
6.  **Kết quả**: Web Client nhận được Token, tự động chuyển hướng vào trang chủ (Dashboard).

## 2. Chi tiết triển khai kỹ thuật

### Bước 1: Tạo mã QR (Frontend Web)
Sử dụng thư viện `qrcode.react` để tạo QR Code trực tiếp ở Client từ chuỗi JSON hoặc URL định danh. Không nên tạo ảnh ở Server để tiết kiệm băng thông và tài nguyên.

### Bước 2: Quản lý trạng thái với Redis
Dữ liệu phiên QR có tính chất tạm thời và cần tốc độ truy xuất cực nhanh.
*   **Lệnh lưu**: `SET qr_login_[UUID] "PENDING" EX 120`
*   **Lệnh cập nhật**: `SET qr_login_[UUID] "AUTHORIZED:[USER_ID]" EX 30`

### Bước 3: Giao tiếp Real-time
*   **Ưu tiên**: Sử dụng **Socket.io** hoặc **WebSockets**. Web sẽ "lắng nghe" sự kiện từ Server mà không cần tải lại trang.
*   **Dự phòng (Fallback)**: Nếu không dùng Socket, Web có thể sử dụng cơ chế **Polling** (gọi API hỏi trạng thái mỗi 2-3 giây), tuy nhiên cách này sẽ gây tải cho Server nếu số lượng người dùng lớn.

## 3. Các trường hợp kiểm thử (Test Cases)

| Tình huống (Scenario) | Kết quả mong đợi (Expected Result) |
|:--- |:--- |
| **Mã QR hết hạn** | Sau 120s, mã QR mờ đi, hiển thị nút "Làm mới" và ngắt kết nối Socket cũ. |
| **Quét bằng App lạ** | Camera thường hoặc App không được định nghĩa sẽ chỉ hiện text thô, không kích hoạt logic đăng nhập. |
| **App chưa đăng nhập** | Khi quét, App phát hiện chưa có Token và yêu cầu người dùng đăng nhập trên App trước khi quét lại. |
| **Người dùng hủy trên App** | Nếu nhấn "Hủy/Từ chối", Server gửi tín hiệu tới Web để hiển thị thông báo "Yêu cầu bị từ chối". |
| **Mất kết nối mạng** | Web Client phải có cơ chế tự động Reconnect với WebSocket khi mạng ổn định trở lại. |

## 4. Gợi ý Công nghệ (Tech Stack)

*   **Backend**: Node.js (với Socket.io) hoặc Spring Boot (với Spring WebFlux/WebSockets).
*   **Cache**: Redis (lưu trữ Session tạm).
*   **Frontend**: `qrcode.react` (Tạo mã), `socket.io-client` (Kết nối).
*   **Mobile**: Thư viện quét mã chuyên dụng (như `react-native-camera` hoặc `VisionCamera`).

---
**Ngày cập nhật**: 23/03/2026
**Phụ trách**: Antigravity Assistant
