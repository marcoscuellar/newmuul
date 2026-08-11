import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OLLIN : MUUL — The Gatherer",
  description: "Post like you mean it. LinkedIn content engine — content = pipeline.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon-64.png", sizes: "64x64" }, { url: "/icon-192.png", sizes: "192x192" }],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = { themeColor: "#0B0C10" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;700;900&family=IBM+Plex+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
