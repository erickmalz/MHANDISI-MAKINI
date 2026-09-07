import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mhandisi Makini — Construction project management",
  description:
    "Construction project management for the site engineer. Client funds, procurement and labour, tracked project by project.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
