'use client';

import { SocketProvider } from '@/features/chat/providers/SocketProvider';
import { NotificationProvider } from '@/features/notification/store/NotificationContext';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SocketProvider>
      <NotificationProvider>
        <div className="min-h-screen w-full">{children}</div>
      </NotificationProvider>
    </SocketProvider>
  );
}
