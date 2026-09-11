/**
 * Utility functions for Badminton Room Codes and Relative Timestamps
 */

/**
 * Generate a friendly alphanumeric room code like BAD88, SHIN01, NET24
 */
export function generateRoomCode(): string {
  const prefixes = ["BAD", "SHIN", "NET", "SMASH", "SHUT"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${prefix}${num}`;
}

/**
 * Derives or extracts the display room code from room_code, title tag, or id
 */
export function getDisplayRoomCode(room: {
  id?: string;
  room_code?: string | null;
  title?: string;
}): string {
  if (room.room_code && room.room_code.trim()) {
    return room.room_code.trim().toUpperCase();
  }
  // Check if title has [CODE:...]
  if (room.title) {
    const match = room.title.match(/\[CODE:([a-zA-Z0-9_-]+)\]/i);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
  }
  // Fallback to first 5 characters of UUID (without dashes)
  if (room.id) {
    return room.id.replace(/-/g, "").slice(0, 5).toUpperCase();
  }
  return "BAD88";
}

/**
 * Format relative time in Thai e.g. "สร้างเมื่อ 10 นาทีที่แล้ว"
 */
export function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "เมื่อสักครู่";
  const now = new Date();
  const date = new Date(dateStr);
  const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffSec < 60) return "เมื่อสักครู่";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `สร้างเมื่อ ${diffMin} นาทีที่แล้ว`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `สร้างเมื่อ ${diffHours} ชั่วโมงที่แล้ว`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "สร้างเมื่อวานนี้";
  if (diffDays < 7) return `สร้างเมื่อ ${diffDays} วันที่แล้ว`;
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

/**
 * Strip internal tags like [CODE:...] and [เป้าหมาย ... คน] from title
 */
export function getCleanTitle(title?: string | null): string {
  if (!title) return "";
  return title
    .replace(/\s*\[CODE:[^\]]+\]/gi, "")
    .replace(/\s*\[(?:เป้าหมาย|หาร)\s*\d+\s*คน\]/gi, "")
    .trim();
}

