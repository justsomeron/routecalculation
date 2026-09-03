import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Medical Operations Center",
  description: "Routenkalkulation für Krankentransporte",
};

// Setzt die dark-Klasse synchron vor dem ersten Rendern (verhindert
// Aufblitzen des hellen Modus), Reihenfolge: gespeicherte Wahl >
// Systemeinstellung > hell.
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var dark = stored ? stored === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
