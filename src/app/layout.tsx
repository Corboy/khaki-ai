import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Khaki AI | Studio Assistant ya Khaki Media",
  description:
    "AI Studio Receptionist & Assistant wa Khaki Media. Pata taarifa za kurekodi muziki, utengenezaji wa video, photography, podcasting, pricing na booking ya studio moja kwa moja.",
  icons: {
    icon: "/images/khaki-logo.png",
    apple: "/images/khaki-logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Khaki AI",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sw" className="dark">
      <body className="flex min-h-screen min-h-[100dvh] flex-col bg-black text-[#f5f5f7] antialiased selection:bg-[#D4AF37]/35 selection:text-white">
        {children}
      </body>
    </html>
  );
}
