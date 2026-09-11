"use client";

import React, { useState, useCallback } from "react";
import {
  ShinchanAvatar,
  HimawariAvatar,
  ShiroAvatar,
  HiroshiAvatar,
  MisaeAvatar,
  BuriAvatar,
  ChocobiStar,
} from "./NoharaAvatars";

interface FloatingItem {
  id: number;
  type: "shinchan" | "himawari" | "shiro" | "hiroshi" | "misae" | "buri" | "star";
  left: number; // percentage 0-95
  duration: number; // seconds
  delay: number; // seconds
  size: number; // px
  rotation: number;
  isPopped?: boolean;
}

const INITIAL_ITEMS: FloatingItem[] = [
  { id: 1, type: "shinchan", left: 6, duration: 16, delay: 0, size: 52, rotation: -12 },
  { id: 2, type: "shiro", left: 22, duration: 19, delay: 4, size: 48, rotation: 8 },
  { id: 3, type: "himawari", left: 38, duration: 17, delay: 1, size: 46, rotation: -6 },
  { id: 4, type: "buri", left: 54, duration: 21, delay: 6, size: 50, rotation: 15 },
  { id: 5, type: "hiroshi", left: 70, duration: 22, delay: 3, size: 54, rotation: -10 },
  { id: 6, type: "misae", left: 86, duration: 18, delay: 2, size: 52, rotation: 10 },
  { id: 7, type: "star", left: 14, duration: 14, delay: 5, size: 30, rotation: 25 },
  { id: 8, type: "shinchan", left: 48, duration: 20, delay: 9, size: 48, rotation: 6 },
  { id: 9, type: "shiro", left: 78, duration: 17, delay: 7, size: 44, rotation: -15 },
  { id: 10, type: "star", left: 92, duration: 15, delay: 8, size: 32, rotation: -20 },
  { id: 11, type: "himawari", left: 30, duration: 18, delay: 11, size: 44, rotation: 12 },
  { id: 12, type: "buri", left: 62, duration: 16, delay: 12, size: 48, rotation: -8 },
];

const SOUNDS = ["ปิ๊ง!", "โป๊ก!", "ฮ่าฮ่า!", "วู้ว!", "บิ๋ง!"] as const;

export function ShinchanFloatingBackground() {
  const [items, setItems] = useState<FloatingItem[]>(INITIAL_ITEMS);
  const [popEffects, setPopEffects] = useState<
    { id: string; x: number; y: number; text: string }[]
  >([]);

  const handlePop = useCallback((id: number, e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const sound = SOUNDS[id % SOUNDS.length];
    const popId = `${id}-${e.timeStamp}`;

    setPopEffects((prev) => [...prev, { id: popId, x, y, text: sound }]);

    setTimeout(() => {
      setPopEffects((prev) => prev.filter((p) => p.id !== popId));
    }, 800);

    // Mark as popped temporarily
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isPopped: true } : item))
    );

    // Respawn after 3 seconds
    setTimeout(() => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                isPopped: false,
                left: ((item.left + 35) % 88) + 4,
                delay: 0,
              }
            : item
        )
      );
    }, 3000);
  }, []);

  const renderAvatar = (type: FloatingItem["type"], size: number) => {
    const shadowClass = "drop-shadow-[3px_3px_0px_#0f172a] dark:drop-shadow-[0px_0px_8px_rgba(250,204,21,0.6)]";
    switch (type) {
      case "shinchan":
        return <ShinchanAvatar size={size} className={shadowClass} />;
      case "himawari":
        return <HimawariAvatar size={size} className={shadowClass} />;
      case "shiro":
        return <ShiroAvatar size={size} className={shadowClass} />;
      case "hiroshi":
        return <HiroshiAvatar size={size} className={shadowClass} />;
      case "misae":
        return <MisaeAvatar size={size} className={shadowClass} />;
      case "buri":
        return <BuriAvatar size={size} className={shadowClass} />;
      case "star":
        return <ChocobiStar size={size} className="drop-shadow-[2px_2px_0px_#0f172a] dark:drop-shadow-[0px_0px_6px_rgba(255,235,59,0.9)]" />;
    }
  };

  return (
    <>
      <style jsx global>{`
        @keyframes floatDown {
          0% {
            transform: translateY(-120px) rotate(0deg) translateX(0px);
            opacity: 0;
          }
          10% {
            opacity: 0.85;
          }
          50% {
            transform: translateY(50vh) rotate(15deg) translateX(25px);
          }
          90% {
            opacity: 0.85;
          }
          100% {
            transform: translateY(115vh) rotate(-15deg) translateX(-20px);
            opacity: 0;
          }
        }

        @keyframes popOut {
          0% {
            transform: translate(-50%, -50%) scale(0.6);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -80%) scale(1.3);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -110%) scale(1.5);
            opacity: 0;
          }
        }
      `}</style>

      {/* Floating Avatars Container */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {items.map((item) => {
          if (item.isPopped) return null;
          return (
            <div
              key={item.id}
              onClick={(e) => handlePop(item.id, e)}
              className="absolute pointer-events-auto cursor-pointer select-none transition-transform hover:scale-125 active:scale-95"
              style={{
                left: `${item.left}%`,
                top: 0,
                animation: `floatDown ${item.duration}s linear infinite`,
                animationDelay: `${item.delay}s`,
                zIndex: 0,
              }}
              title="แตะเพื่อจับชินจัง!"
            >
              {renderAvatar(item.type, item.size)}
            </div>
          );
        })}
      </div>

      {/* Interactive Pop Burst Labels */}
      {popEffects.map((p) => (
        <div
          key={p.id}
          className="fixed pointer-events-none z-50 font-black text-sm text-[#E53935] bg-[#FDD835] px-2.5 py-1 rounded-full border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]"
          style={{
            left: `${p.x}px`,
            top: `${p.y}px`,
            animation: "popOut 0.8s ease-out forwards",
          }}
        >
          {p.text} ✨
        </div>
      ))}
    </>
  );
}
