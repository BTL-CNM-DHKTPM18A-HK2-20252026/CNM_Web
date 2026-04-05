'use client';

import { useCallback, useState } from 'react';
import { apiClient } from '@/lib/http/apiClient';

export interface ProfileFormValues {
  fullName: string;
  gender: string;
  day: string;
  month: string;
  year: string;
  bio: string;
  address: string;
  city: string;
  education: string;
  workplace: string;
}

export interface UserProfileData {
  id: string;
  full_name: string;
  gender?: string;
  dob?: string;
  phone_number?: string;
  avatar_url?: string;
  cover_photo_url?: string;
  bio?: string;
  address?: string;
  city?: string;
  education?: string;
  workplace?: string;
}

const toIsoDob = (day: string, month: string, year: string) => {
  const dob = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), 12, 0, 0);
  return dob.toISOString();
};

const unwrapResponse = <T>(response: any): T => {
  if (response && response.success && response.data) {
    return response.data as T;
  }
  return response as T;
};

export function useProfile() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const fetchMyProfile = useCallback(async (): Promise<UserProfileData> => {
    setLoading(true);
    try {
      const response = await apiClient.get('/users/me');
      return unwrapResponse<UserProfileData>(response);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMyProfile = useCallback(async (values: ProfileFormValues) => {
    setSaving(true);
    try {
      await apiClient.patch('/users/me', {
        full_name: values.fullName,
        gender: values.gender,
        dob: toIsoDob(values.day, values.month, values.year),
        bio: values.bio,
        address: values.address,
        city: values.city,
        education: values.education,
        workplace: values.workplace,
      });
    } finally {
      setSaving(false);
    }
  }, []);

  const updateAvatarUrl = useCallback(async (avatarUrl: string) => {
    await apiClient.patch('/users/me/avatar', { avatar_url: avatarUrl });
  }, []);

  const updateCoverPhotoUrl = useCallback(async (coverUrl: string) => {
    await apiClient.patch('/users/me/cover-photo', { cover_photo_url: coverUrl });
  }, []);

  const requestCoverPresignedUrl = useCallback(async (fileName: string, fileType: string): Promise<string> => {
    const response: any = await apiClient.get(
      `/messages/presigned-url?fileName=${encodeURIComponent(fileName)}&fileType=${encodeURIComponent(fileType)}`
    );

    if (typeof response === 'string') return response;
    if (response?.data && typeof response.data === 'string') return response.data;
    if (response?.url && typeof response.url === 'string') return response.url;

    throw new Error('Invalid presigned URL response');
  }, []);

  const uploadFileToS3 = useCallback(async (presignedUrl: string, file: File) => {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });

    if (!response.ok) {
      throw new Error('Failed to upload file to S3');
    }

    return presignedUrl.split('?')[0];
  }, []);

  const uploadAndSetCoverPhoto = useCallback(async (file: File) => {
    setUploadingCover(true);
    try {
      const presignedUrl = await requestCoverPresignedUrl(file.name, file.type);
      const publicUrl = await uploadFileToS3(presignedUrl, file);
      await updateCoverPhotoUrl(publicUrl);
      return publicUrl;
    } finally {
      setUploadingCover(false);
    }
  }, [requestCoverPresignedUrl, updateCoverPhotoUrl, uploadFileToS3]);

  return {
    loading,
    saving,
    uploadingCover,
    fetchMyProfile,
    updateMyProfile,
    updateAvatarUrl,
    updateCoverPhotoUrl,
    requestCoverPresignedUrl,
    uploadFileToS3,
    uploadAndSetCoverPhoto,
  };
}
