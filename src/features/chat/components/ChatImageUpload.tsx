"use client";

import { ChangeEvent, Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import axios, { AxiosInstance, AxiosProgressEvent } from "axios";
import { httpClient } from "@/lib/http/apiClient";

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

type SaveImagePayload = {
  id: string;
  originalName: string;
  s3Key: string;
  s3Url: string;
  width: number;
  height: number;
  uploadTime: string;
};

type UploadStatus = "sending" | "done" | "error";

type ChatOptimisticImage = {
  id: string;
  fileName: string;
  fileSize: number;
  localBlobUrl: string;
  displayUrl: string;
  s3Url: string | null;
  width: number;
  height: number;
  progress: number;
  status: UploadStatus;
  error: string | null;
};

export type ChatImageUploadMessage = ChatOptimisticImage;

interface ChatImageUploadProps {
  className?: string;
  disabled?: boolean;
  multiple?: boolean;
  onUploadDone?: (message: ChatImageUploadMessage, metadata: SaveImagePayload) => void;
  onUploadError?: (message: ChatImageUploadMessage, error: string) => void;
}

export function ChatImageUpload({
  className = "",
  disabled = false,
  multiple = true,
  onUploadDone,
  onUploadError,
}: ChatImageUploadProps) {
  const [messages, setMessages] = useState<ChatOptimisticImage[]>([]);
  const [isPicking, setIsPicking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<ChatOptimisticImage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    return () => {
      messagesRef.current.forEach((msg) => {
        if (msg.localBlobUrl.startsWith("blob:")) {
          URL.revokeObjectURL(msg.localBlobUrl);
        }
      });
    };
  }, []);

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const pickedFiles = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";

    if (!pickedFiles.length) return;

    setIsPicking(true);
    try {
      for (const file of pickedFiles) {
        if (!file.type.startsWith("image/")) {
          continue;
        }

        const dimensions = await readNaturalImageSize(file);
        const localBlobUrl = URL.createObjectURL(file);

        const optimisticMessage: ChatOptimisticImage = {
          id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          fileName: file.name,
          fileSize: file.size,
          localBlobUrl,
          displayUrl: localBlobUrl,
          s3Url: null,
          width: dimensions.width,
          height: dimensions.height,
          progress: 0,
          status: "sending",
          error: null,
        };

        setMessages((prev) => [...prev, optimisticMessage]);
        uploadSingleImage(file, optimisticMessage, httpClient, setMessages, onUploadDone, onUploadError);
      }
    } finally {
      setIsPicking(false);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || isPicking}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0068FF] px-3 py-1.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#0052CC] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
          {isPicking ? "Đang xử lý..." : "Chọn ảnh để gửi"}
        </button>
      </div>

      <div className="flex w-full flex-col gap-3">
        {messages.map((msg) => (
          <div key={msg.id} className="ml-auto w-full max-w-[320px]">
            <div
              className="relative overflow-hidden rounded-2xl bg-slate-100 shadow-sm"
              style={{ aspectRatio: `${msg.width} / ${msg.height}` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={msg.displayUrl} alt={msg.fileName} className="h-full w-full object-cover" />

              {msg.status === "sending" && (
                <div className="absolute inset-0 flex flex-col justify-end bg-black/35 p-3">
                  <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-white">
                    <span>Đang gửi...</span>
                    <span>{msg.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/30">
                    <div
                      className="h-full rounded-full bg-white transition-all duration-150"
                      style={{ width: `${msg.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {msg.status === "error" && (
                <div className="absolute inset-0 flex items-end bg-black/50 p-3">
                  <div className="rounded-lg bg-red-600/90 px-2 py-1 text-[11px] text-white">
                    Upload lỗi: {msg.error || "Không xác định"}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-1 text-right text-[11px] text-slate-500">
              {msg.status === "done" && "Đã gửi"}
              {msg.status === "sending" && "Đang gửi"}
              {msg.status === "error" && "Gửi thất bại"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function uploadSingleImage(
  file: File,
  optimisticMessage: ChatOptimisticImage,
  apiClient: AxiosInstance,
  setMessages: Dispatch<SetStateAction<ChatOptimisticImage[]>>,
  onUploadDone?: (message: ChatImageUploadMessage, metadata: SaveImagePayload) => void,
  onUploadError?: (message: ChatImageUploadMessage, error: string) => void
) {
  try {
    const presignedRes = await apiClient.get<ApiEnvelope<PresignedUrlPayload>>("/images/presigned-url", {
      params: {
        fileName: file.name,
        contentType: file.type,
      },
    });

    const presigned = presignedRes.data.data;

    await axios.put(presigned.presignedUrl, file, {
      headers: {
        "Content-Type": file.type,
      },
      onUploadProgress: (event: AxiosProgressEvent) => {
        const total = event.total || file.size;
        if (!total) return;

        const percent = Math.min(100, Math.max(0, Math.round((event.loaded * 100) / total)));
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMessage.id ? { ...m, progress: percent } : m))
        );
      },
    });

    const savedRes = await apiClient.post<ApiEnvelope<SaveImagePayload>>("/images/save", {
      originalName: file.name,
      s3Key: presigned.s3Key,
      s3Url: presigned.s3Url,
      width: optimisticMessage.width,
      height: optimisticMessage.height,
    });

    const saved = savedRes.data.data;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === optimisticMessage.id
          ? {
              ...m,
              status: "done",
              progress: 100,
              error: null,
              displayUrl: saved.s3Url,
              s3Url: saved.s3Url,
            }
          : m
      )
    );

    URL.revokeObjectURL(optimisticMessage.localBlobUrl);

    onUploadDone?.(
      {
        ...optimisticMessage,
        status: "done",
        progress: 100,
        error: null,
        displayUrl: saved.s3Url,
        s3Url: saved.s3Url,
      },
      saved
    );
  } catch (error: unknown) {
    const axiosError = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };

    const message =
      axiosError?.response?.data?.message || axiosError?.message || "Không thể upload ảnh lên hệ thống";

    setMessages((prev) =>
      prev.map((m) =>
        m.id === optimisticMessage.id
          ? {
              ...m,
              status: "error",
              error: message,
            }
          : m
      )
    );

    onUploadError?.(
      {
        ...optimisticMessage,
        status: "error",
        error: message,
      },
      message
    );
  }
}

function readNaturalImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const tempUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const width = image.naturalWidth || image.width || 0;
      const height = image.naturalHeight || image.height || 0;
      URL.revokeObjectURL(tempUrl);

      if (width <= 0 || height <= 0) {
        reject(new Error("Không lấy được kích thước ảnh"));
        return;
      }

      resolve({ width, height });
    };

    image.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      reject(new Error("File ảnh không hợp lệ"));
    };

    image.src = tempUrl;
  });
}
