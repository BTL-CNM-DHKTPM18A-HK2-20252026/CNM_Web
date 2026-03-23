# Checklist Kiểm thử Chức năng Đăng ký Tài khoản (Registration Test Checklist)

Tài liệu này tổng hợp các trường hợp kiểm thử (Test Cases) quan trọng để đảm bảo chức năng đăng ký hoạt động ổn định, bảo mật và mang lại trải nghiệm tốt nhất cho người dùng.

## 1. Kiểm thử chức năng (Functional Testing)
- [ ] **Trường hợp thành công (Happy Path)**: Nhập đầy đủ, chính xác tất cả các trường → Đăng ký thành công và chuyển hướng.
- [ ] **Các trường bắt buộc (Mandatory fields)**: Để trống bất kỳ trường bắt buộc nào (Họ tên, Email, SĐT, Mật khẩu...) → Hệ thống báo lỗi.
- [ ] **Kiểm tra trùng lặp (Duplicate check)**: Đăng ký với Email hoặc SĐT đã tồn tại → Báo lỗi phù hợp (ví dụ: "Tài khoản đã tồn tại").
- [ ] **Định dạng Email**: Nhập thiếu `@`, thiếu tên miền, hoặc có ký tự không hợp lệ → Báo lỗi định dạng.
- [ ] **Xác nhận mật khẩu (Confirm password)**: Nhập mật khẩu xác nhận không trùng khớp → Hệ thống chặn và báo lỗi.
- [ ] **Định dạng Số điện thoại**: Kiểm tra các đầu số di động Việt Nam (03, 05, 07, 08, 09) và độ dài đúng 10 chữ số.

## 2. Kiểm thử bảo mật (Security Testing)
- [ ] **Độ phức tạp mật khẩu (Password Complexity)**: 
    - [ ] Độ dài tối thiểu 8 ký tự.
    - [ ] Có chữ hoa, chữ thường.
    - [ ] Có ít nhất 1 chữ số.
    - [ ] Có ít nhất 1 ký tự đặc biệt (`!@#$%^&*`).
- [ ] **Mã hóa dữ liệu (Data Encryption)**: Mật khẩu lưu vào DB phải được hash/salt (không lưu plain text).
- [ ] **Chống tấn công Scripting (XSS/SQLi)**: Thử nhập mã độc (`<script>`, `' OR 1=1`) vào các ô input.
- [ ] **Tự động tạo mật khẩu**: Đảm bảo mật khẩu được tạo tự động luôn thỏa mãn quy tắc độ mạnh.

## 3. Kiểm thử giao diện & Trải nghiệm (UI/UX Testing)
- [ ] **Thông báo lỗi (Error messages)**: Hiển thị rõ ràng, dễ hiểu và đúng vị trí.
- [ ] **Tooltip hướng dẫn**: Di chuột vào icon ổ khóa, SĐT, Email hiển thị quy định nhập liệu đúng.
- [ ] **Ẩn/Hiện mật khẩu**: Nút "mắt" hoạt động đúng cho cả trường Mật khẩu và Xác nhận mật khẩu.
- [ ] **Tương thích (Responsiveness)**: Kiểm tra hiển thị trên Web Chrome/Edge, Mobile (Android/iOS).
- [ ] **Tự động lấy nét (Auto-focus)**: Con trỏ chuột nằm ở ô đầu tiên khi mở form đăng ký.

## 4. Bảng tóm tắt các Test Cases

| STT | Trường hợp kiểm thử (Test Case) | Kết quả mong đợi (Expected Result) | Trạng thái |
|:---:|:---|:---|:---:|
| 1 | Để trống tất cả các trường | Hiện lỗi yêu cầu nhập liệu | [ ] |
| 2 | Nhập Email sai định dạng | Báo lỗi "Email không hợp lệ" | [ ] |
| 3 | Mật khẩu không đủ độ mạnh | Yêu cầu thêm ký tự/số/chữ hoa | [ ] |
| 4 | SĐT sai đầu số hoặc độ dài | Báo lỗi định dạng SĐT Việt Nam | [ ] |
| 5 | Mật khẩu xác nhận không khớp | Báo lỗi mật khẩu không trùng khớp | [ ] |
| 6 | Đăng ký thành công | Chuyển đến trang chủ/đăng nhập | [ ] |
| 7 | Nhấn nút "Đăng ký" liên tiếp | Tránh tạo trùng lặp (Spam protection) | [ ] |

---
**Ngày cập nhật cuối**: 23/03/2026
**Phụ trách**: Antigravity Assistant
