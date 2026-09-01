import { sanitizeNextPath } from "@/lib/auth/sanitize-next-path";

export const AUTH_CALLBACK_ALLOWED_NEXT_PATHS = ["/login", "/reset-password"] as const;

export type AuthCallbackNextPath = (typeof AUTH_CALLBACK_ALLOWED_NEXT_PATHS)[number];

export function sanitizeAuthCallbackNext(next: string | null | undefined): AuthCallbackNextPath {
  const sanitized = sanitizeNextPath(next ?? null);

  if (sanitized === "/login" || sanitized === "/reset-password") {
    return sanitized;
  }

  return "/login";
}

/** `type=recovery` のみ reset-password。`type` 欠落含むそれ以外は login。 */
export function resolveAuthNextFromEmailType(
  type: string | null | undefined,
): AuthCallbackNextPath {
  return type === "recovery" ? "/reset-password" : "/login";
}

export function buildAuthLandingRedirectPath(params: {
  code?: string;
  token_hash?: string;
  type?: string;
}): string | null {
  const { code, token_hash, type } = params;

  if (token_hash && type) {
    const next = resolveAuthNextFromEmailType(type);
    const query = new URLSearchParams({
      token_hash,
      type,
      next,
    });
    return `/auth/confirm?${query.toString()}`;
  }

  if (code) {
    const next = resolveAuthNextFromEmailType(type);
    const query = new URLSearchParams({
      code,
      next,
    });
    return `/auth/callback?${query.toString()}`;
  }

  return null;
}

export function resolveAuthConfirmSuccessNext(type: EmailOtpTypeLike): AuthCallbackNextPath {
  return type === "recovery" ? "/reset-password" : "/login";
}

type EmailOtpTypeLike = string | null;
