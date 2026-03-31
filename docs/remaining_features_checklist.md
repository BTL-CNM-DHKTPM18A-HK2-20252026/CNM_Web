# Checklist chức năng hội thoại chưa hoàn thành

> Cập nhật: 31/03/2026

---

## ❌ Chưa làm (Missing - cần làm cả Backend + Frontend)

- [x] **Ghim tin nhắn (Pin Message)** ✅
  - Backend: `PinnedMessageController`, `PinnedMessageService`, `PinnedMessageRepository` - endpoints `POST /messages/{id}/pin`, `DELETE /messages/{id}/pin`, `GET /messages/conversations/{id}/pinned`
  - Frontend: Context menu Pin/Unpin, pinned message bar dưới header, pinned messages section trong ChatInfoSidebar
  - WebSocket: Broadcast `MESSAGE_PIN` / `MESSAGE_UNPIN` events, auto-refresh pinned list

- [x] **Giải tán nhóm (Dissolve Group)** ✅
  - Backend: Thêm endpoint `DELETE /conversations/{id}/dissolve` (Admin only, xóa nhóm cho tất cả thành viên)
  - Frontend: Thêm nút "Giải tán nhóm" trong ChatInfoSidebar (chỉ hiện cho Admin)
  - WebSocket: Broadcast sự kiện giải tán đến tất cả thành viên

- [x] **Báo xấu tin nhắn/hội thoại (Report)** ✅
  - Backend: Tạo entity `Report`, endpoint `POST /reports` (messageId/conversationId, reason, description)
  - Frontend: Kết nối nút "Báo xấu" trong context menu ConversationList với API

---

## 🟡 Chỉ có UI, chưa có logic (Stub - cần thêm Backend + kết nối Frontend)

- [x] **Tắt thông báo (Mute Conversation)** ✅
  - Backend: Thêm field `mutedUntil` vào `ConversationMember`, endpoint `POST /conversations/{id}/mute` (duration: 1h, 4h, until_8am, forever, off)
  - Frontend: Kết nối menu mute trong ConversationList context menu với API, hiển thị icon mute trên conversation item
  - WebSocket: Broadcast `MUTED` event, real-time cập nhật icon mute

- [x] **Đánh dấu chưa đọc (Mark as Unread)** ✅
  - Backend: Thêm field `isMarkedUnread` vào `ConversationMember`, endpoint `POST /conversations/{id}/mark-unread`
  - Frontend: Kết nối nút trong context menu, hiển thị blue dot badge chưa đọc
  - WebSocket: Broadcast `MARK_UNREAD` event, real-time toggle badge

- [x] **Tin nhắn tự xóa (Auto-delete Messages)** ✅
  - Backend: Thêm field `autoDeleteDuration` vào `Conversation`, endpoint `PATCH /conversations/{id}/auto-delete` (off, 1d, 7d, 30d), Admin/Deputy only cho group
  - Frontend: Kết nối menu auto-delete trong context menu, hiển thị active checkmark, system message broadcast
  - WebSocket: Broadcast `AUTO_DELETE_UPDATED` event đến tất cả thành viên

- [ ] **Sticker**
  - Backend: Thêm `STICKER` vào `MessageType` enum, tạo entity `StickerPack` + `Sticker`, endpoint `GET /stickers/packs`, `GET /stickers/packs/{id}`
  - Frontend: Điền data thật vào StickerPicker (hiện đang rỗng), gửi tin nhắn type STICKER với stickerId

- [x] **Ẩn trò chuyện (Hide Conversation)** ✅
  - Backend: `DELETE /conversations/{id}` set `isHidden=true` (đã có), thêm `GET /conversations/hidden` + `POST /conversations/{id}/unhide`
  - Frontend: Kết nối nút "Ẩn trò chuyện" trong context menu, ẩn conversation khỏi list, modal "Hội thoại đã ẩn" với nút "Hiện lại"
  - WebSocket: Broadcast `CONVERSATION_DELETED` / `CONVERSATION_UNHIDDEN` events

---

## 📋 Thứ tự ưu tiên đề xuất

| Ưu tiên       | Chức năng            | Lý do                              |
| ------------- | -------------------- | ---------------------------------- |
| 🔴 Cao        | Tắt thông báo (Mute) | Chức năng cơ bản, UX quan trọng    |
| 🔴 Cao        | Đánh dấu chưa đọc    | Chức năng cơ bản, UX quan trọng    |
| 🟠 Trung bình | Ghim tin nhắn        | Hữu ích cho nhóm                   |
| 🟠 Trung bình | Ẩn trò chuyện        | Chức năng quản lý                  |
| 🟡 Thấp       | Giải tán nhóm        | Ít dùng, Admin only                |
| 🟡 Thấp       | Tin nhắn tự xóa      | Phức tạp (cần scheduled job)       |
| 🟡 Thấp       | Sticker              | Cần thiết kế/thu thập sticker data |
| ⚪ Tùy chọn   | Báo xấu              | Chức năng moderation               |
