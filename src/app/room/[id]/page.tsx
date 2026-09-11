/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  CheckCircle2,
  Copy,
  Check,
  Share2,
  ArrowLeft,
  QrCode,
  Users,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  PartyPopper,
  AlertCircle,
  Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Room, Member } from "@/types/database";
import { ShuttleIcon } from "@/components/ShuttleIcon";

export default function RoomPage() {
  const params = useParams();
  const roomId = params?.id as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Feedback states
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedLineSummary, setCopiedLineSummary] = useState(false);

  // Fetch initial room & members data
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      if (!roomId) return;
      try {
        // 1. Fetch Room
        const { data: roomData, error: roomError } = await supabase
          .from("rooms")
          .select("*")
          .eq("id", roomId)
          .single();

        if (!isMounted) return;

        if (roomError || !roomData) {
          throw new Error(roomError?.message || "ไม่พบข้อมูลห้องที่ระบุ");
        }

        setRoom(roomData as Room);

        // 2. Fetch Members
        const { data: membersData, error: membersError } = await supabase
          .from("members")
          .select("*")
          .eq("room_id", roomId)
          .order("name", { ascending: true });

        if (!isMounted) return;

        if (membersError) {
          throw new Error(membersError.message);
        }

        setMembers((membersData as Member[]) || []);
      } catch (err) {
        if (!isMounted) return;
        console.error("Error fetching room data:", err);
        setError(
          err instanceof Error
            ? err.message
            : "เกิดข้อผิดพลาดในการโหลดข้อมูลห้อง"
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  // Refresh handler
  const handleRefresh = async () => {
    if (!roomId || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (!roomError && roomData) {
        setRoom(roomData as Room);
      }

      const { data: membersData, error: membersError } = await supabase
        .from("members")
        .select("*")
        .eq("room_id", roomId)
        .order("name", { ascending: true });

      if (!membersError && membersData) {
        setMembers((membersData as Member[]) || []);
      }
    } catch (err) {
      console.error("Failed to refresh room data:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Toggle Member is_paid status
  const handleTogglePayment = async (member: Member) => {
    const updatedStatus = !member.is_paid;

    // Optimistic UI update
    const updatedMembers = members.map((m) =>
      m.id === member.id ? { ...m, is_paid: updatedStatus } : m
    );
    setMembers(updatedMembers);

    // If this toggled everyone to paid, trigger confetti
    if (
      updatedStatus &&
      updatedMembers.length > 0 &&
      updatedMembers.every((m) => m.is_paid)
    ) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#10b981", "#34d399", "#6ee7b7", "#fbbf24", "#38bdf8"],
        });
      } catch (err) {
        console.warn("Confetti trigger warning:", err);
      }
    }

    try {
      const { error: updateError } = await supabase
        .from("members")
        .update({ is_paid: updatedStatus })
        .eq("id", member.id);

      if (updateError) {
        throw updateError;
      }
    } catch (err) {
      console.error("Failed to update payment status:", err);
      // Rollback on error
      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id ? { ...m, is_paid: member.is_paid } : m
        )
      );
    }
  };

  // Stats calculations
  const totalMembers = members.length;
  const paidMembers = members.filter((m) => m.is_paid).length;
  const paidPercentage =
    totalMembers > 0 ? Math.round((paidMembers / totalMembers) * 100) : 0;
  const collectedAmount = members
    .filter((m) => m.is_paid)
    .reduce((sum, m) => sum + Number(m.amount), 0);
  const perPersonAmount =
    totalMembers > 0 && room ? Number(members[0]?.amount || (room.total_fee / totalMembers)) : 0;

  // Copy Amount to clipboard
  const handleCopyAmount = async () => {
    try {
      const amountText = perPersonAmount.toString();
      await navigator.clipboard.writeText(amountText);
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    } catch (err) {
      console.error("Failed to copy amount:", err);
    }
  };

  // Copy Room Link to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  // Copy LINE Summary Text
  const handleCopyLineSummary = async () => {
    if (!room) return;
    try {
      const unpaidNames = members
        .filter((m) => !m.is_paid)
        .map((m) => `• ${m.name}`)
        .join("\n");

      const text = [
        `🏸 สรุปยอดก๊วนแบด: ${room.title}`,
        `💰 ยอดโอนต่อคน: ${perPersonAmount.toLocaleString()} บาท`,
        `📊 สถานะ: จ่ายแล้ว ${paidMembers}/${totalMembers} คน (${paidPercentage}%)`,
        unpaidNames ? `\n⏳ ยังไม่จ่าย:\n${unpaidNames}` : "🎉 จ่ายครบทุกคนแล้ว!",
        `\n🔗 ดูรายละเอียด QR Code และอัปเดตสถานะที่นี่:`,
        window.location.href,
      ].join("\n");

      await navigator.clipboard.writeText(text);
      setCopiedLineSummary(true);
      setTimeout(() => setCopiedLineSummary(false), 2000);
    } catch (err) {
      console.error("Failed to copy LINE summary:", err);
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium animate-pulse">
          กำลังโหลดข้อมูลก๊วนแบด...
        </p>
      </div>
    );
  }

  // Error / Not Found State
  if (error || !room) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">ไม่พบข้อมูลห้องนี้</h2>
          <p className="text-slate-400 text-xs">
            {error || "ห้องที่คุณกำลังค้นหาอาจถูกลบหรือไม่มีอยู่ในระบบ"}
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all w-full"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>กลับไปหน้าสร้างห้อง</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-6 px-4 sm:px-6">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-emerald-500/15 blur-[120px] rounded-full" />
        <div className="absolute top-96 right-10 w-[300px] h-[300px] bg-emerald-600/10 blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-xl space-y-5">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>สร้างห้องใหม่</span>
          </Link>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`}
            />
            <span>รีเฟรชข้อมูล</span>
          </button>
        </div>

        {/* Room Header Card */}
        <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl p-5 border border-slate-700/70 shadow-xl shadow-slate-950/40 relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold mb-2">
                <ShuttleIcon className="w-3 h-3 text-emerald-400" />
                <span>ก๊วนแบดมินตัน</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {room.title}
              </h1>
              {room.created_at && (
                <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    สร้างเมื่อ{" "}
                    {new Date(room.created_at).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-slate-700/60 text-center">
            <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-700/50">
              <span className="text-[11px] text-slate-400 block">ยอดรวมทั้งหมด</span>
              <span className="text-base font-bold text-white mt-0.5 block">
                ฿{Number(room.total_fee).toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-700/50">
              <span className="text-[11px] text-slate-400 block">ค่าคอร์ท</span>
              <span className="text-base font-semibold text-slate-200 mt-0.5 block">
                ฿{Number(room.court_fee).toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-700/50">
              <span className="text-[11px] text-slate-400 block">ค่าลูกแบด</span>
              <span className="text-base font-semibold text-slate-200 mt-0.5 block">
                ฿{Number(room.shuttle_fee).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* QR Code & Payment Amount Card */}
        <div className="bg-gradient-to-br from-slate-800/90 via-slate-800/90 to-emerald-950/40 backdrop-blur-md rounded-2xl p-5 border border-emerald-500/30 shadow-xl shadow-slate-950/40">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <QrCode className="w-5 h-5 text-emerald-400" />
              <span>การชำระเงิน</span>
            </div>
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-medium">
              สแกนจ่ายได้เลย
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* QR Image Box */}
            <div className="shrink-0">
              {room.qr_url ? (
                <div className="relative group p-2 bg-white rounded-2xl shadow-lg shadow-black/30 border border-slate-200 max-w-[200px]">
                  <img
                    src={room.qr_url}
                    alt="QR Code สำหรับโอนเงิน"
                    className="w-44 h-44 object-contain rounded-xl"
                  />
                  <a
                    href={room.qr_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex flex-col items-center justify-center text-white text-xs font-semibold gap-1"
                  >
                    <ExternalLink className="w-5 h-5" />
                    <span>กดดูรูปเต็ม</span>
                  </a>
                </div>
              ) : (
                <div className="w-44 h-44 rounded-2xl bg-slate-900 border border-dashed border-slate-700 flex flex-col items-center justify-center p-4 text-center">
                  <QrCode className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-xs text-slate-400 font-medium">
                    ไม่มีรูป QR Code
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    โอนผ่านพร้อมเพย์หรือเลขบัญชีผู้จัด
                  </p>
                </div>
              )}
            </div>

            {/* Payment Details & Copy Button */}
            <div className="flex-1 w-full flex flex-col items-center sm:items-start text-center sm:text-left">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                ยอดโอนต่อคน
              </span>
              <div className="text-3xl sm:text-4xl font-black text-emerald-400 mt-0.5 mb-1">
                ฿{perPersonAmount.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mb-4">
                หาร {totalMembers} คน (ยอดรวม ฿{Number(room.total_fee).toLocaleString()})
              </p>

              {/* Copy Amount Button */}
              <button
                type="button"
                onClick={handleCopyAmount}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-950/40 transition-all active:scale-95"
              >
                {copiedAmount ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>คัดลอกยอดเงินแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>คัดลอกยอดเงิน ({perPersonAmount} บาท)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Payment Progress Card */}
        <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl p-5 border border-slate-700/60 shadow-xl shadow-slate-950/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>ความคืบหน้าการชำระเงิน</span>
            </div>
            <span className="text-xs font-semibold text-emerald-400">
              {paidMembers} / {totalMembers} คน ({paidPercentage}%)
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-900 rounded-full h-3.5 p-0.5 border border-slate-700/80 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${paidPercentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>
              เก็บได้แล้ว:{" "}
              <strong className="text-white">
                ฿{collectedAmount.toLocaleString()}
              </strong>
            </span>
            <span>
              คงเหลือ:{" "}
              <strong className="text-amber-400">
                ฿{Math.max(0, Number(room.total_fee) - collectedAmount).toLocaleString()}
              </strong>
            </span>
          </div>

          {paidMembers === totalMembers && totalMembers > 0 && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-emerald-300 text-xs font-medium animate-in fade-in">
              <PartyPopper className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>สุดยอด! สมาชิกในก๊วนชำระเงินครบทุกคนแล้ว 🎉</span>
            </div>
          )}
        </div>

        {/* Member Payment Checklist */}
        <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl p-5 border border-slate-700/60 shadow-xl shadow-slate-950/40 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <Users className="w-5 h-5 text-emerald-400" />
              <span>เช็คชื่อการชำระเงิน ({totalMembers} คน)</span>
            </div>
            <span className="text-[11px] text-slate-400">
              แตะเพื่อเปลี่ยนสถานะ
            </span>
          </div>

          <div className="space-y-2">
            {members.map((member, index) => {
              const initial = member.name.charAt(0).toUpperCase() || `${index + 1}`;
              return (
                <div
                  key={member.id}
                  onClick={() => handleTogglePayment(member)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                    member.is_paid
                      ? "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15"
                      : "bg-slate-900/80 border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                        member.is_paid
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}
                    >
                      {initial}
                    </div>

                    {/* Member Info */}
                    <div>
                      <div
                        className={`text-sm font-semibold transition-colors ${
                          member.is_paid ? "text-white line-through decoration-emerald-500/60" : "text-slate-100"
                        }`}
                      >
                        {member.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        ฿{Number(member.amount).toLocaleString()} บาท
                      </div>
                    </div>
                  </div>

                  {/* Status & Toggle Checkbox */}
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                        member.is_paid
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {member.is_paid ? "จ่ายแล้ว" : "รอจ่าย"}
                    </span>
                    <button
                      type="button"
                      aria-label={`เปลี่ยนสถานะการจ่ายของ ${member.name}`}
                      className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                        member.is_paid
                          ? "bg-emerald-500 text-slate-950"
                          : "border-2 border-slate-600 hover:border-emerald-500"
                      }`}
                    >
                      {member.is_paid ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : null}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Share Section */}
        <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl p-5 border border-slate-700/60 shadow-xl shadow-slate-950/40 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Share2 className="w-5 h-5 text-emerald-400" />
            <span>แชร์ให้เพื่อนในก๊วน</span>
          </div>
          <p className="text-xs text-slate-400">
            ส่งต่อให้เพื่อนร่วมก๊วนเพื่อดูยอดและอัปเดตสถานะการจ่ายเงิน
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* Copy URL Button */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-900 hover:bg-slate-950 border border-slate-700 hover:border-slate-600 text-white text-xs font-semibold transition-all active:scale-95"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">คัดลอกลิงก์แล้ว!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>คัดลอกลิงก์ก๊วน</span>
                </>
              )}
            </button>

            {/* Copy LINE Summary Text */}
            <button
              type="button"
              onClick={handleCopyLineSummary}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-bold shadow-md transition-all active:scale-95"
            >
              {copiedLineSummary ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>คัดลอกข้อความ LINE แล้ว!</span>
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4" />
                  <span>คัดลอกสรุปส่งเข้ากลุ่ม LINE</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bottom Footer */}
        <footer className="text-center text-xs text-slate-500 py-4">
          Badminton Expense Split • สร้างด้วย Next.js, Tailwind CSS & Supabase
        </footer>
      </div>
    </div>
  );
}
