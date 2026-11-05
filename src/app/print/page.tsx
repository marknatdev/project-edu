import type { Metadata } from 'next';
import { DocumentReader } from '@/components/export/DocumentReader';

export const metadata: Metadata = {
  title: 'พิมพ์ / ดาวน์โหลด PDF — Project Edu',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function Page() {
  return <DocumentReader mode="print" />;
}
