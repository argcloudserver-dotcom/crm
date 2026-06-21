import type { Response } from "express";

export interface ApiMeta {
  [key: string]: unknown;
}

export interface ApiError {
  code?: string;
  message: string;
  details?: unknown;
  // AUDIT FIX (v12): Machine-readable explanation for 403/MOCK_AUTH_DISABLED etc.
  reason?: string;
}

export interface ApiResponseBody<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export function ok<T>(res: Response, data: T, meta?: ApiMeta): Response {
  const body: ApiResponseBody<T> = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(200).json(body);
}

export function created<T>(res: Response, data: T, meta?: ApiMeta): Response {
  const body: ApiResponseBody<T> = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(201).json(body);
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}

export function fail(
  res: Response,
  status: number,
  error: string | ApiError,
): Response {
  const err: ApiError =
    typeof error === "string" ? { message: error } : error;
  const body: ApiResponseBody = { success: false, error: err };
  return res.status(status).json(body);
}
