import { checkSupabaseConnection } from "@/lib/supabase/check-connection";

export async function SupabaseConnectionStatus() {
  if (process.env.NODE_ENV !== "development") return null;

  const connected = await checkSupabaseConnection();
  if (!connected) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 shadow-sm"
    >
      Supabase Connected
    </div>
  );
}
