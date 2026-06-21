/**
 * Raw HTTP helpers for the resale photo/unit endpoints.
 *
 * These are not part of the generated OpenAPI client (custom multipart +
 * sub-resource routes), so they live here as platform-agnostic fetchers.
 */
import type { ResaleFormValues } from "../../zod/resale";
import { apiFetch } from "../../index";

export async function uploadResalePhotoFile(file: File): Promise<string> {
  // AUDIT FIX (v7): use apiFetch so the CSRF token is attached; bare fetch()
  // omitted the header and the API rejected the upload with 403.
  const fd = new FormData();
  fd.append("file", file);
  const r = await apiFetch("/api/upload", {
    method: "POST",
    body: fd,
  });
  if (!r.ok) throw new Error("Upload failed");
  const json = (await r.json()) as { url?: string; data?: { url?: string } };
  const url = json.url ?? json.data?.url;
  if (!url) throw new Error("Upload response missing URL");
  return url;
}

export async function attachResalePhoto(
  unitId: string,
  url: string,
): Promise<void> {
  const add = await apiFetch(`/api/resale/${unitId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!add.ok) throw new Error("Failed to save photo");
}

export async function deleteResalePhoto(
  unitId: string,
  photoId: string,
): Promise<void> {
  const res = await apiFetch(`/api/resale/${unitId}/photos/${photoId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed");
}

export async function patchResaleUnit(
  unitId: string,
  data: Partial<ResaleFormValues> | Record<string, unknown>,
): Promise<void> {
  const res = await apiFetch(`/api/resale/${unitId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update");
}
