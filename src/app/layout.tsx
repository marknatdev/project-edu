import type { Metadata } from "next";
import { Prompt, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

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
  title: "Project Edu — ผู้ช่วยเริ่มต้นโครงงาน ม.ต้น / ม.ปลาย",
  description: "แอปช่วยนักเรียน ม.ต้น/ม.ปลาย เริ่มต้นโครงงาน ตั้งแต่หาหัวข้อจนได้ข้อเสนอโครงงาน",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${prompt.variable} ${plusJakartaSans.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
