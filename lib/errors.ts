import { ConvexError } from "convex/values";

type AppErrorData = { code?: unknown; message?: unknown };

export function getErrorMessage(error: unknown): string {
  if (error instanceof ConvexError) {
    const data = error.data as AppErrorData | undefined;
    if (data && typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
  }
  if (error instanceof Error && error.message) {
    if (/failed to fetch|network/i.test(error.message)) {
      return "The connection dropped. Check your network and try again.";
    }
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

export function getErrorCode(error: unknown): string | null {
  if (error instanceof ConvexError) {
    const data = error.data as AppErrorData | undefined;
    if (data && typeof data.code === "string") return data.code;
  }
  return null;
}

export function isUnauthenticated(error: unknown): boolean {
  return getErrorCode(error) === "UNAUTHENTICATED";
}
