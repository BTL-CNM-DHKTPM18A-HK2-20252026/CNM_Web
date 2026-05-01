# BÁO CÁO KIỂM TRA FRONTEND — CNM_Web

> **Next.js 16.1.4 + React 19** | Ngày kiểm tra: 01/05/2026  
> Người kiểm tra: GitHub Copilot (Senior Frontend Architect AI)

---

## MỤC LỤC

1. [Kiểm Tra Hiệu Năng Frontend](#1-kiểm-tra-hiệu-năng-frontend)
2. [Đánh Giá Component & Logic](#2-đánh-giá-component--logic)
3. [Kiểm Tra Accessibility & SEO](#3-kiểm-tra-accessibility--seo)
4. [Bảng Điểm Thực Tiễn Next.js](#4-bảng-điểm-thực-tiễn-nextjs)
5. [Kế Hoạch Sửa Ưu Tiên](#5-kế-hoạch-sửa-ưu-tiên)

---

## 1. Kiểm Tra Hiệu Năng Frontend

### 1.1 Kiến Trúc Rendering

Dự án đang dùng `output: 'export'` trong `next.config.ts`, biến toàn bộ ứng dụng thành **SPA thuần client-side** khi build. Toàn bộ tính năng phía server của Next.js bị vô hiệu hóa:

- ❌ Không SSR (Server-Side Rendering)
- ❌ Không SSG (Static Site Generation)
- ❌ Không ISR (Incremental Static Regeneration)
- ❌ Không API Routes
- ❌ Không Middleware
- ❌ Không Server Components

**100% render diễn ra trên trình duyệt của người dùng.**

| Chỉ Số                         | Trạng Thái                                                    |
| ------------------------------ | ------------------------------------------------------------- |
| Server Components được dùng    | ❌ 0 — toàn bộ app là `'use client'`                          |
| SSR / SSG / ISR                | ❌ Bị tắt bởi `output: 'export'`                              |
| Hydration bundle ban đầu       | ⚠️ Toàn bộ SPA bundle tải trước khi render bất cứ thứ gì      |
| LCP (Largest Contentful Paint) | ⚠️ Không tối ưu — 71 thẻ `<img>` thô, không dùng `next/image` |

---

### 1.2 Tối Ưu Hóa Ảnh

`next.config.ts` đặt `images: { unoptimized: true }`, **tắt hoàn toàn pipeline xử lý ảnh** của Next.js. Kết quả kiểm tra:

```
Thẻ <img> thô:          71  ← không lazy-load, không WebP, không resize
next/image được dùng:   36  ← được tối ưu đúng cách
```

Phần lớn ảnh trong app (avatar, ảnh tin nhắn, ảnh nhóm) không được:

- Lazy load tự động
- Chuyển đổi sang định dạng WebP
- Responsive sizing theo kích thước màn hình

**Khuyến nghị:** Chuyển các thẻ `<img>` thô sang `next/image` kèm `alt` text có nghĩa. Nếu tiếp tục dùng `output: 'export'`, hãy dùng custom loader (Cloudinary/imgix) thay vì `unoptimized: true`.

---

### 1.3 Bundle & Tách Code

- **`antd` (Ant Design v6)** được include nhưng chỉ dùng một phần — nguy cơ bundle phình to nếu tree-shaking không hoạt động đúng. Cần kiểm tra với Webpack Bundle Analyzer.
- **`framer-motion` v12** hiện diện — cần đảm bảo chỉ import named exports, không import toàn bộ thư viện.
- **`@giphy/react-components`** là package nặng cho tính năng tương đối phụ (gửi GIF).
- **Không có script phân tích bundle** nào được cấu hình trong `package.json`.

---

### 1.4 Các Vấn Đề Hiệu Năng Runtime

| Vấn Đề                                                                                                        | File                                  | Mức Độ        |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------- |
| `window.addEventListener('scroll', ..., true)` — lắng nghe toàn bộ sự kiện scroll trên window (capture phase) | `Providers.tsx`                       | 🔴 Cao        |
| Module-level `emojiMap` khởi tạo khi import (side effect) — bị lặp ở 2 file                                   | `ChatInput.tsx`, `useChatWindow.ts`   | 🟡 Trung bình |
| Hai kết nối STOMP WebSocket song song                                                                         | `MainHome.tsx` + `SocketProvider.tsx` | 🔴 Cao        |
| Hai hệ thống theme hoạt động cùng lúc                                                                         | `themes/index.js` + `next-themes`     | 🟡 Trung bình |
| **200 lần gọi `console.log/warn/error`** trong code production                                                | 20+ file                              | 🟡 Trung bình |

**Ghi chú về scroll listener:** `Providers.tsx` đặt một listener capture-phase trên `window` để xử lý `.custom-scrollbar`. Listener này sẽ kích hoạt trên **mọi sự kiện scroll của bất kỳ phần tử nào** trong toàn bộ trang, không chỉ các element có class `.custom-scrollbar`. Đây là bottleneck hiệu năng tiềm ẩn.

---

### 1.5 Vấn Đề Hydration

Cả `<html>` lẫn `<body>` đều có `suppressHydrationWarning` trong `app/layout.tsx`:

```tsx
// app/layout.tsx
<html lang="en" suppressHydrationWarning>   // ← suppress ở đây là đủ
  <body suppressHydrationWarning>            // ← suppress thêm = có mismatch bị che giấu
```

Suppress ở cấp `<html>` là đủ cho việc inject theme class — việc suppress thêm `<body>` cho thấy có một **hydration mismatch thực sự đang bị che giấu**. Nguyên nhân: `ThemeProvider` đọc `localStorage` trong initializer của `useState`, tạo ra server/client mismatch.

---

## 2. Đánh Giá Component & Logic

### 2.1 Vấn Đề Bảo Mật — XSS

> ⚠️ **NGHIÊM TRỌNG — Lỗ hổng XSS qua `dangerouslySetInnerHTML`**

Tìm thấy **9 lần sử dụng** `dangerouslySetInnerHTML` trong codebase. **DOMPurify chưa được cài đặt** (không có trong `package.json`). Tất cả nội dung HTML được render trực tiếp vào DOM mà không qua sanitization.

| File                         | Dòng       | Mức Độ              | Nguồn Dữ Liệu                                                  |
| ---------------------------- | ---------- | ------------------- | -------------------------------------------------------------- |
| `MessageList.tsx`            | 38         | 🔴 **NGHIÊM TRỌNG** | `msg.text` — dữ liệu thô từ server, không sanitize             |
| `MessengerPopup.tsx`         | 497        | 🔴 **NGHIÊM TRỌNG** | HTML từ nội dung tin nhắn TipTap                               |
| `ChatMessageList.tsx`        | 1347, 1359 | 🟠 **CAO**          | `replaceEmojiWithHtml(cleanText)` — regex-based, có thể bypass |
| `ConversationListLegacy.tsx` | 1285       | 🟠 **CAO**          | Chuỗi highlight tìm kiếm — chưa sanitize                       |
| `ChatHeader.tsx`             | 435        | 🟡 **TRUNG BÌNH**   | Text tóm tắt từ AI response                                    |
| `CreatePostModal.tsx`        | 556        | 🟡 **TRUNG BÌNH**   | Inject thẻ `<style>`                                           |
| `CreateStoryModal.tsx`       | 238        | 🟡 **TRUNG BÌNH**   | Inject thẻ `<style>`                                           |
| `LoginForm.tsx`              | 318        | 🟢 **THẤP**         | Translation key — nội dung tĩnh                                |

**Cách sửa:**

```bash
npm install dompurify @types/dompurify
```

```tsx
import DOMPurify from "dompurify";

// Bọc mọi dangerouslySetInnerHTML:
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />;
```

---

### 2.2 Vấn Đề Kiến Trúc

| Component / File                    | Vấn Đề                                                                                                                             | Mức Độ        | Khuyến Nghị                                                                                          |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| `MainHome.tsx`                      | Tự tạo STOMP client riêng để đăng nhập QR, song song với `SocketProvider` — **2 kết nối WebSocket đến cùng 1 broker**              | 🔴 Cao        | Tách QR STOMP login ra hook riêng; tái sử dụng kết nối từ `SocketProvider`                           |
| `useChatWindow.ts`                  | **God hook ~500+ dòng** — trộn lẫn AI chat, gửi tin nhắn, emoji, ghi âm, upload file, quyền hạn, chuyển tiếp, biệt danh, reactions | 🔴 Cao        | Tách thành các hook theo domain: `useAIChat`, `useMessageSend`, `useEmojiPicker`, `useAudioRecorder` |
| `chatStore.ts`                      | Đặt tên là "store" nhưng chỉ là TypeScript interface + 2 reducer function. Không có state thực sự                                  | 🟡 Trung bình | Đổi tên thành `chatReducer.ts`, hoặc chuyển sang Zustand                                             |
| `themes/index.js`                   | Custom ThemeProvider viết bằng JS thuần (không TypeScript) + `next-themes` đã cài — **2 hệ thống theme hoạt động song song**       | 🟡 Trung bình | Xóa một cái. Chuyển sang dùng `next-themes` hoàn toàn                                                |
| `SocketProvider.tsx`                | Một file quản lý: vòng đời WebSocket, phát hiện session bị kick, WebRTC overlay, theo dõi presence                                 | 🟡 Trung bình | Tách `WebRTCProvider` ra component riêng                                                             |
| `ChatMessageList.tsx`               | ~1400+ dòng — render tất cả loại tin nhắn (text, ảnh, video, call history...) trong một component                                  | 🟡 Trung bình | Tách thành `TextMessage`, `ImageMessage`, `VideoMessage`, `CallMessage`                              |
| `MainHome.tsx`                      | Import `'@/i18n/config'` hai lần (duplicate import)                                                                                | 🟢 Thấp       | Xóa import trùng                                                                                     |
| `useChatWindow.ts`, `ChatInput.tsx` | `emojiMap` khởi tạo ở module level — bị lặp ở 2 file                                                                               | 🟢 Thấp       | Tập trung vào một singleton lazy-initialized                                                         |
| `social/page.tsx`                   | `profile: React.useState<any>(null)` — state không được typed                                                                      | 🟢 Thấp       | Định nghĩa interface `UserProfile`                                                                   |
| `ChatInput.tsx`                     | `onEditorReady?: (editor: any)` — TipTap editor không được typed                                                                   | 🟢 Thấp       | Dùng type `Editor` từ `@tiptap/core`                                                                 |

---

### 2.3 Quản Lý State

Không có global state manager. Ứng dụng dùng:

- `useState` cục bộ + prop drilling qua pattern `vm` (ViewModel) trong `ChatWindow`
- "Store" không thực sự (`chatStore.ts`) — chỉ là interface
- Không có Zustand, Redux, Jotai, hoặc React Context cho cross-component state

Có thể quản lý được với app hiện tại nhưng tạo **coupling chặt khi mở rộng**. Hook `useChatWindow` đã có 500+ dòng vì tất cả state tập trung ở đó — đây là dấu hiệu cần refactor sớm.

---

### 2.4 Điểm Tốt Cần Giữ Lại

| ✅ Thực Tiễn Tốt                                                              | Vị Trí                             |
| ----------------------------------------------------------------------------- | ---------------------------------- |
| `useSearchParams()` bọc đúng trong `<Suspense>`                               | `app/(main)/page.tsx`              |
| Pattern ViewModel (vm) tách logic khỏi presentation                           | `ChatWindow/`, `ConversationList/` |
| Compound index `[conversationId+createdAt]` trong Dexie — phân trang hiệu quả | `lib/db/chatDB.ts`                 |
| Virtual scrolling với `@tanstack/react-virtual` cho danh sách tin nhắn        | `ChatWindow/useVirtualMessages.ts` |
| Flag `_retry` ngăn vòng lặp refresh token vô hạn                              | `lib/http/apiClient.ts`            |
| Quản lý vòng đời STOMP (`onConnect`/`onDisconnect`)                           | `websocketService.ts`              |
| i18n qua react-i18next với 1.129 lần gọi `t()`                                | Toàn codebase                      |

---

## 3. Kiểm Tra Accessibility & SEO

### 3.1 SEO

| Kiểm Tra                                      | Trạng Thái | Chi Tiết                                                              |
| --------------------------------------------- | ---------- | --------------------------------------------------------------------- |
| Thuộc tính `lang` trên `<html>`               | ❌         | Đang là `lang="en"` nhưng UI hoàn toàn bằng tiếng Việt                |
| Thẻ `<title>` theo từng trang                 | ❌         | Chỉ có title ở root layout (`cnm-webchat`), không có title theo trang |
| `<meta name="description">`                   | ❌         | Thiếu trên tất cả các trang                                           |
| Open Graph tags (`og:title`, `og:image`)      | ❌         | Không có ở bất kỳ đâu                                                 |
| Twitter Card meta                             | ❌         | Không có                                                              |
| `robots.txt`                                  | ❌         | Không tìm thấy trong `/public`                                        |
| `sitemap.xml`                                 | ❌         | Không được tạo                                                        |
| Semantic HTML (`<main>`, `<nav>`, `<header>`) | ⚠️         | Dùng một phần; phần chat shell chủ yếu dùng `<div>`                   |
| Skip-to-content link                          | ❌         | Thiếu                                                                 |

> **Lưu ý:** Do dùng `output: 'export'`, `generateMetadata()` (SEO động theo route) không hoạt động. Thay vào đó, dùng `export const metadata` trong từng file page, hoặc thêm `<Head>` tags.

---

### 3.2 Accessibility (Khả Năng Tiếp Cận)

Chỉ tìm thấy **25 thuộc tính `aria-*` / `role`** trong toàn bộ codebase với ~100+ component. Đây là con số **cực kỳ thấp** cho một ứng dụng nhắn tin.

| Kiểm Tra                                       | Trạng Thái | Chi Tiết                                                                    |
| ---------------------------------------------- | ---------- | --------------------------------------------------------------------------- |
| Nút toolbar có `aria-label`                    | ❌         | Toolbar soạn thảo (emoji, đính kèm, ghi âm) thiếu `aria-label`              |
| Thẻ `<img>` có `alt` text có nghĩa             | ⚠️         | Hầu hết avatar dùng `alt` rỗng hoặc generic                                 |
| Điều hướng bàn phím (danh sách chat, tin nhắn) | ❌         | Chưa được triển khai                                                        |
| Focus management khi modal mở                  | ⚠️         | Modal custom không chuyển focus tự động                                     |
| `role="dialog"` trên modal                     | ❌         | Modal custom thiếu ARIA dialog role                                         |
| Độ tương phản màu sắc (WCAG AA)                | ⚠️         | Chưa xác minh; `--sub-text` với `opacity-60` nhiều khả năng không đạt chuẩn |
| Hỗ trợ reduced motion                          | ❌         | Animation `framer-motion` không kiểm tra `prefers-reduced-motion`           |
| Screen reader: danh sách tin nhắn mới          | ❌         | Không có `aria-live="polite"` trên container tin nhắn đến                   |

---

## 4. Bảng Điểm Thực Tiễn Next.js

| Hạng Mục          | Thực Tiễn                            | Điểm           | Ghi Chú                                                      |
| ----------------- | ------------------------------------ | -------------- | ------------------------------------------------------------ |
| **Rendering**     | Server Components được dùng          | ❌ 0/1         | Toàn bộ app là `'use client'`                                |
| **Rendering**     | `output: 'export'` có cần thiết?     | ⚠️ Xem xét lại | Tắt SSR, SSG, API routes, middleware                         |
| **Rendering**     | `useSearchParams` trong `<Suspense>` | ✅ 1/1         | `app/(main)/page.tsx` đúng                                   |
| **Ảnh**           | `next/image` cho tất cả ảnh          | ❌ 0/1         | 71 `<img>` thô vs 36 `next/image`                            |
| **Ảnh**           | Image optimization bật               | ❌ 0/1         | `unoptimized: true` tắt tối ưu hóa                           |
| **Font**          | `next/font` (Geist)                  | ✅ 1/1         | `app/layout.tsx` dùng `geist` đúng                           |
| **Env Vars**      | Convention `NEXT_PUBLIC_`            | ✅ 1/1         | `NEXT_PUBLIC_API_BASE_URL` đúng                              |
| **Bảo mật**       | XSS qua `dangerouslySetInnerHTML`    | ❌ 0/1         | 9 điểm, DOMPurify chưa cài                                   |
| **Bảo mật**       | JWT lưu trữ an toàn                  | ⚠️ Một phần    | Token trong `localStorage` (chuẩn nhưng exposed với XSS)     |
| **TypeScript**    | Codebase được typed đầy đủ           | ⚠️ Một phần    | ~200 lần dùng `any`                                          |
| **i18n**          | Độ phủ i18n                          | ⚠️ Một phần    | 164+ chuỗi tiếng Việt hardcode song song với 1.129 lần `t()` |
| **Debug**         | Console statements đã dọn            | ❌ 0/1         | **200 `console.log/warn/error`** trong code production       |
| **Kiến trúc**     | Kỷ luật Server/Client boundary       | ❌ 0/1         | Không có Server Component nào                                |
| **Kiến trúc**     | Kích thước component (SRP)           | ⚠️ Một phần    | `useChatWindow` 500+ dòng, `ChatMessageList` 1400+ dòng      |
| **Kiến trúc**     | Chiến lược quản lý state             | ⚠️ Một phần    | Không có global store; `useState` cục bộ + ViewModel         |
| **Real-time**     | Kết nối WebSocket duy nhất           | ❌ 0/1         | 2 STOMP: `MainHome.tsx` + `SocketProvider`                   |
| **Theme**         | Một hệ thống theme duy nhất          | ⚠️ Một phần    | `themes/index.js` custom + `next-themes` cùng hoạt động      |
| **Accessibility** | ARIA attributes                      | ❌ 0/1         | Chỉ 25 aria usages trong 100+ component                      |
| **SEO**           | `lang="vi"` trên `<html>`            | ❌ 0/1         | Hardcode `lang="en"`                                         |
| **SEO**           | Metadata theo từng trang             | ❌ 0/1         | Không có `<title>` hay `<meta>` theo trang                   |

### Tổng Điểm: 6 ✅ / 20 mục kiểm tra → **30 / 100**

---

## 5. Kế Hoạch Sửa Ưu Tiên

| Ưu Tiên   | Hành Động                                                                                               | Công Sức | Tác Động                              |
| --------- | ------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------- |
| 🔴 **P0** | Cài DOMPurify; bọc tất cả `dangerouslySetInnerHTML` — đặc biệt `MessageList:38` và `MessengerPopup:497` | ~1 giờ   | Loại bỏ hoàn toàn vector tấn công XSS |
| 🔴 **P1** | Xóa STOMP client trùng trong `MainHome.tsx`; route QR login qua `SocketProvider`                        | ~2 giờ   | Loại bỏ kết nối WebSocket trùng lặp   |
| 🟠 **P2** | Sửa `lang="en"` → `lang="vi"` trong `app/layout.tsx`                                                    | ~5 phút  | SEO + screen reader đúng ngôn ngữ     |
| 🟠 **P3** | Xóa 200 lần `console.log` (hoặc bọc bằng kiểm tra `NODE_ENV`)                                           | ~1 giờ   | Hiệu năng + ngăn lộ thông tin         |
| 🟠 **P4** | Chuyển 20 thẻ `<img>` phổ biến nhất sang `next/image`                                                   | ~2 giờ   | Cải thiện LCP, bật lazy loading       |
| 🟡 **P5** | Tách `useChatWindow.ts` (500+ dòng) thành các domain hook                                               | ~4 giờ   | Khả năng bảo trì                      |
| 🟡 **P6** | Hợp nhất về một hệ thống theme (xóa `themes/index.js`, dùng `next-themes`)                              | ~3 giờ   | Giảm nguy cơ hydration mismatch       |
| 🟡 **P7** | Hoàn thiện i18n: chuyển 164+ chuỗi tiếng Việt hardcode vào translation keys                             | ~4 giờ   | Đúng chuẩn i18n                       |
| 🟢 **P8** | Thêm `aria-label` cho nút toolbar soạn thảo; `aria-live` cho danh sách tin nhắn                         | ~2 giờ   | Accessibility cơ bản                  |
| 🟢 **P9** | Thêm metadata theo từng trang (title, description) qua `export const metadata`                          | ~1 giờ   | SEO                                   |

---

## Tóm Tắt Kết Luận

**CNM_Web** là một SPA React hoạt động được với kiến trúc real-time tốt (STOMP + WebRTC + IndexedDB + Virtual Scrolling), nhưng đang **bỏ qua hầu hết tính năng core của Next.js** do `output: 'export'`.

| Điểm Mạnh                                        | Điểm Yếu                                          |
| ------------------------------------------------ | ------------------------------------------------- |
| ✅ Pattern ViewModel tách logic/UI rõ ràng       | ❌ XSS — `dangerouslySetInnerHTML` không sanitize |
| ✅ Virtual scrolling với @tanstack/react-virtual | ❌ Dual WebSocket connection                      |
| ✅ IndexedDB offline cache thiết kế tốt          | ❌ 0 Server Components — lãng phí Next.js         |
| ✅ Token refresh loop prevention                 | ❌ 200 console.log trong production               |
| ✅ i18n cơ bản đã triển khai (1.129 t() calls)   | ❌ Accessibility cực kỳ thấp (25 aria attributes) |
| ✅ TypeScript + ESLint cấu hình                  | ❌ 71 `<img>` thô không tối ưu                    |

> **Ưu tiên hàng đầu:** **P0 (XSS fix với DOMPurify)** → **P1 (loại bỏ dual WebSocket)** → **P2 (sửa lang attribute)**. Ba việc này tổng cộng chỉ mất khoảng 3 giờ nhưng giải quyết các rủi ro lớn nhất của dự án.
