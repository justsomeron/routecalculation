import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Medical Operations Center",
  description: "Routenkalkulation für Krankentransporte",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
