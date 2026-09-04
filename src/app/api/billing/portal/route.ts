import { NextResponse } from "next/server";

import { handleBreederPortalRequest } from "@/features/billing/portal-handler";

export async function POST(request: Request) {
  let body: unknown = null;

  try {
    const text = await request.text();
    if (text.trim()) {
      body = JSON.parse(text) as unknown;
    }
  } catch {
    return NextResponse.json({ error: "リクエスト内容が正しくありません。" }, { status: 400 });
  }

  const result = await handleBreederPortalRequest(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.httpStatus });
  }

  return NextResponse.json({ url: result.url });
}
