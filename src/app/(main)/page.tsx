'use client';

import { useSearchParams } from 'next/navigation';
import { MainHome } from './MainHome';
import { Suspense } from 'react';

function HomeContent() {
  const searchParams = useSearchParams();
  const chatId = searchParams.get('chatId') || undefined;
  
  return <MainHome initialChatId={chatId} />;
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
