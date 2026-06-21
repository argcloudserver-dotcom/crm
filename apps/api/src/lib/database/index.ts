// Re-export the shared database client and tables for the API layer.
// Consumers should import from "@/lib/database" (or relative) so that the
// underlying provider can be swapped without touching feature code.
export * from "@workspace/db";
