"use client";

import { useMemo, useState } from "react";
import axios, { AxiosProgressEvent } from "axios";

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

type PresignedUrlPayload = {
  originalName: string;
  s3Key: string;
  s3Url: string;
  presignedUrl: string;
  contentType: string;
  expiresInSeconds: number;
};

type CompleteUploadPayload = {
  id: string;
  originalName: string;
  s3Key: string;
  s3Url: string;
  uploadTime: string;
};

type UploadState = "idle" | "getting-url" | "uploading" | "saving" | "success" | "error";

export type UseS3ImageUploadResult = {
  state: UploadState;
  progress: number;
  error: string | null;
  uploadedUrl: string | null;
  uploadedKey: string | null;
  reset: () => void;
  uploadImage: (file: File) => Promise<CompleteUploadPayload>;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";

export function useS3ImageUpload(): UseS3ImageUploadResult {
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);

  const apiClient = useMemo(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

    return axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }, []);

  const reset = () => {
    setState("idle");
    setProgress(0);
    setError(null);
    setUploadedUrl(null);
    setUploadedKey(null);
  };

  const uploadImage = async (file: File): Promise<CompleteUploadPayload> => {
    if (!file) {
      throw new Error("Không có file để upload");
    }

    if (!file.type.startsWith("image/")) {
      throw new Error("Chỉ hỗ trợ upload file ảnh");
    }

    setError(null);
    setState("getting-url");
    setProgress(0);

    try {
      // 1) Get pre-signed URL from backend
      const presignedRes = await apiClient.get<ApiEnvelope<PresignedUrlPayload>>("/images/presigned-url", {
        params: {
          fileName: file.name,
          contentType: file.type,
        },
      });

      const presignedData = presignedRes.data.data;

      setState("uploading");

      // 2) Upload file directly to S3 with PUT + Content-Type + progress tracking
      await axios.put(presignedData.presignedUrl, file, {
        headers: {
          "Content-Type": file.type,
        },
        onUploadProgress: (event: AxiosProgressEvent) => {
          const total = event.total || file.size;
          if (!total) return;
          const percent = Math.round((event.loaded * 100) / total);
          setProgress(Math.min(100, Math.max(0, percent)));
        },
      });

      setState("saving");

      // 3) Notify backend to save metadata in MongoDB
      const completeRes = await apiClient.post<ApiEnvelope<CompleteUploadPayload>>("/images/complete", {
        originalName: file.name,
        s3Key: presignedData.s3Key,
        s3Url: presignedData.s3Url,
      });

      const saved = completeRes.data.data;
      setUploadedUrl(saved.s3Url);
      setUploadedKey(saved.s3Key);
      setProgress(100);
      setState("success");

      return saved;
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const message = axiosErr?.response?.data?.message || axiosErr?.message || "Upload thất bại";
      setError(message);
      setState("error");
      throw err;
    }
  };

  return {
    state,
    progress,
    error,
    uploadedUrl,
    uploadedKey,
    reset,
    uploadImage,
  };
}
