import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { ProductSessionProvider } from "@/components/product-session-provider";

export const metadata: Metadata = {
  title: "AWKN 营销助理",
  description: "自主进化营销助理",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <ProductSessionProvider><AppShell>{children}</AppShell></ProductSessionProvider>
      </body>
    </html>
  );
}
