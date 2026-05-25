import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";

export const metadata: Metadata = {
  title: "Fruvia Chat",
  description: "Đăng nhập tài khoản Fruvia Chat để kết nối với ứng dụng Fruvia Chat 1",
  icons: {
    icon: "/fruvia_logo.png",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased"
        style={
          {
            "--font-geist-sans": "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            "--font-geist-mono": "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
          } as CSSProperties
        }
        suppressHydrationWarning
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
