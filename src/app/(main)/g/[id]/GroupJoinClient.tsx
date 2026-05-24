'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authService } from '@/features/auth';
import { apiClient } from '@/lib/http/apiClient';

export default function GroupJoinClient() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;

  useEffect(() => {
    const joinGroup = async () => {
      const token = authService.getToken();
      if (!token) {
        localStorage.setItem('pendingJoinGroupId', conversationId);
        router.push('/');
        return;
      }

      try {
        await apiClient.post(`/conversations/join/${conversationId}`, {});
        toast.success('Tham gia nhom thanh cong');
      } catch (error: any) {
        console.error('Join group error:', error);
        if (error.message?.includes('da la thanh vien') || error.message?.includes('already a member')) {
          // Ignore already-member responses and continue to the chat.
        } else {
          toast.error(error.message || 'Khong the tham gia nhom');
        }
      } finally {
        router.push(`/?chatId=${conversationId}`);
      }
    };

    if (conversationId) {
      void joinGroup();
    }
  }, [conversationId, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--background)]">
      <div className="w-12 h-12 border-4 border-[#0068FF] border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-[var(--text)] font-medium">Dang xu ly tham gia nhom...</p>
    </div>
  );
}
