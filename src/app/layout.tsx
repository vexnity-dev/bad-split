import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Badminton Split - หารค่าแบดมินตัน ก๊วนแบด",
  description: "ระบบคำนวณและหารค่าคอร์ท ค่าลูกแบดมินตัน พร้อมเช็คสถานะการโอนเงิน",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

