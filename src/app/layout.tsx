import type { Metadata, Viewport } from "next";
import { Prompt, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { PwaInstall } from '@/components/pwa/PwaInstall';
import { WorkspaceBoundary } from '@/components/auth/WorkspaceBoundary';

const prompt = Prompt({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-prompt",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  manifest: '/manifest.json',
  applicationName: 'Project Edu',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Project Edu' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
  title: "Project Edu — ผู้ช่วยเริ่มต้นโครงงาน ม.ต้น / ม.ปลาย",
  description: "แอปช่วยนักเรียน ม.ต้น/ม.ปลาย เริ่มต้นโครงงาน ตั้งแต่หาหัวข้อจนได้ข้อเสนอโครงงาน",
};

export const viewport: Viewport = { themeColor: '#4F46E5', width: 'device-width', initialScale: 1 };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${prompt.variable} ${plusJakartaSans.variable}`}>
      <body className="font-sans antialiased"><PwaInstall /><WorkspaceBoundary>{children}</WorkspaceBoundary></body>
    </html>
  );
}
