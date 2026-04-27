'use client';

import React from 'react';
import { SocialFeed } from '@/features/social';
import { useProfile } from '@/features/user';
import { useRouter } from 'next/navigation';
import { ChevronLeftIcon } from '@/components/ui/Icons';

export default function SocialPage() {
  const { fetchMyProfile } = useProfile();
  const [profile, setProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    fetchMyProfile().then(data => {
      setProfile(data);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [fetchMyProfile]);

  if (loading) {
    return (
      <div className="flex-1 bg-[var(--main-bg)] h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0068FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white h-screen overflow-hidden">
      {/* Social Feed Content */}
      <div className="h-full">
        <SocialFeed user={profile} />
      </div>
    </div>
  );
}
