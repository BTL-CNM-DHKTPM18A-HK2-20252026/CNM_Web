'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/http/apiClient';
import { authService } from '@/features/auth';
import { toast } from 'sonner';

export default function GroupJoinPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;

  useEffect(() => {
    const joinGroup = async () => {
      const token = authService.getToken();
      if (!token) {
        // Not logged in, redirect to home and store the intent
        localStorage.setItem('pendingJoinGroupId', conversationId);
        router.push('/');
        return;
      }

      try {
        await apiClient.post(`/conversations/join/${conversationId}`, {});
        toast.success('Tham gia nhóm thành công');
      } catch (error: any) {
        console.error('Join group error:', error);
        // If already joined or other error, we still want to open the chat
        if (error.message?.includes('đã là thành viên') || error.message?.includes('already a member')) {
           // Ignore already member error
        } else {
           toast.error(error.message || 'Không thể tham gia nhóm');
        }
      } finally {
        router.push(`/?chatId=${conversationId}`);
      }
    };

    if (conversationId) {
      joinGroup();
    }
  }, [conversationId, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--background)]">
      <div className="w-12 h-12 border-4 border-[#0068FF] border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-[var(--text)] font-medium">Đang xử lý tham gia nhóm...</p>
    </div>
  );
}
