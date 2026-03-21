# Hướng dẫn tổ chức cấu trúc thư mục Next.js (App Router)

Việc tổ chức folder trong Next.js đã thay đổi đáng kể từ khi App Router (thư mục `/app`) trở thành tiêu chuẩn thay cho Pages Router (thư mục `/pages`). Dưới đây là cách phân chia cấu trúc thư mục chuyên nghiệp và phổ biến nhất hiện nay.

In Next.js, the project structure has evolved significantly with the App Router. Here is the most professional and common way to organize your folders.

---

## 1. Cấu trúc tổng quan (General Structure)

Hầu hết các project hiện đại sẽ đưa toàn bộ mã nguồn vào thư mục `src/` để tách biệt với các file cấu hình hệ thống (như `next.config.js`, `tailwind.config.js`).

Most modern projects wrap the source code in a `src/` directory to separate it from configuration files.

```plaintext
my-nextjs-app/
├── public/              # Ảnh, icons, fonts (Static assets)
├── src/
│   ├── app/             # Routes, layouts, pages (App Router)
│   ├── components/      # UI Components dùng chung (Shared UI)
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Cấu hình bên thứ 3 (SDKs, Prisma, Lucide)
│   ├── services/        # API calls, logic xử lý dữ liệu (Data fetching)
│   ├── store/           # State management (Zustand, Redux)
│   ├── types/           # TypeScript interfaces/types
│   └── utils/           # Helper functions (Format date, strings)
├── next.config.js
└── package.json
```

## 2. Chi tiết trong thư mục `src/app/` (App Router Details)

Đây là nơi quan trọng nhất vì nó định nghĩa các đường dẫn (routes) của website. Bạn nên sử dụng Private Folders (bắt đầu bằng dấu gạch dưới `_`) hoặc Route Groups (nằm trong ngoặc đơn `()`) để tổ chức tốt hơn.

This is where you define your routes. Use Private Folders (starting with `_`) or Route Groups (in `()`) for better organization.

- **Route Groups `(auth)`, `(dashboard)`**: Giúp nhóm các trang có cùng Layout mà không ảnh hưởng đến URL. *Example: `app/(auth)/login/page.tsx` sẽ có URL là `/login`.*
- **Private Folders `_components`**: Nếu một component chỉ dùng riêng cho một folder nào đó, hãy để nó ở đây thay vì đưa ra thư mục `src/components` dùng chung.

## 3. Phân loại Components (Component Categorization)

Đừng để tất cả component vào một chỗ. Hãy chia nhỏ theo mục đích sử dụng:

Don't put all components in one place. Categorize them by purpose:

- **`components/ui/`**: Các thành phần nhỏ, nguyên tử (Buttons, Inputs, Cards). Nếu dùng Shadcn/ui, các file sẽ mặc định nằm ở đây.
- **`components/common/`**: Các thành phần dùng chung toàn trang (Navbar, Footer, Sidebar).
- **`components/forms/`**: Các form phức tạp (LoginForm, ContactForm).

## 4. Thư mục `lib/` và `utils/` (Difference between Lib and Utils)

- **`lib/`**: Chứa các file khởi tạo thư viện bên thứ ba (Ví dụ: `lib/prisma.ts`, `lib/stripe.ts`, `lib/utils.ts` cho Tailwind Merge).
- **`utils/`**: Chứa các hàm tính toán logic thuần túy (Ví dụ: `formatCurrency.ts`, `validateEmail.ts`).

## 5. Quy tắc đặt tên (Naming Conventions)

- **Folder**: Nên dùng `kebab-case` (ví dụ: `user-profile`).
- **Components**: Dùng `PascalCase` (ví dụ: `ButtonSubmit.tsx`).
- **Hooks/Utils**: Dùng `camelCase` (ví dụ: `useAuth.ts`, `formatDate.ts`).

---

> [!TIP]
> **Lời khuyên**: Với các dự án nhỏ, bạn không cần quá nhiều folder. Hãy bắt đầu đơn giản và mở rộng dần khi project lớn lên để tránh việc phải "nhảy" qua quá nhiều thư mục chỉ để tìm một file.
