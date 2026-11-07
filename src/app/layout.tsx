import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai, IBM_Plex_Sans_Thai_Looped } from "next/font/google";
import "./globals.css";
import { PwaInstall } from '@/components/pwa/PwaInstall';
import { WorkspaceBoundary } from '@/components/auth/WorkspaceBoundary';

// Design System v2: loopless face for headings, looped face for reading text (Thai readers favour looped body text).
const head = IBM_Plex_Sans_Thai({ weight: ["500", "600", "700"], subsets: ["thai", "latin"], variable: "--font-head", display: "swap" });
const body = IBM_Plex_Sans_Thai_Looped({ weight: ["400", "500", "600"], subsets: ["thai", "latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  manifest: '/manifest.json',
  applicationName: 'Project Edu',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Project Edu' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
  title: "Project Edu — ผู้ช่วยเริ่มต้นโครงงาน ม.ต้น / ม.ปลาย",
  description: "แอปช่วยนักเรียน ม.ต้น/ม.ปลาย เริ่มต้นโครงงาน ตั้งแต่หาหัวข้อจนได้ข้อเสนอโครงงาน",
};

export const viewport: Viewport = { themeColor: '#F6F6F3', width: 'device-width', initialScale: 1 };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${head.variable} ${body.variable}`}>
      <body className="font-sans antialiased"><PwaInstall /><WorkspaceBoundary>{children}</WorkspaceBoundary></body>
    </html>
  );
}
