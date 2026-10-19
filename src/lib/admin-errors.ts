import type { Dictionary } from "@/i18n/dictionary";

import type { ApiClientError } from "./api";

/**
 * Maps failed admin API calls onto friendly, user-facing copy.
 * Raw backend messages are never shown: status codes are translated by the
 * caller's context (PIN gate vs data action) using the admin dictionary.
 */

/** Error text for the PIN gate (auth endpoints only). */
export function pinError(dict: Dictionary, error: unknown): string {
  if (error instanceof Error && error.name === "ApiClientError") {
    const { status } = error as ApiClientError;
    if (status === 401) return dict.admin.gate.invalidPin;
    if (status === 404) return dict.admin.gate.coffeeNotFound;
    return dict.admin.gate.genericError;
  }
  return dict.admin.gate.genericError;
}

/**
 * Error text for backoffice data actions. Returns a boolean via
 * `handleAuthFailure` (below) for the 401/403 "session gone" path.
 */
export function actionError(dict: Dictionary, error: unknown): string {
  if (error instanceof Error && error.name === "ApiClientError") {
    const { status } = error as ApiClientError;
    switch (status) {
      case 401:
        return dict.admin.errors.sessionExpired;
      case 403:
        return dict.admin.errors.forbidden;
      case 404:
        return dict.admin.errors.notFound;
      case 409:
        return dict.admin.errors.conflict;
      case 400:
        return dict.admin.errors.validation;
      default:
        return dict.admin.errors.server;
    }
  }
  return dict.admin.errors.network;
}

/** True when the failure means the stored session is no longer usable. */
export function isSessionFailure(error: unknown): boolean {
  if (error instanceof Error && error.name === "ApiClientError") {
    const { status } = error as ApiClientError;
    return status === 401 || status === 403;
  }
  return false;
}
