// @workspace/shared — utilities, validators, errors, and shared React contexts.
// Re-exports @workspace/core for ergonomic single-import access.
export * from "@workspace/core";
export * from "./utils";
export * from "./errors";
// Auth is intentionally NOT re-exported from root to avoid pulling React into
// non-React consumers. Import from "@workspace/shared/auth" explicitly.
