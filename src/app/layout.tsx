import type { Metadata } from "next";

import { RecoveryLinkHandler } from "@/components/auth/recovery-link-handler";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "WithTama", template: "%s | WithTama" },
  description: "命を大切に育てるブリーダーと、家族として迎えたい人をつなぐサービス。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <RecoveryLinkHandler />
        {children}
      </body>
    </html>
  );
}
