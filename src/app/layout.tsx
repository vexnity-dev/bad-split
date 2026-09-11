import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bad-Split x ชินจัง | ก๊วนนี้ใครจ่าย! หารค่าแบดมินตัน",
  description: "ระบบหารค่าคอร์ทและค่าลูกแบดมินตันสุดน่ารัก สไตล์ชินจังจอมแก่น โอนไว เช็คสลิปครบ!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#FEF9E7] text-slate-900 selection:bg-[#E53935] selection:text-white font-sans">
        {children}
      </body>
    </html>
  );
}

