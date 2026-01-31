"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Upload, Image as ImageIcon, Download, X } from "lucide-react";

type PhotoItem = {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: number;
  dataUrl: string;
};

const STORAGE_KEY = "photo_gallery_v1";
const MAX_STORED_IMAGES = 30;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function PhotoApp() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDropping, setIsDropping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const activePhoto = useMemo(
    () => photos.find((p) => p.id === activeId) ?? null,
    [photos, activeId]
  );

  // Load from localStorage (client only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setPhotos(parsed);
    } catch {
      // ignore
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
    } catch {
      // ignore
    }
  }, [photos]);

  async function addFiles(fileList: FileList | null) {
    setError(null);

    const files = Array.from(fileList ?? []).filter(
      (f) => f && f.type?.startsWith("image/")
    );

    if (files.length === 0) {
      setError("Please select an image file (JPG/PNG/WebP/GIF).");
      return;
    }

    const tooBig = files.find((f) => f.size > MAX_IMAGE_BYTES);
    if (tooBig) {
      setError(
        `One file is too large (${tooBig.name}, ${formatBytes(
          tooBig.size
        )}). Max ${formatBytes(MAX_IMAGE_BYTES)}.`
      );
      return;
    }

    const next: PhotoItem[] = [];
    for (const f of files) {
      const dataUrl = await readFileAsDataURL(f);
      next.push({
        id: crypto.randomUUID(),
        name: f.name,
        type: f.type,
        size: f.size,
        createdAt: Date.now(),
        dataUrl,
      });
    }

    setPhotos((prev) => {
      const merged = [...next, ...prev];
      return merged.slice(0, MAX_STORED_IMAGES);
    });

    if (next.length === 1) setActiveId(next[0].id);
  }

  function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    if (activeId === id) setActiveId(null);
  }

  function clearAll() {
    setPhotos([]);
    setActiveId(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  function onPickClick() {
    inputRef.current?.click();
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDropping(false);
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  }

  function downloadActive() {
    if (!activePhoto) return;
    const a = document.createElement("a");
    a.href = activePhoto.dataUrl;
    a.download = activePhoto.name || "photo";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="min-h-screen w-full bg-white text-black">
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Photo Upload & Gallery
            </h1>
            <p className="text-sm text-gray-600">
              Upload images and view them in a simple gallery. Stored locally in
              your browser.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onPickClick}
              className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <Upload className="h-4 w-4" /> Upload
            </button>

            <button
              onClick={clearAll}
              disabled={photos.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> Clear
            </button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {/* Drop zone */}
        <div
          className={`mb-6 rounded-2xl border border-dashed p-5 transition ${
            isDropping ? "ring-2 ring-black ring-offset-2" : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDropping(true);
          }}
          onDragLeave={() => setIsDropping(false)}
          onDrop={onDrop}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border p-2">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div className="text-sm text-gray-600">
                Supports JPG, PNG, WebP, GIF. Up to {formatBytes(MAX_IMAGE_BYTES)}{" "}
                each.
              </div>
            </div>

            <input
              readOnly
              value={`${photos.length} photo${
                photos.length === 1 ? "" : "s"
              } saved (max ${MAX_STORED_IMAGES})`}
              className="w-full rounded-lg border px-3 py-2 text-sm sm:w-[320px]"
            />
          </div>
        </div>

        {/* Error */}
        {error ? (
          <div className="mb-6 rounded-xl border px-4 py-3 text-sm">
            <span className="font-medium">Upload error:</span> {error}
          </div>
        ) : null}

        {/* Gallery */}
        {photos.length === 0 ? (
          <div className="rounded-2xl border p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border">
              <ImageIcon className="h-6 w-6" />
            </div>
            <div className="text-base font-medium">No photos yet</div>
            <div className="mt-1 text-sm text-gray-600">
              Click Upload or drag & drop an image.
            </div>
            <div className="mt-4">
              <button
                onClick={onPickClick}
                className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                <Upload className="h-4 w-4" /> Upload
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((p) => (
              <button
                key={p.id}
                className="group relative overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:shadow"
                onClick={() => setActiveId(p.id)}
                type="button"
                title={p.name}
              >
                <div className="aspect-square w-full overflow-hidden">
                  <img
                    src={p.dataUrl}
                    alt={p.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 p-2">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium">{p.name}</div>
                    <div className="text-[11px] text-gray-600">
                      {formatBytes(p.size)}
                    </div>
                  </div>

                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removePhoto(p.id);
                    }}
                    aria-label={`Delete ${p.name}`}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Modal */}
        {activePhoto ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setActiveId(null)}
          >
            <div
              className="w-full max-w-3xl rounded-2xl bg-white p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {activePhoto.name}
                  </div>
                  <div className="text-xs text-gray-600">
                    {activePhoto.type} • {formatBytes(activePhoto.size)}
                  </div>
                </div>

                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100"
                  onClick={() => setActiveId(null)}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border">
                <img
                  src={activePhoto.dataUrl}
                  alt={activePhoto.name}
                  className="w-full object-contain"
                />
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-gray-600">
                  Stored locally in your browser
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadActive}
                    className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4" /> Download
                  </button>

                  <button
                    onClick={() => removePhoto(activePhoto.id)}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-8 text-xs text-gray-600">
          Tip: Images are saved in your browser (localStorage). Clearing browser
          storage or using another device will reset the gallery.
        </div>
      </div>
    </div>
  );
}
