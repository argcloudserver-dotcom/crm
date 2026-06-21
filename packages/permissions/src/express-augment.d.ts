import "express";

declare module "express-serve-static-core" {
  interface Request {
    currentUser?: { id: string; role: string; [key: string]: unknown } | null;
  }
}
