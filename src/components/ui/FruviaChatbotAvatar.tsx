import React, { useState } from 'react';
import Image from 'next/image';
import { SparklesIcon } from '@/components/ui/Icons';

export const FRUVIA_CHATBOT_AVATAR_URL = `${process.env.NEXT_PUBLIC_S3_BASE_URL ?? ''}/system/fruvia_chatbot.png`;

interface FruviaChatbotAvatarProps {
  alt?: string;
  className?: string;
  imageClassName?: string;
}

export function FruviaChatbotAvatar({
  alt = 'Fruvia Chatbot',
  className = 'w-full h-full',
  imageClassName = 'w-full h-full object-cover',
}: FruviaChatbotAvatarProps) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {hasError ? (
        <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#0B67FF_0%,#3C9BFF_100%)] text-white">
          <div className="flex h-[68%] w-[68%] items-center justify-center rounded-full border border-white/20 bg-white/12">
            <SparklesIcon size={24} />
          </div>
        </div>
      ) : (
        <Image
          src={FRUVIA_CHATBOT_AVATAR_URL}
          alt={alt}
          fill
          className={imageClassName}
          unoptimized
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}
