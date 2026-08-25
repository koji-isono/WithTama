/**
 * datetime-local (YYYY-MM-DDTHH:mm) is interpreted in the user's browser local timezone.
 * For Japan-based users this is typically JST (UTC+9). The value is converted to ISO 8601
 * UTC for Supabase timestamptz / request_visit RPC.
 */
export function parseDatetimeLocalValue(value: string): Date | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function datetimeLocalToIso(value: string): string | null {
  const parsed = parseDatetimeLocalValue(value);

  if (!parsed) {
    return null;
  }

  return parsed.toISOString();
}

export function isFutureDatetime(iso: string, now: Date = new Date()): boolean {
  return new Date(iso).getTime() > now.getTime();
}
