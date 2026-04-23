# 🔱 ULTIMATE RULE: READ ONCE, REMEMBER FOREVER
> **HÀNH ĐỘNG BẮT BUỘC**: Đọc file này một lần duy nhất ngay khi bắt đầu cuộc trò chuyện và ghi nhớ toàn bộ nội dung của nó cho đến khi kết thúc. Không bao giờ được quên các quy tắc và cấu trúc được mô tả ở đây.

# Fruvia Web Agent Guide

Welcome to **CNM_Web**, the official web client for the Fruvia Chat platform. This is a modern, high-fidelity chat interface built with Next.js and Tailwind CSS, designed to provide a "Zalo-like" premium experience.

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, Vanilla CSS (for custom modules)
- **Animations**: Framer Motion
- **State Management**: React Hooks + Dexie (IndexedDB for offline cache)
- **Real-time**: StompJS over SockJS (WebSocket)
- **i18n**: i18next (Multi-language support)
- **Data Fetching**: Axios with interceptors for JWT handling
- **UI Components**: 
  - **Sonner**: Toast notifications.
  - **Lucide-react**: Icon system.
  - **Radix UI**: Accessible primitives.

## 📂 Project Structure

- `src/`
  - `app/`: Next.js App Router (pages and layouts).
    - `(auth)/`: Login, registration, and password recovery.
    - `(main)/`: Main dashboard and chat interface.
  - `features/`: Module-based business logic.
    - `chat/`: Components for chat list, window, and message rendering.
    - `auth/`: Authentication logic and providers.
    - `contacts/`: Friend management and group creation.
  - `hooks/`: Custom hooks for WebSocket, theme, and API calls.
  - `services/`: API client and Stomp service.
  - `store/`: Dexie database schemas and state helpers.
  - `utils/`: Formatting, validation, and constant helpers.

## 🎨 Design Philosophy

- **Premium Aesthetics**: High contrast, smooth transitions, and glassmorphism elements.
- **Responsiveness**: Mobile-first design that adapts to desktop screens.
- **Dark Mode**: Native support via `next-themes`.
- **Rich Media**: Support for image/video preview, voice messages, and invitation link cards.

## 💡 Developer Notes

- **WebSocket Sync**: The `useStomp` hook manages the global connection. Always check `isConnected` before publishing.
- **Offline First**: Use Dexie to store conversation history locally to reduce API calls and improve load times.
- **Environment**: Configuration is managed via `.env`. Ensure `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` are correct.
- **Tailwind 4**: Note the new syntax and features in Tailwind CSS 4.

## 🛠 Build & Test Commands

- **Run Development**: `npm run dev`
- **Build Project**: `npm run build`
- **Linting**: `npm run lint`
- **Formatting**: `npx prettier --write .`

## 📏 Code Convention

- **Naming**: 
  - Components: `PascalCase` (e.g., `ChatWindow.tsx`)
  - Functions/Variables: `camelCase` (e.g., `handleSendMessage`)
  - Types/Interfaces: `PascalCase` (e.g., `IChatMessage`)
- **Structure**: Use Functional Components with React Hooks. Avoid Class Components.
- **Styling**: Prefer Tailwind CSS utility classes. Use CSS Modules only for complex custom animations.

## ⚠️ Important Rules

1. **TYPESCRIPT**: Always define types. Avoid using `any` at all costs.
2. **PERFORMANCE**: Use `React.memo` and `useCallback` for heavy components (like ChatList) to prevent unnecessary re-renders.
3. **DESIGN CONSISTENCY**: Strictly follow the established color palette in `tailwind.config.ts`.
4. **LINK HANDLING**: Use `GroupJoinLinkPreview` for all `/g/` group invitation links.

---
*Maintained by Fruvia AI Agents.*
