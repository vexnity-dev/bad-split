"use client";

import React, { useSyncExternalStore, useState } from "react";
import { Sun, Moon, Sparkles } from "lucide-react";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getSnapshot() {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot() {
  return "light";
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";

    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("shinchan-theme", "dark");
      setToastMessage("แปลงร่างเป็นโหมดหน้ากากแอคชั่น! 🌙⚡");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("shinchan-theme", "light");
      setToastMessage("กลับสู่โหมดชินจังกลางวัน! ☀️✨");
    }

    setTimeout(() => {
      setToastMessage(null);
    }, 1800);
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="สลับโหมดกลางวัน/กลางคืน"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-xs transition-all select-none cursor-pointer active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
          theme === "dark"
            ? "bg-[#1e293b] text-[#FDD835] border-2 border-[#FDD835] shadow-[2px_2px_0px_#FDD835] hover:bg-[#334155]"
            : "bg-[#FDD835] text-slate-950 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] hover:bg-[#FBC02D]"
        } ${className}`}
      >
        {theme === "dark" ? (
          <>
            <Moon className="w-3.5 h-3.5 text-[#FDD835] fill-current" />
            <span>โหมดกลางคืน 🌙</span>
          </>
        ) : (
          <>
            <Sun className="w-3.5 h-3.5 text-[#E53935] fill-current" />
            <span>โหมดกลางวัน ☀️</span>
          </>
        )}
      </button>

      {/* Floating toast notification */}
      {toastMessage && (
        <div className="absolute right-0 -bottom-10 z-50 whitespace-nowrap bg-[#E53935] text-white text-[11px] font-black px-3 py-1 rounded-full border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] animate-in fade-in flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#FDD835]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
