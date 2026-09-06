import type { Metadata } from "next";
import "./globals.css";
import { AppChrome } from "@/components/AppChrome";

export const metadata: Metadata = {
  title: "Mhandisi Makini — Construction project management",
  description:
    "Construction project management for the site engineer. Client funds, procurement and labour, tracked project by project.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AppChrome />
        {children}
      </body>
    </html>
  );
}
