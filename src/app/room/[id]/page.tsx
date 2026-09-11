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
  Lock,
  KeyRound,
  Pin,
  Trash2,
  Save,
  Crown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Room, Member } from "@/types/database";
import { ShuttleIcon } from "@/components/ShuttleIcon";
import { getDisplayRoomCode, getCleanTitle } from "@/lib/roomCode";
import {
  ShinchanAvatar,
  HimawariAvatar,
  ShiroAvatar,
  BuriAvatar,
  ActionKamenAvatar,
  ChocobiStar,
} from "@/components/NoharaAvatars";
import { ShinchanFloatingBackground } from "@/components/ShinchanFloatingBackground";
import { ThemeToggle } from "@/components/ThemeToggle";

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

  // Host Role & Authentication states
  const [isHost, setIsHost] = useState(false);
  const [showHostLoginModal, setShowHostLoginModal] = useState(false);
  const [hostPinInput, setHostPinInput] = useState("");
  const [hostLoginError, setHostLoginError] = useState<string | null>(null);
  const [hostActionNotice, setHostActionNotice] = useState<string | null>(null);

  // Host Notes states
  const [hostNotes, setHostNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedSuccess, setNotesSavedSuccess] = useState(false);

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
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);

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

        // Check host role from localStorage
        try {
          const storedKey = localStorage.getItem(`badsplit_host_${roomId}`);
          if (storedKey) {
            if (roomData.passkey) {
              setIsHost(storedKey === roomData.passkey);
            } else {
              setIsHost(storedKey === "creator" || Boolean(storedKey));
            }
          }
        } catch (storageErr) {
          console.warn("Storage check:", storageErr);
        }

        // Initialize Host Notes
        if (roomData.host_notes) {
          setHostNotes(roomData.host_notes);
        }

        // Save to recent rooms in localStorage
        try {
          const recentStr = localStorage.getItem("badsplit_recent_rooms");
          const recents = recentStr ? JSON.parse(recentStr) : [];
          const currentItem = {
            id: roomData.id,
            title: roomData.title,
            per_person_fee: roomData.per_person_fee,
            total_fee: roomData.total_fee,
            visited_at: new Date().toISOString(),
          };
          const filtered = Array.isArray(recents)
            ? recents.filter((r: { id?: string }) => r && r.id !== roomData.id)
            : [];
          localStorage.setItem(
            "badsplit_recent_rooms",
            JSON.stringify([currentItem, ...filtered].slice(0, 8))
          );
        } catch (storageErr) {
          console.warn("Recent rooms save error:", storageErr);
        }

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
        if (roomData.host_notes) {
          setHostNotes(roomData.host_notes);
        }
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

  // Host Login Handler
  const handleHostLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setHostLoginError(null);
    const pin = hostPinInput.trim();

    if (!pin) {
      setHostLoginError("กรุณากรอกรหัสผ่านหัวห้องนะฮะ!");
      return;
    }

    // Check passkey
    if (room?.passkey && pin !== room.passkey) {
      setHostLoginError("รหัสผ่านไม่ถูกต้องฮะ! ลองตรวจดูอีกครั้งนะ");
      return;
    }

    // Success
    try {
      localStorage.setItem(`badsplit_host_${roomId}`, pin);
    } catch (err) {
      console.warn("LocalStorage save error:", err);
    }

    setIsHost(true);
    setShowHostLoginModal(false);
    setHostPinInput("");
  };

  // Host Logout Handler
  const handleHostLogout = () => {
    try {
      localStorage.removeItem(`badsplit_host_${roomId}`);
    } catch (err) {
      console.warn("LocalStorage remove error:", err);
    }
    setIsHost(false);
  };

  // Save Host Notes
  const handleSaveNotes = async () => {
    if (!roomId || !isHost) return;
    setIsSavingNotes(true);
    try {
      const { error: updateError } = await supabase
        .from("rooms")
        .update({ host_notes: hostNotes })
        .eq("id", roomId);

      if (updateError) throw updateError;

      setRoom((prev) => (prev ? { ...prev, host_notes: hostNotes } : null));
      setNotesSavedSuccess(true);
      setTimeout(() => setNotesSavedSuccess(false), 2000);
    } catch (err) {
      console.error("Failed to save host notes:", err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Toggle member paid status (Host only)
  const handleToggleMemberPaid = async (member: Member) => {
    if (!isHost) {
      setHostActionNotice("เฉพาะหัวห้องเท่านั้นที่สามารถเปลี่ยนสถานะได้นะฮะ! (กดปุ่มเข้าสู่ระบบหัวห้องด้านบน)");
      setTimeout(() => setHostActionNotice(null), 3000);
      return;
    }

    const nextPaid = !member.is_paid;
    // Optimistic update
    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, is_paid: nextPaid } : m))
    );

    try {
      const { error: updateError } = await supabase
        .from("members")
        .update({ is_paid: nextPaid })
        .eq("id", member.id);

      if (updateError) throw updateError;
    } catch (err) {
      console.error("Failed to toggle paid status:", err);
      // Rollback
      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id ? { ...m, is_paid: member.is_paid } : m
        )
      );
    }
  };

  // Delete member / invalid slip (Host only)
  const handleDeleteMember = async (member: Member) => {
    if (!isHost) return;

    const confirmed = window.confirm(`ต้องการลบรายชื่อ "${member.name}" ออกจากก๊วนใช่ไหมฮะ?`);
    if (!confirmed) return;

    // Optimistic update
    setMembers((prev) => prev.filter((m) => m.id !== member.id));

    try {
      const { error: deleteError } = await supabase
        .from("members")
        .delete()
        .eq("id", member.id);

      if (deleteError) throw deleteError;
    } catch (err) {
      console.error("Failed to delete member:", err);
      // Refresh to restore
      handleRefresh();
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

  const cleanTitle = room ? getCleanTitle(room.title) : "";
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

  const displayRoomCode = room ? getDisplayRoomCode(room) : "";

  // Copy Room Code to clipboard
  const handleCopyRoomCode = async () => {
    if (!displayRoomCode) return;
    try {
      await navigator.clipboard.writeText(displayRoomCode);
      setCopiedRoomCode(true);
      setTimeout(() => setCopiedRoomCode(false), 2000);
    } catch (err) {
      console.error("Failed to copy room code:", err);
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
        `🔑 รหัสห้อง: ${displayRoomCode}`,
        `💰 ยอดโอนคนละ: ${perPersonAmount.toLocaleString()} บาท`,
        `📊 เก็บได้แล้ว: ฿${collectedAmount.toLocaleString()} / ฿${totalRoomFee.toLocaleString()} (${paidMembersCount} คน)`,
        paidNames ? `\n✅ คนที่โอนแล้ว (รอดตัวแล้วฮะ):\n${paidNames}` : "\n⏳ ยังไม่มีคนแจ้งโอน (ระวังโดนเขกหัวนะ!)",
        room.host_notes ? `\n📌 โน้ตจากหัวห้อง:\n${room.host_notes}` : "",
        `\n🔗 เข้าเว็บแล้วใส่รหัส "${displayRoomCode}" หรือกดลิงก์นี้:`,
        window.location.href,
      ].filter(Boolean).join("\n");

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
      <div className="min-h-screen bg-[#FEF9E7] dark:bg-[#0d131f] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-full border-4 border-[#FDD835] border-t-[#E53935] animate-spin mb-4" />
        <div className="bg-white dark:bg-[#1a2234] border-3 border-slate-900 dark:border-slate-700 rounded-2xl px-4 py-2 shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] text-sm font-black text-slate-900 dark:text-white animate-pulse">
          กำลังค้นหาข้อมูลก๊วนแบด... รอก่อนนะฮะ! 🏸
        </div>
      </div>
    );
  }

  // Error / Not Found State
  if (error || !room) {
    return (
      <div className="min-h-screen bg-[#FEF9E7] dark:bg-[#0d131f] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-[#1a2234] border-4 border-slate-900 dark:border-slate-700 rounded-3xl p-6 text-center space-y-4 shadow-[6px_6px_0px_0px_#0f172a] dark:shadow-[6px_6px_0px_0px_#000]">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FFEBEE] dark:bg-[#3b1219] border-3 border-[#E53935] flex items-center justify-center text-[#E53935] shadow-[3px_3px_0px_#0f172a] dark:shadow-none">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-950 dark:text-white">แง้! ไม่พบข้อมูลห้องนี้</h2>
          <p className="text-slate-600 dark:text-slate-300 text-xs font-bold">
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
        {/* Navigation Bar with Theme Toggle & Host Role Controls */}
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white bg-white dark:bg-[#1a2234] px-3.5 py-2 rounded-xl border-2 border-slate-900 dark:border-slate-700 shadow-[2px_2px_0px_#0f172a] dark:shadow-[2px_2px_0px_#000] hover:bg-[#FFF9C4] dark:hover:bg-slate-800 transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[3]" />
            <span>สร้างห้องใหม่</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Host Status & Login/Logout Button */}
            {isHost ? (
              <div className="inline-flex items-center gap-1.5 bg-[#FDD835] text-slate-950 px-2.5 py-1.5 rounded-xl border-2 border-slate-900 font-black text-xs shadow-[2px_2px_0px_#0f172a]">
                <Crown className="w-3.5 h-3.5 text-[#E53935]" />
                <span className="hidden sm:inline">หัวห้อง</span>
                <button
                  type="button"
                  onClick={handleHostLogout}
                  title="ออกจากโหมดหัวห้อง"
                  className="ml-1 text-[10px] underline text-slate-800 hover:text-black"
                >
                  ออก
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowHostLoginModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white bg-[#FFF9C4] dark:bg-yellow-950/60 px-3 py-1.5 rounded-xl border-2 border-slate-900 dark:border-yellow-400/60 shadow-[2px_2px_0px_#0f172a] dark:shadow-none hover:bg-[#FFF59D] transition-all cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-[#E53935]" />
                <span>เข้าสู่ระบบหัวห้อง</span>
              </button>
            )}

            <ThemeToggle />

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white bg-white dark:bg-[#1a2234] px-3 py-1.5 rounded-xl border-2 border-slate-900 dark:border-slate-700 shadow-[2px_2px_0px_#0f172a] dark:shadow-[2px_2px_0px_#000] hover:bg-[#FFF9C4] dark:hover:bg-slate-800 transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#E53935]" : ""}`}
              />
              <span className="hidden sm:inline">รีเฟรช</span>
            </button>
          </div>
        </div>

        {/* Action Notice Toast (e.g. when guest tries to toggle status) */}
        {hostActionNotice && (
          <div className="p-3 rounded-2xl bg-[#FFF9C4] border-2 border-slate-900 text-slate-950 text-xs font-black shadow-[3px_3px_0px_#0f172a] flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#E53935] shrink-0" />
              <span>{hostActionNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowHostLoginModal(true)}
              className="px-2 py-1 bg-[#E53935] text-white rounded-lg text-[11px] font-black shrink-0"
            >
              เข้าสู่ระบบ
            </button>
          </div>
        )}

        {/* Room Code Copied Toast */}
        {copiedRoomCode && (
          <div className="p-3 rounded-2xl bg-[#E8F5E9] dark:bg-emerald-950 border-3 border-[#43A047] dark:border-emerald-400 text-slate-950 dark:text-emerald-200 text-xs font-black shadow-[3px_3px_0px_#0f172a] flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <Check className="w-4 h-4 text-[#2E7D32] dark:text-emerald-400 shrink-0" />
            <span>
              โป๊ก! คัดลอกรหัสห้อง <span className="font-mono underline text-sm">{displayRoomCode}</span> แล้วฮะ! บอกเพื่อนในคอร์ทพิมพ์รหัสนี้ที่หน้าเว็บได้เลย! 🌟
            </span>
          </div>
        )}

        {/* Room Header Comic Card */}
        <div className="bg-white dark:bg-[#1a2234] rounded-3xl p-5 border-4 border-slate-900 dark:border-slate-700 shadow-[6px_6px_0px_0px_#0f172a] dark:shadow-[6px_6px_0px_0px_#000] relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDD835] border-2 border-slate-900 text-slate-950 text-xs font-black">
                  <ShuttleIcon className="w-3.5 h-3.5" />
                  <span>ก๊วนแบดมินตัน</span>
                </div>
                {/* Room Code Badge */}
                <button
                  type="button"
                  onClick={handleCopyRoomCode}
                  title="กดเพื่อคัดลอกรหัสห้อง"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F5E9] dark:bg-emerald-950 border-2 border-slate-900 dark:border-emerald-400 text-slate-950 dark:text-emerald-200 text-xs font-black shadow-[2px_2px_0px_#0f172a] hover:bg-[#C8E6C9] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer group"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#2E7D32] dark:text-emerald-400" />
                  <span>รหัสห้อง:</span>
                  <span className="font-mono tracking-wider text-xs bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-400 dark:border-emerald-400 text-[#2E7D32] dark:text-emerald-300 font-black">
                    {displayRoomCode}
                  </span>
                  {copiedRoomCode ? (
                    <span className="text-[10px] text-[#2E7D32] dark:text-emerald-300 font-black flex items-center gap-0.5">
                      <Check className="w-3 h-3" />
                      คัดลอกแล้ว!
                    </span>
                  ) : (
                    <Copy className="w-3 h-3 text-slate-500 group-hover:text-black dark:group-hover:text-white" />
                  )}
                </button>
                {targetPlayers > 0 && (
                  <span className="text-xs font-black text-white bg-[#E53935] border-2 border-slate-900 px-3 py-1 rounded-full shadow-[2px_2px_0px_#0f172a] dark:shadow-none">
                    เป้าหมาย {targetPlayers} คน
                  </span>
                )}
                {isHost && (
                  <span className="text-xs font-black text-slate-950 bg-[#FDD835] border-2 border-slate-900 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Crown className="w-3 h-3 text-[#E53935]" />
                    <span>คุณคือหัวห้อง</span>
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                {cleanTitle}
              </h1>
              {room.created_at && (
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-xs mt-1.5">
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
          <div className="grid grid-cols-3 gap-2.5 mt-5 pt-4 border-t-2 border-dashed border-slate-200 dark:border-slate-700 text-center">
            <div className="bg-[#FFFDF0] dark:bg-[#0f172a] rounded-2xl p-2.5 border-2 border-slate-900 dark:border-slate-700 shadow-[2px_2px_0px_#0f172a] dark:shadow-none">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">ยอดรวมห้อง</span>
              <span className="text-base sm:text-lg font-black text-slate-950 dark:text-white mt-0.5 block">
                ฿{Number(room.total_fee).toLocaleString()}
              </span>
            </div>
            <div className="bg-[#FFFDF0] dark:bg-[#0f172a] rounded-2xl p-2.5 border-2 border-slate-900 dark:border-slate-700 shadow-[2px_2px_0px_#0f172a] dark:shadow-none">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">ค่าคอร์ท</span>
              <span className="text-base sm:text-lg font-black text-[#2E7D32] dark:text-emerald-400 mt-0.5 block">
                ฿{Number(room.court_fee).toLocaleString()}
              </span>
            </div>
            <div className="bg-[#FFFDF0] dark:bg-[#0f172a] rounded-2xl p-2.5 border-2 border-slate-900 dark:border-slate-700 shadow-[2px_2px_0px_#0f172a] dark:shadow-none">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">ค่าลูกแบด</span>
              <span className="text-base sm:text-lg font-black text-[#E53935] dark:text-red-400 mt-0.5 block">
                ฿{Number(room.shuttle_fee).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* Host Note & Announcements Card (Shin-chan Memo Pad) */}
        {/* ======================================================== */}
        <div className="bg-[#FFF9C4] dark:bg-[#1a2538] rounded-3xl p-5 border-3 border-slate-900 dark:border-yellow-400/80 shadow-[5px_5px_0px_0px_#0f172a] dark:shadow-[5px_5px_0px_0px_#000] relative space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pin className="w-4 h-4 text-[#E53935] fill-current transform -rotate-12" />
              <h2 className="text-sm font-black text-slate-950 dark:text-white">
                โน้ตจากหัวห้อง / สรุปก๊วน 📢
              </h2>
            </div>
            {isHost && (
              <span className="text-[10px] font-black bg-[#E53935] text-white px-2 py-0.5 rounded-full">
                โหมดแก้ไข
              </span>
            )}
          </div>

          {isHost ? (
            <div className="space-y-2.5">
              <textarea
                rows={3}
                value={hostNotes}
                onChange={(e) => setHostNotes(e.target.value)}
                placeholder="พิมพ์โน้ตก๊วน เช่น 'ขาดเงิน: สมชาย, แนน' หรือ 'ตารางตี: คอร์ท 3 ทีม A ปะทะ ทีม B'"
                className="w-full p-3 bg-white dark:bg-[#0f172a] border-2 border-slate-900 dark:border-slate-600 rounded-2xl text-slate-950 dark:text-white font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#E53935]"
              />

              {/* Quick Snippet Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">แทรกด่วน:</span>
                {[
                  "+ ขาดเงิน: ",
                  "+ คอร์ท 3-4 ",
                  "+ ตารางตี: ",
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setHostNotes((prev) => (prev ? `${prev}\n${tag}` : tag))}
                    className="text-[11px] font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-lg border border-slate-400 dark:border-slate-600 hover:bg-slate-100"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1">
                {notesSavedSuccess ? (
                  <span className="text-xs font-black text-[#2E7D32] dark:text-emerald-300 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    บันทึกโน้ตสำเร็จแล้วฮะ! 📝
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">
                    ทุกคนในก๊วนจะเห็นโน้ตนี้
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#E53935] hover:bg-[#D32F2F] text-[#FDD835] font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingNotes ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FDD835]" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>บันทึกโน้ต</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              {room.host_notes ? (
                <div className="whitespace-pre-wrap text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-2xl border-2 border-slate-900 dark:border-slate-700">
                  {room.host_notes}
                </div>
              ) : (
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 italic">
                  ยังไม่มีประกาศจากหัวห้องฮะ
                </p>
              )}
            </div>
          )}
        </div>

        {/* Comic 2-Tab Switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-white dark:bg-[#1a2234] rounded-2xl border-3 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0px_0px_#0f172a] dark:shadow-[4px_4px_0px_0px_#000]">
          <button
            type="button"
            onClick={() => setActiveTab("pay")}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === "pay"
                ? "bg-[#E53935] text-[#FDD835] shadow-[2px_2px_0px_#0f172a] dark:shadow-none border-2 border-slate-900 dark:border-white/20"
                : "text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white"
            }`}
          >
            <CreditCard className="w-4 h-4 stroke-[2.5]" />
            <span>สแกนจ่ายเงิน</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === "list"
                ? "bg-[#43A047] text-white shadow-[2px_2px_0px_#0f172a] dark:shadow-none border-2 border-slate-900 dark:border-white/20"
                : "text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>รายชื่อคนจ่ายแล้ว</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-black border border-slate-900 ${
                activeTab === "list"
                  ? "bg-[#FDD835] text-slate-950"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
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
            <div className="bg-gradient-to-br from-[#E8F5E9] via-white to-[#C8E6C9] dark:from-[#0f2818] dark:via-[#163a23] dark:to-[#0a1e12] rounded-3xl p-5 border-4 border-[#43A047] dark:border-emerald-400 shadow-[6px_6px_0px_0px_#0f172a] dark:shadow-[6px_6px_0px_0px_#34d399]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-slate-950 dark:text-white font-black text-base">
                  <ActionKamenAvatar className="w-6 h-6" />
                  <span>PromptPay QR Code หัวห้อง</span>
                </div>
                <span className="text-xs font-black text-white bg-[#43A047] border-2 border-slate-900 dark:border-white/30 px-3 py-0.5 rounded-full shadow-[2px_2px_0px_#0f172a] dark:shadow-none">
                  สแกนจ่ายได้เลย!
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5">
                {/* QR Image Box */}
                <div className="shrink-0">
                  {room.qr_url ? (
                    <div className="relative group p-3 bg-white dark:bg-white rounded-2xl shadow-[4px_4px_0px_#0f172a] border-3 border-slate-900 max-w-[200px]">
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
                    <div className="w-44 h-44 rounded-2xl bg-[#FFFDF0] dark:bg-[#0f172a] border-3 border-dashed border-slate-400 dark:border-slate-600 flex flex-col items-center justify-center p-4 text-center shadow-[3px_3px_0px_#0f172a] dark:shadow-none">
                      <QrCode className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-xs font-black text-slate-700 dark:text-slate-300">
                        ไม่มีรูป QR Code
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                        โอนผ่านพร้อมเพย์หรือเลขบัญชีผู้จัดนะฮะ
                      </p>
                    </div>
                  )}
                </div>

                {/* Amount to Pay & Comic Copy Button */}
                <div className="flex-1 w-full flex flex-col items-center sm:items-start text-center sm:text-left">
                  <span className="text-xs uppercase tracking-wider font-black text-slate-700 dark:text-yellow-300 bg-[#FFF9C4] dark:bg-yellow-950/70 px-2.5 py-0.5 rounded-md border border-slate-300 dark:border-yellow-400/40">
                    ยอดโอนต่อคน
                  </span>
                  <div className="text-4xl sm:text-5xl font-black text-[#E53935] dark:text-yellow-300 drop-shadow-[2px_2px_0px_#FDD835] dark:drop-shadow-[2px_2px_0px_#000] mt-1 mb-1">
                    ฿{perPersonAmount.toLocaleString()}
                  </div>
                  <p className="text-xs font-bold text-slate-600 dark:text-emerald-100 mb-4">
                    {targetPlayers > 0
                      ? `คำนวณจากยอดรวม ฿${totalRoomFee.toLocaleString()} (หาร ${targetPlayers} คน)`
                      : `ยอดรวมทั้งห้อง ฿${totalRoomFee.toLocaleString()}`}
                  </p>

                  {/* Copy Amount Button with Comic Sound */}
                  <button
                    type="button"
                    onClick={handleCopyAmount}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#FDD835] hover:bg-[#FBC02D] text-slate-950 font-black text-xs sm:text-sm border-3 border-slate-900 shadow-[3px_3px_0px_#0f172a] dark:shadow-[3px_3px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer"
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
            <div className="bg-white dark:bg-[#1a2234] rounded-3xl p-5 border-3 border-slate-900 dark:border-slate-700 shadow-[5px_5px_0px_0px_#0f172a] dark:shadow-[5px_5px_0px_0px_#000] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-950 dark:text-white font-black text-base">
                  <Receipt className="w-5 h-5 text-[#E53935]" />
                  <span>แจ้งโอนเงินเข้าก๊วน</span>
                </div>
                <span className="text-xs font-bold text-[#43A047] dark:text-emerald-300 bg-[#E8F5E9] dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-[#43A047]">
                  แนบสลิปเพื่อยืนยัน
                </span>
              </div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                โอนเงินเสร็จแล้ว กรอกชื่อและแนบสลิปโอนเงินด้านล่างเพื่อให้ระบบบันทึกสถานะ
              </p>

              {/* Feedback messages */}
              {submissionError && (
                <div className="p-3.5 rounded-2xl bg-[#FFEBEE] dark:bg-[#3b1219] border-2 border-[#E53935] text-[#C62828] dark:text-[#ff8a80] text-xs font-bold flex items-center gap-2 shadow-[2px_2px_0px_#0f172a] dark:shadow-none">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#E53935]" />
                  <span>{submissionError}</span>
                </div>
              )}

              {submissionSuccess && (
                <div className="p-3.5 rounded-2xl bg-[#E8F5E9] dark:bg-emerald-950/80 border-2 border-[#43A047] text-[#2E7D32] dark:text-emerald-300 text-xs font-black flex items-center gap-2 shadow-[2px_2px_0px_#0f172a] dark:shadow-none">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#43A047]" />
                  <span>{submissionSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSubmitSlip} className="space-y-4">
                {/* Member Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ชื่อของคุณ / ฉายา <span className="text-[#E53935]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="เช่น ชินจัง, คาซาม่า, มาซาโอะ"
                    className="w-full px-4 py-3 bg-[#FFFDF0] dark:bg-[#0f172a] border-3 border-slate-900 dark:border-slate-600 rounded-2xl text-slate-950 dark:text-white font-bold placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#E53935] transition-all text-sm"
                  />
                </div>

                {/* Amount Paid */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
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
                      className="w-full pl-4 pr-12 py-3 bg-[#FFFDF0] dark:bg-[#0f172a] border-3 border-slate-900 dark:border-slate-600 rounded-2xl text-slate-950 dark:text-white font-black placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#E53935] transition-all text-base"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-500 dark:text-slate-400 text-sm">
                      ฿
                    </span>
                  </div>
                </div>

                {/* Slip File Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    แนบสลิปโอนเงิน / ภาพหลักฐาน
                  </label>

                  {!slipPreview ? (
                    <label
                      htmlFor={slipInputId}
                      className="flex flex-col items-center justify-center border-3 border-dashed border-slate-300 dark:border-slate-600 hover:border-slate-900 dark:hover:border-[#FDD835] rounded-2xl p-4 cursor-pointer bg-[#FFFDF0] dark:bg-[#0f172a] hover:bg-[#FFF9C4] dark:hover:bg-[#1e293b] transition-all group shadow-[2px_2px_0px_#0f172a] dark:shadow-none"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 group-hover:bg-[#FDD835] border-2 border-slate-900 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-300 transition-all mb-1.5 shadow-[2px_2px_0px_#0f172a] dark:shadow-none">
                        <Upload className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <p className="text-xs font-black text-slate-900 dark:text-white">
                        แตะเพื่อเลือกรูปสลิปโอนเงิน
                      </p>
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
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
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FFFDF0] dark:bg-[#0f172a] border-3 border-slate-900 dark:border-slate-700 shadow-[2px_2px_0px_#0f172a] dark:shadow-none">
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white shrink-0 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                        <img
                          src={slipPreview}
                          alt="Slip Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {slipFile?.name || "Payment Slip"}
                        </p>
                        <p className="text-[11px] font-bold text-[#2E7D32] dark:text-emerald-300 flex items-center gap-1 mt-0.5">
                          <FileCheck className="w-3.5 h-3.5" />
                          แนบสลิปเรียบร้อยแล้วฮะ!
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveSlip}
                        aria-label="ลบรูปสลิป"
                        className="p-2 text-slate-500 hover:text-[#E53935] hover:bg-[#FFEBEE] dark:hover:bg-slate-800 rounded-xl border border-transparent hover:border-slate-900 transition-all cursor-pointer"
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
                  className="w-full py-4 px-4 rounded-2xl bg-[#E53935] hover:bg-[#D32F2F] text-[#FDD835] font-black text-base border-3 border-slate-900 dark:border-yellow-300 shadow-[4px_4px_0px_#0f172a] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
            <div className="bg-[#43A047] dark:bg-[#1a3d28] rounded-3xl p-5 border-4 border-slate-900 dark:border-[#FDD835] shadow-[6px_6px_0px_0px_#0f172a] dark:shadow-[6px_6px_0px_0px_#FDD835] text-white space-y-3 relative overflow-hidden">
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
                <div className="p-3.5 bg-[#FFF9C4] dark:bg-[#2c2207] border-3 border-slate-900 dark:border-yellow-400 rounded-2xl flex items-center gap-2.5 text-slate-950 dark:text-yellow-200 text-xs sm:text-sm font-black shadow-[3px_3px_0px_#0f172a] dark:shadow-none animate-in fade-in">
                  <PartyPopper className="w-5 h-5 text-[#E53935] shrink-0" />
                  <span>🎉 วู้ววว! สมาชิกจ่ายเงินครบก๊วนแล้ว รอดพ้นมือแม่มิซาเอะ!</span>
                </div>
              )}
            </div>

            {/* Paid Members List */}
            <div className="bg-white dark:bg-[#1a2234] rounded-3xl p-5 border-3 border-slate-900 dark:border-slate-700 shadow-[5px_5px_0px_0px_#0f172a] dark:shadow-[5px_5px_0px_0px_#000] space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-950 dark:text-white font-black text-base">
                  <Users className="w-5 h-5 text-[#43A047]" />
                  <span>รายชื่อคนที่โอนแล้ว ({paidMembersCount} คน)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("pay")}
                  className="text-xs font-black text-[#E53935] hover:underline cursor-pointer"
                >
                  + แจ้งโอนเพิ่ม
                </button>
              </div>

              {paidMembersList.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#FFFDF0] dark:bg-[#0f172a] border-2 border-slate-900 dark:border-slate-700 flex items-center justify-center mx-auto shadow-[3px_3px_0px_#0f172a] dark:shadow-none">
                    <ShiroAvatar className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                      ยังไม่มีใครแจ้งโอนเลยฮะ!
                    </p>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                      เป็นคนแรกที่สแกนจ่ายและส่งสลิปให้ก๊วนกันเถอะ!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("pay")}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#FDD835] text-slate-950 text-xs font-black border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] hover:bg-[#FBC02D] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
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
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FFFDF0] dark:bg-[#0f172a] border-2 border-slate-900 dark:border-slate-700 shadow-[3px_3px_0px_#0f172a] dark:shadow-none hover:bg-white dark:hover:bg-[#162033] transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Character Avatar */}
                          {getMemberAvatar(index)}

                          {/* Member info */}
                          <div className="min-w-0">
                            <div className="text-sm font-black text-slate-950 dark:text-white truncate">
                              {member.name}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                              <span className="text-[#2E7D32] dark:text-emerald-400 font-black">
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

                        {/* Slip preview, status & Host controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          {member.slip_url ? (
                            <button
                              type="button"
                              onClick={() => {
                                setViewSlipUrl(member.slip_url || null);
                                setViewSlipMember(member.name);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1e293b] hover:bg-[#FFF9C4] dark:hover:bg-slate-700 text-slate-950 dark:text-white text-xs font-black border-2 border-slate-900 dark:border-slate-600 shadow-[2px_2px_0px_#0f172a] dark:shadow-none active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                            >
                              <ImageIcon className="w-3.5 h-3.5 text-[#E53935]" />
                              <span>ดูสลิป</span>
                            </button>
                          ) : null}

                          {/* Payment status badge (clickable toggle for Host) */}
                          <button
                            type="button"
                            onClick={() => handleToggleMemberPaid(member)}
                            className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl border-2 transition-all select-none ${
                              member.is_paid
                                ? "bg-[#E8F5E9] dark:bg-emerald-950/80 text-[#2E7D32] dark:text-emerald-300 border-[#43A047]"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-400"
                            } ${isHost ? "cursor-pointer hover:scale-105 active:scale-95" : "cursor-default"}`}
                            title={isHost ? "แตะเพื่อสลับสถานะ" : undefined}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>{member.is_paid ? "จ่ายแล้วจ้า! ✨" : "ยังไม่จ่าย"}</span>
                          </button>

                          {/* Host Delete Button */}
                          {isHost && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMember(member)}
                              title="ลบรายชื่อนี้ (เฉพาะหัวห้อง)"
                              className="p-1.5 text-slate-400 hover:text-[#E53935] hover:bg-[#FFEBEE] dark:hover:bg-red-950/40 rounded-lg border border-transparent hover:border-[#E53935] transition-all cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
        <div className="bg-white dark:bg-[#1a2234] rounded-3xl p-5 border-3 border-slate-900 dark:border-slate-700 shadow-[5px_5px_0px_0px_#0f172a] dark:shadow-[5px_5px_0px_0px_#000] space-y-3">
          <div className="flex items-center gap-2 text-slate-950 dark:text-white font-black text-base">
            <Share2 className="w-5 h-5 text-[#E53935]" />
            <span>แชร์ให้เพื่อนในก๊วน</span>
          </div>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
            ส่งลิงก์เข้ากลุ่ม LINE ให้เพื่อนกดเข้ามาสแกนจ่ายและแนบสลิปได้เลย
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Copy URL Button */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-[#FFFDF0] dark:bg-[#0f172a] hover:bg-white dark:hover:bg-[#1e293b] border-3 border-slate-900 dark:border-slate-600 text-slate-950 dark:text-white text-xs font-black shadow-[3px_3px_0px_#0f172a] dark:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-[#2E7D32] dark:text-emerald-400 stroke-[3]" />
                  <span className="text-[#2E7D32] dark:text-emerald-400">คัดลอกลิงก์แล้ว!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-700 dark:text-slate-300 stroke-[2.5]" />
                  <span>คัดลอกลิงก์ก๊วน</span>
                </>
              )}
            </button>

            {/* Copy LINE Summary Text */}
            <button
              type="button"
              onClick={handleCopyLineSummary}
              className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-black border-3 border-slate-900 dark:border-slate-600 shadow-[3px_3px_0px_#0f172a] dark:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer"
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
            <div className="bg-white dark:bg-[#1a2234] border-4 border-slate-900 dark:border-[#FDD835] rounded-3xl max-w-sm w-full p-4 shadow-[8px_8px_0px_0px_#0f172a] dark:shadow-[8px_8px_0px_0px_#FDD835] space-y-3 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#E53935]" />
                  <h3 className="text-sm font-black text-slate-950 dark:text-white truncate">
                    สลิปของ {viewSlipMember || "สมาชิก"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setViewSlipUrl(null)}
                  className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-900 dark:border-slate-600 hover:bg-slate-200 text-slate-900 dark:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border-3 border-slate-900 dark:border-slate-700 max-h-[65vh] flex items-center justify-center">
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
                  className="text-xs font-black text-[#E53935] dark:text-yellow-300 hover:underline flex items-center gap-1"
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

        {/* Host Login Modal */}
        {showHostLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-[#1a2234] border-4 border-slate-900 dark:border-[#FDD835] rounded-3xl max-w-sm w-full p-5 shadow-[8px_8px_0px_0px_#0f172a] dark:shadow-[8px_8px_0px_0px_#FDD835] space-y-4 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#FDD835] flex items-center justify-center border-2 border-slate-900">
                    <KeyRound className="w-4 h-4 text-slate-900" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-950 dark:text-white">
                      เข้าสู่ระบบหัวห้อง 👑
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      Host Authentication
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowHostLoginModal(false);
                    setHostLoginError(null);
                  }}
                  className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-900 dark:border-slate-600 hover:bg-slate-200 text-slate-900 dark:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                กรอกรหัสผ่าน PIN ที่ตั้งไว้ตอนสร้างห้อง เพื่อแก้ไขประกาศโน้ต และจัดการรายชื่อ
              </p>

              {hostLoginError && (
                <div className="p-3 rounded-xl bg-[#FFEBEE] dark:bg-[#3b1219] border-2 border-[#E53935] text-[#C62828] dark:text-[#ff8a80] text-xs font-bold flex items-center gap-2 shadow-[2px_2px_0px_#0f172a] dark:shadow-none">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#E53935]" />
                  <span>{hostLoginError}</span>
                </div>
              )}

              <form onSubmit={handleHostLogin} className="space-y-3.5">
                <div>
                  <input
                    type="password"
                    autoFocus
                    value={hostPinInput}
                    onChange={(e) => setHostPinInput(e.target.value)}
                    placeholder="ใส่รหัสผ่านหัวห้อง"
                    className="w-full px-4 py-3 bg-[#FFFDF0] dark:bg-[#0f172a] border-3 border-slate-900 dark:border-slate-600 rounded-2xl text-slate-950 dark:text-white font-black placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#E53935] text-center text-lg tracking-widest"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowHostLoginModal(false);
                      setHostLoginError(null);
                    }}
                    className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs border-2 border-slate-900 dark:border-slate-700 hover:bg-slate-200 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-[#E53935] hover:bg-[#D32F2F] text-[#FDD835] font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  >
                    เข้าสู่ระบบ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bottom Comic Footer */}
        <footer className="text-center text-xs font-bold text-slate-500 dark:text-slate-400 py-4 flex items-center justify-center gap-1.5">
          <ShinchanAvatar className="w-4 h-4" />
          <span>Bad-Split x Crayon Shin-chan • หารค่าแบดมินตันสุดน่ารัก</span>
          <Sparkles className="w-3.5 h-3.5 text-[#FDD835]" />
        </footer>
      </div>
    </div>
  );
}
