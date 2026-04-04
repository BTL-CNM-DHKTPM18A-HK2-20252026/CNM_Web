"use client";

import { ChangeEvent, useState } from "react";
import Image from "next/image";
import { useS3ImageUpload } from "@/hooks/useS3ImageUpload";

export function S3ImageUploader() {
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const { state, progress, error, uploadedUrl, uploadImage, reset } = useS3ImageUpload();

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);

    try {
      await uploadImage(file);
    } catch {
      // Error already handled inside hook state.
    }
  };

  return (
    <div className="w-full max-w-xl rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900">Upload ảnh lên S3 (Pre-signed URL)</h3>

      <div className="mt-3 flex items-center gap-3">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full cursor-pointer rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
        />

        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Reset
        </button>
      </div>

      {selectedFileName && (
        <p className="mt-2 text-sm text-gray-600">
          File: <span className="font-medium text-gray-800">{selectedFileName}</span>
        </p>
      )}

      {(state === "uploading" || state === "saving" || state === "success") && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
            <span>
              {state === "uploading" && "Đang upload lên S3..."}
              {state === "saving" && "Đang lưu metadata vào DB..."}
              {state === "success" && "Hoàn tất"}
            </span>
            <span>{progress}%</span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

      {uploadedUrl && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm font-medium text-green-700">Upload thành công</p>
          <a
            href={uploadedUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block break-all text-sm text-blue-700 underline"
          >
            {uploadedUrl}
          </a>
          <Image
            src={uploadedUrl}
            alt="Uploaded preview"
            width={800}
            height={320}
            unoptimized
            className="mt-3 max-h-56 w-auto rounded-lg border border-gray-200"
          />
        </div>
      )}
    </div>
  );
}
