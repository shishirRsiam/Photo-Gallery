"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Upload, Image as ImageIcon, Download, X } from "lucide-react";

type PhotoItem = {
  id: number;
  name: string;
  created_at: string;
  image_url: string;
  thumb_url: string;
};

const MAX_IMAGE_BYTES = 4 * 1024 * 1024 * 1024; // 4GB

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
  const API = process.env.NEXT_PUBLIC_API_BASE || process.env.LOCAL_NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8080";

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [isDropping, setIsDropping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const activePhoto = useMemo(
    () => photos.find((p) => p.id === activeId) ?? null,
    [photos, activeId]
  );

  async function loadPhotos() {
    setError(null);
    try {
      const res = await fetch(`${API}/api/photos/`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data = (await res.json()) as PhotoItem[];
      setPhotos(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load photos");
    }
  }

  useEffect(() => {
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadFiles(fileList: FileList | null) {
    setError(null);
    const files = Array.from(fileList ?? []).filter((f) => f.type?.startsWith("image/"));
    if (files.length === 0) {
      setError("Please select an image file (JPG/PNG/WebP/GIF).");
      return;
    }

    const tooBig = files.find((f) => f.size > MAX_IMAGE_BYTES);
    if (tooBig) {
      setError(`File too large: ${tooBig.name} (${formatBytes(tooBig.size)}). Max ${formatBytes(MAX_IMAGE_BYTES)}.`);
      return;
    }

    const form = new FormData();
    for (const f of files) form.append("images", f); // IMPORTANT: "images"

    setBusy(true);
    try {
      const res = await fetch(`${API}/api/photos/`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Upload failed (${res.status}): ${t}`);
      }
      await loadPhotos();
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function deletePhoto(id: number) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/photos/${id}/`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`);
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      if (activeId === id) setActiveId(null);
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    } finally {
      setBusy(false);
    }

    // Optimistic delete
    // setPhotos((prev) => prev.filter((p) => p.id !== id));
    // if (activeId === id) setActiveId(null);
  }

  function onPickClick() {
    inputRef.current?.click();
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDropping(false);
    if (e.dataTransfer?.files?.length) uploadFiles(e.dataTransfer.files);
  }

  function downloadActive() {
    if (!activePhoto) return;
    const a = document.createElement("a");
    a.href = activePhoto.image_url;
    a.download = activePhoto.name || `photo-${activePhoto.id}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="min-h-screen w-full bg-white text-black">
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Photo Upload & Gallery</h1>
            <p className="text-sm text-gray-600">Uploads are saved on your Django server.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onPickClick}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" /> {busy ? "Uploading..." : "Upload"}
            </button>

            <button
              onClick={loadPhotos}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div
          className={`mb-6 rounded-2xl border border-dashed p-5 transition ${isDropping ? "ring-2 ring-black ring-offset-2" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDropping(true);
          }}
          onDragLeave={() => setIsDropping(false)}
          onDrop={onDrop}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border p-2">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div className="text-sm text-gray-600">Drag & drop images here, or click Upload.</div>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border px-4 py-3 text-sm">
            <span className="font-medium">Error:</span> {error}
          </div>
        ) : null}

        {photos.length === 0 ? (
          <div className="rounded-2xl border p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border">
              <ImageIcon className="h-6 w-6" />
            </div>
            <div className="text-base font-medium">No photos on server</div>
            <div className="mt-1 text-sm text-gray-600">Upload an image to Django.</div>
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
                    src={p.thumb_url}
                    alt={p.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 p-2">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium">{p.name}</div>
                    {/* <div className="text-[11px] text-gray-600">ID: {p.id}</div> */}
                  </div>

                  {/* <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deletePhoto(p.id);
                    }}
                    aria-label={`Delete ${p.name}`}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button> */}
                </div>
              </button>
            ))}
          </div>
        )}

        {activePhoto ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setActiveId(null)}>
            <div className="w-full max-w-3xl rounded-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{activePhoto.name}</div>
                  {/* <div className="text-xs text-gray-600">ID: {activePhoto.id}</div> */}
                </div>

                <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100" onClick={() => setActiveId(null)} aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border">
                <img src={activePhoto.image_url} alt={activePhoto.name} className="w-full object-contain" />
              </div>

              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={downloadActive}
                  className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" /> Download
                </button>

                {/* <button
                  onClick={() => deletePhoto(activePhoto.id)}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button> */}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
