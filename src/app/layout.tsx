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
    <html lang="th" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const storedTheme = localStorage.getItem('shinchan-theme');
                if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#FEF9E7] dark:bg-[#0d131f] text-slate-900 dark:text-slate-100 selection:bg-[#E53935] selection:text-white transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
