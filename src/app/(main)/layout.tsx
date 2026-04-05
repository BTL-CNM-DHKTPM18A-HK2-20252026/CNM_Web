'use client';

import { SocketProvider } from '@/features/chat/providers/SocketProvider';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SocketProvider>
      <div className="min-h-screen w-full">{children}</div>
    </SocketProvider>
  );
}
