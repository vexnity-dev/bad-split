/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState, useId } from "react";
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
  Upload,
  Send,
  Loader2,
  Image as ImageIcon,
  X,
  CreditCard,
  Receipt,
  FileCheck,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Room, Member } from "@/types/database";
import { ShuttleIcon } from "@/components/ShuttleIcon";
import {
  ShinchanAvatar,
  HimawariAvatar,
  ShiroAvatar,
  BuriAvatar,
  ActionKamenAvatar,
  ChocobiStar,
} from "@/components/NoharaAvatars";
import { ShinchanFloatingBackground } from "@/components/ShinchanFloatingBackground";

export default function RoomPage() {
  const params = useParams();
  const roomId = params?.id as string;
  const slipInputId = useId();

  // Active Tab: 'pay' (สแกนจ่ายเงิน) | 'list' (รายชื่อคนจ่ายแล้ว)
  const [activeTab, setActiveTab] = useState<"pay" | "list">("pay");

  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states for member payment submission
  const [memberName, setMemberName] = useState("");
  const [customAmount, setCustomAmount] = useState<number | "">("");
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [isSubmittingSlip, setIsSubmittingSlip] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Modal for viewing full slip image
  const [viewSlipUrl, setViewSlipUrl] = useState<string | null>(null);
  const [viewSlipMember, setViewSlipMember] = useState<string | null>(null);

  // Feedback states
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedLineSummary, setCopiedLineSummary] = useState(false);

  // Load initial data
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
          .order("created_at", { ascending: false });

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
        .order("created_at", { ascending: false });

      if (!membersError && membersData) {
        setMembers((membersData as Member[]) || []);
      }
    } catch (err) {
      console.error("Failed to refresh room data:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Target players calculation
  const getTargetPlayers = (r: Room): number => {
    if (r.target_players && r.target_players > 0) {
      return r.target_players;
    }
    const match = r.title.match(/(?:\[เป้าหมาย\s*|หาร\s*)(\d+)\s*คน/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return 0;
  };

  const cleanTitle = room ? room.title.replace(/\s*\[เป้าหมาย\s*\d+\s*คน\]/, "").trim() : "";
  const targetPlayers = room ? getTargetPlayers(room) : 0;

  // Per person amount
  const perPersonAmount = room
    ? room.per_person_fee && room.per_person_fee > 0
      ? Number(room.per_person_fee)
      : targetPlayers > 0
      ? Math.round((Number(room.total_fee) / targetPlayers) * 100) / 100
      : Number(room.total_fee)
    : 0;

  // Stats calculations
  const paidMembersList = members.filter((m) => m.is_paid);
  const paidMembersCount = paidMembersList.length;
  const collectedAmount = paidMembersList.reduce(
    (sum, m) => sum + Number(m.amount),
    0
  );
  const totalRoomFee = room ? Number(room.total_fee) : 0;
  const isGoalReached =
    (targetPlayers > 0 && paidMembersCount >= targetPlayers) ||
    (totalRoomFee > 0 && collectedAmount >= totalRoomFee);

  // Slip file selection
  const handleSlipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSlipFile(file);
    const objectUrl = URL.createObjectURL(file);
    setSlipPreview(objectUrl);
  };

  const handleRemoveSlip = () => {
    setSlipFile(null);
    if (slipPreview) {
      URL.revokeObjectURL(slipPreview);
      setSlipPreview(null);
    }
  };

  // Upload Slip to Supabase storage bucket 'qr-codes'
  const uploadSlipFile = async (): Promise<string | null> => {
    if (!slipFile) return null;

    try {
      const fileExt = slipFile.name.split(".").pop() || "png";
      const cleanFileName = `slip_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 8)}.${fileExt}`;
      const filePath = `slips/${cleanFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("qr-codes")
        .upload(filePath, slipFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.warn("Slip upload warning:", uploadError.message);
        return null;
      }

      const { data } = supabase.storage
        .from("qr-codes")
        .getPublicUrl(filePath);

      return data?.publicUrl || null;
    } catch (err) {
      console.error("Failed to upload slip file:", err);
      return null;
    }
  };

  // Member submits payment slip
  const handleSubmitSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);
    setSubmissionSuccess(null);

    if (!memberName.trim()) {
      setSubmissionError("กรุณากรอกชื่อของคุณหรือฉายาก่อนนะฮะ!");
      return;
    }

    const payAmount =
      typeof customAmount === "number" && customAmount > 0
        ? customAmount
        : perPersonAmount;

    setIsSubmittingSlip(true);

    try {
      // 1. Upload Slip if attached
      let slipUrl: string | null = null;
      if (slipFile) {
        slipUrl = await uploadSlipFile();
      }

      // 2. Insert member into members table
      const memberPayload: Record<string, unknown> = {
        room_id: roomId,
        name: memberName.trim(),
        amount: payAmount,
        is_paid: true,
        slip_url: slipUrl,
      };

      let { data: newMember, error: insertError } = await supabase
        .from("members")
        .insert([memberPayload])
        .select()
        .single();

      // If slip_url column is not yet in Supabase schema cache, retry without it
      if (
        insertError &&
        (insertError.message?.includes("slip_url") || insertError.code === "PGRST204")
      ) {
        console.warn("Retrying member insert without slip_url column:", insertError.message);
        const baseMemberPayload = {
          room_id: roomId,
          name: memberName.trim(),
          amount: payAmount,
          is_paid: true,
        };

        const retry = await supabase
          .from("members")
          .insert([baseMemberPayload])
          .select()
          .single();

        newMember = retry.data;
        insertError = retry.error;
      }

      if (insertError || !newMember) {
        throw new Error(insertError?.message || "ไม่สามารถบันทึกข้อมูลการโอนได้ กรุณาลองใหม่อีกครั้ง");
      }

      // 3. Update local state
      const updatedMembers = [newMember as Member, ...members];
      setMembers(updatedMembers);

      // Trigger colorful Shin-chan confetti celebration
      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#E53935", "#FDD835", "#43A047", "#1E88E5", "#EC407A"],
        });
      } catch (err) {
        console.warn("Confetti warning:", err);
      }

      // Reset form
      setMemberName("");
      setCustomAmount("");
      handleRemoveSlip();

      // Set success notification & auto switch to Tab 2
      setSubmissionSuccess("โป๊ก! บันทึกสลิปเรียบร้อยแล้วฮะ! 🎉");
      setTimeout(() => {
        setActiveTab("list");
      }, 700);
    } catch (err) {
      console.error("Failed to submit payment slip:", err);
      setSubmissionError(
        err instanceof Error
          ? err.message
          : "เกิดข้อผิดพลาดในการแจ้งโอนเงิน กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setIsSubmittingSlip(false);
    }
  };

  // Copy Amount to clipboard with comic sound effect
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
      const paidNames = paidMembersList
        .map((m, idx) => `${idx + 1}. ${m.name} (฿${Number(m.amount).toLocaleString()})`)
        .join("\n");

      const text = [
        `🏸 สรุปยอดก๊วนแบด: ${cleanTitle}`,
        `💰 ยอดโอนคนละ: ${perPersonAmount.toLocaleString()} บาท`,
        `📊 เก็บได้แล้ว: ฿${collectedAmount.toLocaleString()} / ฿${totalRoomFee.toLocaleString()} (${paidMembersCount} คน)`,
        paidNames ? `\n✅ คนที่โอนแล้ว (รอดตัวแล้วฮะ):\n${paidNames}` : "\n⏳ ยังไม่มีคนแจ้งโอน (ระวังโดนเขกหัวนะ!)",
        `\n🔗 กดเพื่อดู QR Code พร้อมเพย์ และส่งสลิปที่นี่:`,
        window.location.href,
      ].join("\n");

      await navigator.clipboard.writeText(text);
      setCopiedLineSummary(true);
      setTimeout(() => setCopiedLineSummary(false), 2000);
    } catch (err) {
      console.error("Failed to copy LINE summary:", err);
    }
  };

  // Helper avatar for members
  const getMemberAvatar = (index: number) => {
    const avatars = [ShinchanAvatar, HimawariAvatar, ShiroAvatar, BuriAvatar, ActionKamenAvatar];
    const AvatarComp = avatars[index % avatars.length];
    return <AvatarComp className="w-9 h-9 shrink-0" />;
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FEF9E7] text-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-full border-4 border-[#FDD835] border-t-[#E53935] animate-spin mb-4" />
        <div className="bg-white border-3 border-slate-900 rounded-2xl px-4 py-2 shadow-[4px_4px_0px_#0f172a] text-sm font-black animate-pulse">
          กำลังค้นหาข้อมูลก๊วนแบด... รอก่อนนะฮะ! 🏸
        </div>
      </div>
    );
  }

  // Error / Not Found State
  if (error || !room) {
    return (
      <div className="min-h-screen bg-[#FEF9E7] text-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border-4 border-slate-900 rounded-3xl p-6 text-center space-y-4 shadow-[6px_6px_0px_0px_#0f172a]">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FFEBEE] border-3 border-[#E53935] flex items-center justify-center text-[#E53935] shadow-[3px_3px_0px_#0f172a]">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-950">แง้! ไม่พบข้อมูลห้องนี้</h2>
          <p className="text-slate-600 text-xs font-bold">
            {error || "ห้องที่คุณกำลังค้นหาอาจถูกลบหรือไม่มีอยู่ในระบบฮะ"}
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#E53935] hover:bg-[#D32F2F] text-[#FDD835] font-black text-sm border-3 border-slate-900 shadow-[4px_4px_0px_#0f172a] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all w-full"
            >
              <ArrowLeft className="w-4 h-4 stroke-[3]" />
              <span>กลับไปหน้าสร้างห้อง</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center py-6 px-4 sm:px-6">
      {/* Floating Nohara Family Ambient Background */}
      <ShinchanFloatingBackground />

      <div className="w-full max-w-xl space-y-5 relative z-10">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900 bg-white px-3.5 py-2 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] hover:bg-[#FFF9C4] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[3]" />
            <span>สร้างห้องใหม่</span>
          </Link>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900 bg-white px-3.5 py-2 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] hover:bg-[#FFF9C4] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#E53935]" : ""}`}
            />
            <span>รีเฟรชข้อมูล</span>
          </button>
        </div>

        {/* Room Header Comic Card */}
        <div className="bg-white rounded-3xl p-5 border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDD835] border-2 border-slate-900 text-slate-950 text-xs font-black">
                  <ShuttleIcon className="w-3.5 h-3.5" />
                  <span>ก๊วนแบดมินตัน</span>
                </div>
                {targetPlayers > 0 && (
                  <span className="text-xs font-black text-white bg-[#E53935] border-2 border-slate-900 px-3 py-1 rounded-full shadow-[2px_2px_0px_#0f172a]">
                    เป้าหมาย {targetPlayers} คน
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                {cleanTitle}
              </h1>
              {room.created_at && (
                <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs mt-1.5">
                  <Clock className="w-3.5 h-3.5" />
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
          <div className="grid grid-cols-3 gap-2.5 mt-5 pt-4 border-t-2 border-dashed border-slate-200 text-center">
            <div className="bg-[#FFFDF0] rounded-2xl p-2.5 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
              <span className="text-[11px] font-bold text-slate-600 block">ยอดรวมห้อง</span>
              <span className="text-base sm:text-lg font-black text-slate-950 mt-0.5 block">
                ฿{Number(room.total_fee).toLocaleString()}
              </span>
            </div>
            <div className="bg-[#FFFDF0] rounded-2xl p-2.5 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
              <span className="text-[11px] font-bold text-slate-600 block">ค่าคอร์ท</span>
              <span className="text-base sm:text-lg font-black text-[#2E7D32] mt-0.5 block">
                ฿{Number(room.court_fee).toLocaleString()}
              </span>
            </div>
            <div className="bg-[#FFFDF0] rounded-2xl p-2.5 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
              <span className="text-[11px] font-bold text-slate-600 block">ค่าลูกแบด</span>
              <span className="text-base sm:text-lg font-black text-[#E53935] mt-0.5 block">
                ฿{Number(room.shuttle_fee).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Comic 2-Tab Switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-white rounded-2xl border-3 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a]">
          <button
            type="button"
            onClick={() => setActiveTab("pay")}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeTab === "pay"
                ? "bg-[#E53935] text-[#FDD835] shadow-[2px_2px_0px_#0f172a] border-2 border-slate-900"
                : "text-slate-600 hover:text-black"
            }`}
          >
            <CreditCard className="w-4 h-4 stroke-[2.5]" />
            <span>สแกนจ่ายเงิน</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeTab === "list"
                ? "bg-[#43A047] text-white shadow-[2px_2px_0px_#0f172a] border-2 border-slate-900"
                : "text-slate-600 hover:text-black"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>รายชื่อคนจ่ายแล้ว</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-black border border-slate-900 ${
                activeTab === "list"
                  ? "bg-[#FDD835] text-slate-950"
                  : "bg-slate-200 text-slate-800"
              }`}
            >
              {paidMembersCount}
            </span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: สแกนจ่ายเงิน (Pay & Submit Slip) */}
        {/* ======================================================== */}
        {activeTab === "pay" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Host QR Code Action Kamen Card Frame */}
            <div className="bg-gradient-to-br from-[#E8F5E9] via-white to-[#C8E6C9] rounded-3xl p-5 border-4 border-[#43A047] shadow-[6px_6px_0px_0px_#0f172a]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-slate-950 font-black text-base">
                  <ActionKamenAvatar className="w-6 h-6" />
                  <span>PromptPay QR Code หัวห้อง</span>
                </div>
                <span className="text-xs font-black text-white bg-[#43A047] border-2 border-slate-900 px-3 py-0.5 rounded-full shadow-[2px_2px_0px_#0f172a]">
                  สแกนจ่ายได้เลย!
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5">
                {/* QR Image Box */}
                <div className="shrink-0">
                  {room.qr_url ? (
                    <div className="relative group p-3 bg-white rounded-2xl shadow-[4px_4px_0px_#0f172a] border-3 border-slate-900 max-w-[200px]">
                      <img
                        src={room.qr_url}
                        alt="QR Code สำหรับโอนเงินหัวห้อง"
                        className="w-44 h-44 object-contain rounded-xl"
                      />
                      <a
                        href={room.qr_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex flex-col items-center justify-center text-white text-xs font-black gap-1.5"
                      >
                        <ExternalLink className="w-5 h-5" />
                        <span>กดดูรูปขนาดเต็ม</span>
                      </a>
                    </div>
                  ) : (
                    <div className="w-44 h-44 rounded-2xl bg-[#FFFDF0] border-3 border-dashed border-slate-400 flex flex-col items-center justify-center p-4 text-center shadow-[3px_3px_0px_#0f172a]">
                      <QrCode className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-xs font-black text-slate-700">
                        ไม่มีรูป QR Code
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 mt-1">
                        โอนผ่านพร้อมเพย์หรือเลขบัญชีผู้จัดนะฮะ
                      </p>
                    </div>
                  )}
                </div>

                {/* Amount to Pay & Comic Copy Button */}
                <div className="flex-1 w-full flex flex-col items-center sm:items-start text-center sm:text-left">
                  <span className="text-xs uppercase tracking-wider font-black text-slate-600 bg-[#FFF9C4] px-2.5 py-0.5 rounded-md border border-slate-300">
                    ยอดโอนต่อคน
                  </span>
                  <div className="text-4xl sm:text-5xl font-black text-[#E53935] drop-shadow-[2px_2px_0px_#FDD835] mt-1 mb-1">
                    ฿{perPersonAmount.toLocaleString()}
                  </div>
                  <p className="text-xs font-bold text-slate-600 mb-4">
                    {targetPlayers > 0
                      ? `คำนวณจากยอดรวม ฿${totalRoomFee.toLocaleString()} (หาร ${targetPlayers} คน)`
                      : `ยอดรวมทั้งห้อง ฿${totalRoomFee.toLocaleString()}`}
                  </p>

                  {/* Copy Amount Button with Comic Sound */}
                  <button
                    type="button"
                    onClick={handleCopyAmount}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#FDD835] hover:bg-[#FBC02D] text-slate-950 font-black text-xs sm:text-sm border-3 border-slate-900 shadow-[3px_3px_0px_#0f172a] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer"
                  >
                    {copiedAmount ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>โป๊ก! คัดลอกยอดเงินแล้ว 🌟</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 stroke-[2.5]" />
                        <span>คัดลอกยอดเงิน ({perPersonAmount} บาท)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Submission Form: แจ้งโอนเงินเข้าก๊วน */}
            <div className="bg-white rounded-3xl p-5 border-3 border-slate-900 shadow-[5px_5px_0px_0px_#0f172a] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-950 font-black text-base">
                  <Receipt className="w-5 h-5 text-[#E53935]" />
                  <span>แจ้งโอนเงินเข้าก๊วน</span>
                </div>
                <span className="text-xs font-bold text-[#43A047] bg-[#E8F5E9] px-2.5 py-0.5 rounded-full border border-[#43A047]">
                  แนบสลิปเพื่อยืนยัน
                </span>
              </div>
              <p className="text-xs font-bold text-slate-600">
                โอนเงินเสร็จแล้ว กรอกชื่อและแนบสลิปโอนเงินด้านล่างเพื่อให้ระบบบันทึกสถานะ
              </p>

              {/* Feedback messages */}
              {submissionError && (
                <div className="p-3.5 rounded-2xl bg-[#FFEBEE] border-2 border-[#E53935] text-[#C62828] text-xs font-bold flex items-center gap-2 shadow-[2px_2px_0px_#0f172a]">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#E53935]" />
                  <span>{submissionError}</span>
                </div>
              )}

              {submissionSuccess && (
                <div className="p-3.5 rounded-2xl bg-[#E8F5E9] border-2 border-[#43A047] text-[#2E7D32] text-xs font-black flex items-center gap-2 shadow-[2px_2px_0px_#0f172a]">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#43A047]" />
                  <span>{submissionSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSubmitSlip} className="space-y-4">
                {/* Member Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ชื่อของคุณ / ฉายา <span className="text-[#E53935]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="เช่น ชินจัง, คาซาม่า, มาซาโอะ"
                    className="w-full px-4 py-3 bg-[#FFFDF0] border-3 border-slate-900 rounded-2xl text-slate-950 font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E53935] transition-all text-sm"
                  />
                </div>

                {/* Amount Paid */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ยอดเงินที่โอน (บาท)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={customAmount !== "" ? customAmount : perPersonAmount}
                      onChange={(e) =>
                        setCustomAmount(
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                      placeholder={perPersonAmount.toString()}
                      className="w-full pl-4 pr-12 py-3 bg-[#FFFDF0] border-3 border-slate-900 rounded-2xl text-slate-950 font-black placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E53935] transition-all text-base"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-500 text-sm">
                      ฿
                    </span>
                  </div>
                </div>

                {/* Slip File Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    แนบสลิปโอนเงิน / ภาพหลักฐาน
                  </label>

                  {!slipPreview ? (
                    <label
                      htmlFor={slipInputId}
                      className="flex flex-col items-center justify-center border-3 border-dashed border-slate-300 hover:border-slate-900 rounded-2xl p-4 cursor-pointer bg-[#FFFDF0] hover:bg-[#FFF9C4] transition-all group shadow-[2px_2px_0px_#0f172a]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white group-hover:bg-[#FDD835] border-2 border-slate-900 flex items-center justify-center text-slate-700 transition-all mb-1.5 shadow-[2px_2px_0px_#0f172a]">
                        <Upload className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <p className="text-xs font-black text-slate-900">
                        แตะเพื่อเลือกรูปสลิปโอนเงิน
                      </p>
                      <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                        รองรับ JPG, PNG, WEBP จากแอปธนาคาร
                      </p>
                      <input
                        id={slipInputId}
                        type="file"
                        accept="image/*"
                        onChange={handleSlipFileChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FFFDF0] border-3 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white shrink-0 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                        <img
                          src={slipPreview}
                          alt="Slip Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate">
                          {slipFile?.name || "Payment Slip"}
                        </p>
                        <p className="text-[11px] font-bold text-[#2E7D32] flex items-center gap-1 mt-0.5">
                          <FileCheck className="w-3.5 h-3.5" />
                          แนบสลิปเรียบร้อยแล้วฮะ!
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveSlip}
                        aria-label="ลบรูปสลิป"
                        className="p-2 text-slate-500 hover:text-[#E53935] hover:bg-[#FFEBEE] rounded-xl border border-transparent hover:border-slate-900 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmittingSlip || !memberName.trim()}
                  className="w-full py-4 px-4 rounded-2xl bg-[#E53935] hover:bg-[#D32F2F] text-[#FDD835] font-black text-base border-3 border-slate-900 shadow-[4px_4px_0px_#0f172a] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmittingSlip ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-[#FDD835]" />
                      <span>กำลังส่งสลิป... รอก่อนนะฮะ!</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 stroke-[2.5]" />
                      <span>แจ้งโอนเงินเลยฮะ!</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: รายชื่อคนจ่ายแล้ว (Paid Members & Summary) */}
        {/* ======================================================== */}
        {activeTab === "list" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Chocobi Snack Box Styled Progress Card */}
            <div className="bg-[#43A047] rounded-3xl p-5 border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] text-white space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-black text-base">
                  <ChocobiStar className="w-5 h-5 text-[#FDD835]" />
                  <span>ความคืบหน้าการเก็บเงิน</span>
                </div>
                <span className="text-xs font-black bg-[#FDD835] text-slate-950 px-3 py-0.5 rounded-full border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                  {targetPlayers > 0
                    ? `${paidMembersCount} / ${targetPlayers} คน (${Math.min(100, Math.round((paidMembersCount / targetPlayers) * 100))}%)`
                    : `${paidMembersCount} คน`}
                </span>
              </div>

              {/* Chocobi Progress Bar */}
              <div className="w-full bg-slate-900 rounded-full h-5 p-1 border-2 border-yellow-300 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-[#FDD835] to-[#FFEB3B] h-full rounded-full transition-all duration-500 ease-out border border-slate-900"
                  style={{
                    width: `${
                      totalRoomFee > 0
                        ? Math.min(100, (collectedAmount / totalRoomFee) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs font-black pt-1">
                <span>
                  เก็บได้แล้ว:{" "}
                  <strong className="text-[#FDD835] text-sm">
                    ฿{collectedAmount.toLocaleString()}
                  </strong>
                </span>
                <span>
                  ยอดห้อง:{" "}
                  <strong className="text-white text-sm">
                    ฿{totalRoomFee.toLocaleString()}
                  </strong>
                </span>
              </div>

              {isGoalReached && (
                <div className="p-3.5 bg-[#FFF9C4] border-3 border-slate-900 rounded-2xl flex items-center gap-2.5 text-slate-950 text-xs sm:text-sm font-black shadow-[3px_3px_0px_#0f172a] animate-in fade-in">
                  <PartyPopper className="w-5 h-5 text-[#E53935] shrink-0" />
                  <span>🎉 วู้ววว! สมาชิกจ่ายเงินครบก๊วนแล้ว รอดพ้นมือแม่มิซาเอะ!</span>
                </div>
              )}
            </div>

            {/* Paid Members List */}
            <div className="bg-white rounded-3xl p-5 border-3 border-slate-900 shadow-[5px_5px_0px_0px_#0f172a] space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-950 font-black text-base">
                  <Users className="w-5 h-5 text-[#43A047]" />
                  <span>รายชื่อคนที่โอนแล้ว ({paidMembersCount} คน)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("pay")}
                  className="text-xs font-black text-[#E53935] hover:underline"
                >
                  + แจ้งโอนเพิ่ม
                </button>
              </div>

              {paidMembersList.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#FFFDF0] border-2 border-slate-900 flex items-center justify-center mx-auto shadow-[3px_3px_0px_#0f172a]">
                    <ShiroAvatar className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">
                      ยังไม่มีใครแจ้งโอนเลยฮะ!
                    </p>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">
                      เป็นคนแรกที่สแกนจ่ายและส่งสลิปให้ก๊วนกันเถอะ!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("pay")}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#FDD835] text-slate-950 text-xs font-black border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] hover:bg-[#FBC02D] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                  >
                    <CreditCard className="w-4 h-4 stroke-[2.5]" />
                    <span>ไปหน้าสแกนจ่ายเงิน</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {paidMembersList.map((member, index) => {
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FFFDF0] border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] hover:bg-white transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Character Avatar */}
                          {getMemberAvatar(index)}

                          {/* Member info */}
                          <div className="min-w-0">
                            <div className="text-sm font-black text-slate-950 truncate">
                              {member.name}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                              <span className="text-[#2E7D32] font-black">
                                ฿{Number(member.amount).toLocaleString()} บาท
                              </span>
                              {member.created_at && (
                                <>
                                  <span>•</span>
                                  <span>
                                    {new Date(member.created_at).toLocaleTimeString("th-TH", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}{" "}
                                    น.
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Slip preview & status badge */}
                        <div className="flex items-center gap-2 shrink-0">
                          {member.slip_url ? (
                            <button
                              type="button"
                              onClick={() => {
                                setViewSlipUrl(member.slip_url || null);
                                setViewSlipMember(member.name);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFF9C4] text-slate-950 text-xs font-black border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                            >
                              <ImageIcon className="w-3.5 h-3.5 text-[#E53935]" />
                              <span>ดูสลิป</span>
                            </button>
                          ) : null}

                          <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl bg-[#E8F5E9] text-[#2E7D32] border-2 border-[#43A047]">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>จ่ายแล้วจ้า! ✨</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Share Section (Visible on both tabs) */}
        <div className="bg-white rounded-3xl p-5 border-3 border-slate-900 shadow-[5px_5px_0px_0px_#0f172a] space-y-3">
          <div className="flex items-center gap-2 text-slate-950 font-black text-base">
            <Share2 className="w-5 h-5 text-[#E53935]" />
            <span>แชร์ให้เพื่อนในก๊วน</span>
          </div>
          <p className="text-xs font-bold text-slate-600">
            ส่งลิงก์เข้ากลุ่ม LINE ให้เพื่อนกดเข้ามาสแกนจ่ายและแนบสลิปได้เลย
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Copy URL Button */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-[#FFFDF0] hover:bg-white border-3 border-slate-900 text-slate-950 text-xs font-black shadow-[3px_3px_0px_#0f172a] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-[#2E7D32] stroke-[3]" />
                  <span className="text-[#2E7D32]">คัดลอกลิงก์แล้ว!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-700 stroke-[2.5]" />
                  <span>คัดลอกลิงก์ก๊วน</span>
                </>
              )}
            </button>

            {/* Copy LINE Summary Text */}
            <button
              type="button"
              onClick={handleCopyLineSummary}
              className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-black border-3 border-slate-900 shadow-[3px_3px_0px_#0f172a] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer"
            >
              {copiedLineSummary ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>คัดลอกข้อความ LINE แล้ว!</span>
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4 stroke-[2.5]" />
                  <span>คัดลอกสรุปส่งเข้ากลุ่ม LINE</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Full Slip Modal */}
        {viewSlipUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white border-4 border-slate-900 rounded-3xl max-w-sm w-full p-4 shadow-[8px_8px_0px_0px_#0f172a] space-y-3 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#E53935]" />
                  <h3 className="text-sm font-black text-slate-950 truncate">
                    สลิปของ {viewSlipMember || "สมาชิก"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setViewSlipUrl(null)}
                  className="p-1 rounded-xl bg-slate-100 border border-slate-900 hover:bg-slate-200 text-slate-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-2xl overflow-hidden bg-slate-100 border-3 border-slate-900 max-h-[65vh] flex items-center justify-center">
                <img
                  src={viewSlipUrl}
                  alt="Full Payment Slip"
                  className="max-h-[65vh] w-auto object-contain rounded-xl"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <a
                  href={viewSlipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-black text-[#E53935] hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>เปิดรูปแท็บใหม่</span>
                </a>
                <button
                  type="button"
                  onClick={() => setViewSlipUrl(null)}
                  className="px-4 py-2 rounded-xl bg-[#FDD835] hover:bg-[#FBC02D] text-slate-950 text-xs font-black border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Comic Footer */}
        <footer className="text-center text-xs font-bold text-slate-500 py-4 flex items-center justify-center gap-1.5">
          <ShinchanAvatar className="w-4 h-4" />
          <span>Bad-Split x Crayon Shin-chan • หารค่าแบดมินตันสุดน่ารัก</span>
          <Sparkles className="w-3.5 h-3.5 text-[#FDD835]" />
        </footer>
      </div>
    </div>
  );
}
