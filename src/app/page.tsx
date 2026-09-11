/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  X,
  CreditCard,
  Calculator,
  Trash2,
  Zap,
  KeyRound,
  Search,
  History,
  QrCode,
  Users,
  CheckCircle2,
  ChevronRight,
  Crown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Room } from "@/types/database";
import { ShuttleIcon } from "@/components/ShuttleIcon";
import {
  ShinchanAvatar,
  ChocobiStar,
  ActionKamenAvatar,
} from "@/components/NoharaAvatars";
import { ShinchanFloatingBackground } from "@/components/ShinchanFloatingBackground";
import { ThemeToggle } from "@/components/ThemeToggle";

type PageMode = "select" | "create" | "join";

interface RecentRoomItem {
  id: string;
  title: string;
  per_person_fee?: number | null;
  total_fee?: number;
  visited_at?: string;
}

export default function HomePage() {
  const router = useRouter();
  const fileInputId = useId();

  // Page mode: "select" (Landing choice), "create" (Host create room), "join" (Member join to pay)
  const [pageMode, setPageMode] = useState<PageMode>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get("mode");
      if (modeParam === "create" || modeParam === "join") {
        return modeParam;
      }
    }
    return "select";
  });

  // Recent rooms stored in localStorage
  const [recentRooms, setRecentRooms] = useState<RecentRoomItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("badsplit_recent_rooms");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {
        console.warn("Failed to load recent rooms:", e);
      }
    }
    return [];
  });

  // Join Room State
  const [joinInput, setJoinInput] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingPublicRooms, setIsLoadingPublicRooms] = useState(
    pageMode === "join"
  );

  // Form states (Create Room)
  const [title, setTitle] = useState("");
  const [courtFee, setCourtFee] = useState<number | "">("");
  const [passkey, setPasskey] = useState("");

  // Shuttle fee state & calculation mode
  const [shuttleMode, setShuttleMode] = useState<"total" | "units">("total");
  const [shuttleTotal, setShuttleTotal] = useState<number | "">("");
  const [pricePerShuttle, setPricePerShuttle] = useState<number | "">("");
  const [shuttleCount, setShuttleCount] = useState<number | "">("");

  // Split calculation mode: by player count or direct per-person fee
  const [splitMode, setSplitMode] = useState<"players" | "direct">("players");
  const [estimatedPlayers, setEstimatedPlayers] = useState<number | "">(6);
  const [directPerPersonFee, setDirectPerPersonFee] = useState<number | "">("");

  // Host PromptPay QR Code upload
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch recent public rooms when entering join mode
  useEffect(() => {
    let isMounted = true;
    if (pageMode === "join") {
      Promise.resolve(
        supabase
          .from("rooms")
          .select(
            "id, title, court_fee, shuttle_fee, total_fee, per_person_fee, target_players, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(8)
      )
        .then(({ data, error }) => {
          if (!isMounted) return;
          if (!error && data) {
            setPublicRooms(data as Room[]);
          }
          setIsLoadingPublicRooms(false);
        })
        .catch((err: unknown) => {
          console.warn("Failed to fetch public rooms:", err);
          if (isMounted) setIsLoadingPublicRooms(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [pageMode]);

  // Change page mode and synchronize URL
  const changeMode = (newMode: PageMode) => {
    setPageMode(newMode);
    setErrorMessage(null);
    setJoinError(null);
    if (newMode === "join") {
      setIsLoadingPublicRooms(true);
    }
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (newMode === "select") {
        url.searchParams.delete("mode");
      } else {
        url.searchParams.set("mode", newMode);
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Helper to extract room ID from URL or input string
  const extractRoomId = (input: string): string => {
    const trimmed = input.trim();
    const match = trimmed.match(/\/room\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return trimmed;
  };

  // Handle Joining Room by code or link
  const handleJoinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setJoinError(null);

    const cleanId = extractRoomId(joinInput);
    if (!cleanId) {
      setJoinError("กรุณากรอกรหัสห้องหรือวางลิงก์นะฮะ!");
      return;
    }

    setIsJoining(true);
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, title")
        .eq("id", cleanId)
        .single();

      if (error || !data) {
        setJoinError("ไม่พบห้องนี้ฮะ! กรุณาตรวจสอบรหัสห้องหรือลิงก์อีกครั้ง");
        setIsJoining(false);
        return;
      }

      router.push(`/room/${data.id}`);
    } catch {
      setJoinError("เกิดข้อผิดพลาดในการตรวจสอบห้อง กรุณาลองใหม่อีกครั้ง");
      setIsJoining(false);
    }
  };

  // Clear recent rooms
  const handleClearRecentRooms = () => {
    try {
      localStorage.removeItem("badsplit_recent_rooms");
      setRecentRooms([]);
    } catch (e) {
      console.warn("Failed to clear recent rooms:", e);
    }
  };

  // Calculated values for Create Room
  const parsedCourtFee = typeof courtFee === "number" ? courtFee : 0;

  const parsedShuttleFee =
    shuttleMode === "total"
      ? typeof shuttleTotal === "number"
        ? shuttleTotal
        : 0
      : (typeof pricePerShuttle === "number" ? pricePerShuttle : 0) *
        (typeof shuttleCount === "number" ? shuttleCount : 0);

  const totalFee = parsedCourtFee + parsedShuttleFee;

  let calculatedPerPerson = 0;
  let targetPlayersCount = 0;

  if (splitMode === "players") {
    targetPlayersCount =
      typeof estimatedPlayers === "number" && estimatedPlayers > 0
        ? estimatedPlayers
        : 0;
    calculatedPerPerson =
      targetPlayersCount > 0
        ? Math.round((totalFee / targetPlayersCount) * 100) / 100
        : 0;
  } else {
    calculatedPerPerson =
      typeof directPerPersonFee === "number" && directPerPersonFee > 0
        ? directPerPersonFee
        : 0;
    targetPlayersCount =
      calculatedPerPerson > 0 ? Math.ceil(totalFee / calculatedPerPerson) : 0;
  }

  const formattedPerPerson =
    calculatedPerPerson % 1 === 0
      ? calculatedPerPerson.toFixed(0)
      : calculatedPerPerson.toFixed(2);

  // QR file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setQrFile(file);
    const objectUrl = URL.createObjectURL(file);
    setQrPreview(objectUrl);
  };

  const handleRemoveQr = () => {
    setQrFile(null);
    if (qrPreview) {
      URL.revokeObjectURL(qrPreview);
      setQrPreview(null);
    }
  };

  // Upload QR code to Supabase storage bucket 'qr-codes'
  const uploadQrCode = async (): Promise<string | null> => {
    if (!qrFile) return null;

    try {
      const fileExt = qrFile.name.split(".").pop() || "png";
      const cleanFileName = `host_qr_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 8)}.${fileExt}`;
      const filePath = `uploads/${cleanFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("qr-codes")
        .upload(filePath, qrFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.warn("QR upload warning:", uploadError.message);
        return null;
      }

      const { data } = supabase.storage
        .from("qr-codes")
        .getPublicUrl(filePath);

      return data?.publicUrl || null;
    } catch (err) {
      console.error("Failed to upload QR code:", err);
      return null;
    }
  };

  // Submit form to create room
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("กรุณากรอกชื่อห้องหรือชื่อก๊วนด้วยนะฮะ!");
      return;
    }

    if (calculatedPerPerson <= 0 && totalFee <= 0) {
      setErrorMessage("กรุณาระบุค่าคอร์ท ค่าลูกแบด หรือยอดเงินต่อคนก่อนนะฮะ");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload QR Code if attached
      let qrUrl: string | null = null;
      if (qrFile) {
        qrUrl = await uploadQrCode();
      }

      // Title encoding helper so room page always knows target players count
      const formattedTitle =
        targetPlayersCount > 0 && !title.includes("คน")
          ? `${title.trim()} [เป้าหมาย ${targetPlayersCount} คน]`
          : title.trim();

      // Attempt insert with target_players, per_person_fee & passkey if supported by table
      const trimmedPasskey = passkey.trim();
      const fullPayload: Record<string, unknown> = {
        title: formattedTitle,
        court_fee: parsedCourtFee,
        shuttle_fee: parsedShuttleFee,
        total_fee: totalFee,
        qr_url: qrUrl,
        target_players: targetPlayersCount > 0 ? targetPlayersCount : null,
        per_person_fee: calculatedPerPerson > 0 ? calculatedPerPerson : null,
        passkey: trimmedPasskey || null,
      };

      let { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .insert([fullPayload])
        .select()
        .single();

      // Fallback if schema doesn't have newer columns yet
      if (
        roomError &&
        (roomError.message?.includes("target_players") ||
          roomError.message?.includes("per_person_fee") ||
          roomError.message?.includes("passkey") ||
          roomError.code === "PGRST204")
      ) {
        console.warn("Retrying with base room columns:", roomError.message);
        const basePayload: Record<string, unknown> = {
          title: formattedTitle,
          court_fee: parsedCourtFee,
          shuttle_fee: parsedShuttleFee,
          total_fee: totalFee,
          qr_url: qrUrl,
        };
        if (!roomError.message?.includes("passkey") && trimmedPasskey) {
          basePayload.passkey = trimmedPasskey;
        }

        const retry = await supabase
          .from("rooms")
          .insert([basePayload])
          .select()
          .single();

        roomData = retry.data;
        roomError = retry.error;
      }

      if (roomError || !roomData) {
        throw new Error(
          roomError?.message || "ไม่สามารถสร้างห้องได้ กรุณาลองใหม่อีกครั้ง"
        );
      }

      // Automatically store creator host status in localStorage
      try {
        localStorage.setItem(
          `badsplit_host_${roomData.id}`,
          trimmedPasskey || "creator"
        );

        // Store to recent rooms
        const recentStr = localStorage.getItem("badsplit_recent_rooms");
        const recents = recentStr ? JSON.parse(recentStr) : [];
        const currentItem = {
          id: roomData.id,
          title: roomData.title,
          per_person_fee: calculatedPerPerson,
          total_fee: totalFee,
          visited_at: new Date().toISOString(),
        };
        const filtered = Array.isArray(recents)
          ? recents.filter((r: { id?: string }) => r && r.id !== roomData.id)
          : [];
        localStorage.setItem(
          "badsplit_recent_rooms",
          JSON.stringify([currentItem, ...filtered].slice(0, 8))
        );
      } catch (e) {
        console.warn("Failed to set localStorage host state:", e);
      }

      // Redirect to Room Details Page
      router.push(`/room/${roomData.id}`);
    } catch (err) {
      console.error("Error creating room:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง"
      );
      setIsSubmitting(false);
    }
  };

  // Filter public rooms by search query
  const filteredPublicRooms = publicRooms.filter((r) =>
    r.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen relative flex flex-col items-center py-6 px-4 sm:px-6">
      {/* Floating Nohara Family Ambient Background */}
      <ShinchanFloatingBackground />

      <div className="w-full max-w-xl relative z-10">
        {/* Top Bar with Badge and Theme Toggle */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FDD835] dark:bg-[#1e293b] border-2 border-slate-900 dark:border-[#FDD835] text-slate-950 dark:text-[#FDD835] text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0px_#0f172a] dark:shadow-[2px_2px_0px_#000]">
            <ShinchanAvatar className="w-4 h-4 -ml-1" />
            <span>Bad-Split x Shin-chan</span>
            <ChocobiStar className="w-3.5 h-3.5 text-slate-900 dark:text-[#FDD835]" />
          </div>

          <ThemeToggle />
        </div>

        {/* ========================================================================= */}
        {/* MODE 1: SELECT (Choice Screen - สร้างห้อง หรือ เข้าไปจ่าย) */}
        {/* ========================================================================= */}
        {pageMode === "select" && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Comic Header */}
            <header className="text-center">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight flex items-center justify-center gap-2">
                <span>ก๊วนนี้ใครจ่าย!</span>
                <span className="text-[#E53935] drop-shadow-[2px_2px_0px_#FDD835]">
                  🏸
                </span>
              </h1>

              {/* Comic Speech Bubble */}
              <div className="mt-3 relative inline-block max-w-md bg-white dark:bg-[#1a2234] border-3 border-slate-900 dark:border-[#FDD835] rounded-2xl px-4 py-3 shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#FDD835]">
                <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-1.5">
                  <span>
                    ยินดีต้อนรับสู่ก๊วนแบดมินตันฮะ! วันนี้จะมาเปิดห้องใหม่ หรือจะมาจ่ายตังค์ดีนะ?
                  </span>
                </p>
                {/* Bubble arrow pointing up */}
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-[#1a2234] border-t-3 border-l-3 border-slate-900 dark:border-[#FDD835] transform rotate-45" />
              </div>
            </header>

            {/* Two Primary Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Create Room (สำหรับหัวห้อง) */}
              <div
                onClick={() => changeMode("create")}
                className="bg-white dark:bg-[#1a2234] rounded-3xl p-5 border-4 border-slate-900 dark:border-slate-700 shadow-[6px_6px_0px_0px_#0f172a] dark:shadow-[6px_6px_0px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#0f172a] dark:hover:shadow-[8px_8px_0px_0px_#FDD835] transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Comic Corner Flash */}
                <div className="absolute -top-6 -right-6 w-16 h-16 bg-[#FDD835] rotate-45 border-b-2 border-slate-900 flex items-end justify-center pb-1">
                  <Sparkles className="w-3.5 h-3.5 text-slate-900" />
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-[#E53935] text-[#FDD835] px-2.5 py-0.5 rounded-full border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] mb-3">
                    <Crown className="w-3.5 h-3.5" />
                    <span>สำหรับหัวห้อง</span>
                  </div>

                  <div className="flex items-center gap-3 my-2">
                    <div className="w-12 h-12 rounded-2xl bg-[#E53935] border-3 border-slate-900 flex items-center justify-center text-white shadow-[3px_3px_0px_#0f172a] group-hover:scale-105 transition-transform">
                      <ShuttleIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-950 dark:text-white leading-tight">
                        สร้างห้องก๊วนใหม่
                      </h2>
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        เปิดก๊วน & คิดตังค์เพื่อน
                      </p>
                    </div>
                  </div>

                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                    คำนวณค่าคอร์ท ค่าลูกแบด ใส่ PromptPay QR และตั้งรหัส PIN หัวห้องเพื่อจัดการห้อง
                  </p>

                  <div className="space-y-1.5 my-3 pt-2 border-t-2 border-dashed border-slate-200 dark:border-slate-700">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#43A047]" />
                      <span>คิดยอดหารต่อคนให้อัตโนมัติ</span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#43A047]" />
                      <span>แนบ QR รับเงินของหัวห้อง</span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#43A047]" />
                      <span>มีรหัส PIN ป้องกันคนอื่นแก้ไข</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full mt-3 py-3 px-4 rounded-2xl bg-[#E53935] text-[#FDD835] font-black text-sm border-3 border-slate-900 shadow-[3px_3px_0px_#0f172a] group-hover:shadow-[4px_4px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>เปิดห้องก๊วนเลยฮะ!</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </button>
              </div>

              {/* Option 2: Enter to Pay (สำหรับสมาชิก) */}
              <div
                onClick={() => changeMode("join")}
                className="bg-gradient-to-br from-[#E8F5E9] via-white to-[#C8E6C9] dark:from-[#0f2818] dark:via-[#163a23] dark:to-[#0a1e12] rounded-3xl p-5 border-4 border-[#43A047] dark:border-emerald-400 shadow-[6px_6px_0px_0px_#0f172a] dark:shadow-[6px_6px_0px_0px_#34d399] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#0f172a] dark:hover:shadow-[8px_8px_0px_0px_#34d399] transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Comic Corner Flash */}
                <div className="absolute -top-6 -right-6 w-16 h-16 bg-[#43A047] rotate-45 border-b-2 border-slate-900 flex items-end justify-center pb-1">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-[#43A047] text-white px-2.5 py-0.5 rounded-full border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] mb-3">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>สำหรับสมาชิก / คนเล่น</span>
                  </div>

                  <div className="flex items-center gap-3 my-2">
                    <div className="w-12 h-12 rounded-2xl bg-[#43A047] border-3 border-slate-900 flex items-center justify-center text-white shadow-[3px_3px_0px_#0f172a] group-hover:scale-105 transition-transform">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-950 dark:text-white leading-tight">
                        เข้าไปจ่ายเงิน / ดูก๊วน
                      </h2>
                      <p className="text-[11px] font-bold text-[#2E7D32] dark:text-emerald-300">
                        สแกน QR & แนบสลิป
                      </p>
                    </div>
                  </div>

                  <p className="text-xs font-bold text-slate-700 dark:text-emerald-100 mt-2 leading-relaxed">
                    มีลิงก์หรือรหัสห้องแล้วใช่ไหม? เข้าไปสแกนจ่ายเงิน แนบสลิป และเช็คชื่อได้ทันที!
                  </p>

                  <div className="space-y-1.5 my-3 pt-2 border-t-2 border-dashed border-[#A5D6A7] dark:border-emerald-700/60">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-emerald-100 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32] dark:text-emerald-400" />
                      <span>วางลิงก์ห้องเพื่อเข้าได้ทันที</span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-700 dark:text-emerald-100 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32] dark:text-emerald-400" />
                      <span>สแกน QR พร้อมเพย์หัวห้อง</span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-700 dark:text-emerald-100 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32] dark:text-emerald-400" />
                      <span>เช็ครายชื่อคนจ่ายแบบเรียลไทม์</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full mt-3 py-3 px-4 rounded-2xl bg-[#43A047] hover:bg-[#388E3C] text-white font-black text-sm border-3 border-slate-900 shadow-[3px_3px_0px_#0f172a] group-hover:shadow-[4px_4px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>เข้าห้องไปจ่ายเงิน</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            </div>

            {/* Recent Rooms Section (If any) */}
            {recentRooms.length > 0 && (
              <div className="bg-white dark:bg-[#1a2234] rounded-3xl p-5 border-3 border-slate-900 dark:border-slate-700 shadow-[5px_5px_0px_0px_#0f172a] dark:shadow-[5px_5px_0px_0px_#000] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-950 dark:text-white font-black text-sm">
                    <History className="w-4 h-4 text-[#E53935]" />
                    <span>ก๊วนแบดล่าสุดที่คุณเคยเข้า</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearRecentRooms}
                    className="text-[11px] font-bold text-slate-400 hover:text-[#E53935] transition-colors cursor-pointer"
                  >
                    ล้างประวัติ
                  </button>
                </div>

                <div className="space-y-2">
                  {recentRooms.slice(0, 4).map((r) => (
                    <div
                      key={r.id}
                      onClick={() => router.push(`/room/${r.id}`)}
                      className="p-3 rounded-2xl bg-[#FFFDF0] dark:bg-[#0f172a] border-2 border-slate-900 dark:border-slate-700 hover:border-[#E53935] dark:hover:border-[#FDD835] shadow-[2px_2px_0px_#0f172a] dark:shadow-none transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="text-xs font-black text-slate-950 dark:text-white truncate group-hover:text-[#E53935] dark:group-hover:text-[#FDD835] transition-colors">
                          {r.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {r.per_person_fee ? (
                            <span className="text-[#E53935] dark:text-[#FDD835]">
                              ฿{r.per_person_fee}/คน
                            </span>
                          ) : r.total_fee ? (
                            <span>ยอดรวม ฿{r.total_fee}</span>
                          ) : null}
                          {r.visited_at && (
                            <span>
                              • {new Date(r.visited_at).toLocaleDateString("th-TH", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#1a2234] border-2 border-slate-900 flex items-center justify-center text-slate-900 dark:text-white group-hover:bg-[#FDD835] group-hover:text-slate-900 transition-colors shrink-0 shadow-[1px_1px_0px_#0f172a]">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 2: JOIN (เข้าไปจ่ายเงิน - วางลิงก์ / ค้นหาห้อง) */}
        {/* ========================================================================= */}
        {pageMode === "join" && (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Navigation Header */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => changeMode("select")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-white dark:bg-[#1a2234] border-2 border-slate-900 dark:border-slate-700 text-slate-950 dark:text-white text-xs font-black shadow-[2px_2px_0px_#0f172a] hover:bg-slate-50 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>กลับหน้าหลัก</span>
              </button>

              <span className="text-[11px] font-black bg-[#43A047] text-white px-3 py-1 rounded-full border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                โหมดเข้าไปจ่ายเงิน 💸
              </span>
            </div>

            {/* Comic Banner */}
            <header className="text-center">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight flex items-center justify-center gap-2">
                <span>เข้าห้องเพื่อจ่ายเงิน</span>
                <span className="text-[#43A047]">📱</span>
              </h1>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">
                กรอกรหัสห้อง วางลิงก์ที่เพื่อนส่งมา หรือเลือกก๊วนแบดด้านล่างได้เลยฮะ!
              </p>
            </header>

            {/* Error Alert */}
            {joinError && (
              <div className="p-4 rounded-2xl bg-[#FFEBEE] dark:bg-[#3b1219] border-3 border-[#E53935] text-[#C62828] dark:text-[#ff8a80] text-xs sm:text-sm font-bold flex items-start gap-3 shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000]">
                <AlertCircle className="w-5 h-5 shrink-0 text-[#E53935] mt-0.5" />
                <div className="flex-1">
                  <span className="underline">ข้อผิดพลาด:</span> {joinError}
                </div>
                <button
                  type="button"
                  onClick={() => setJoinError(null)}
                  className="text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Card: Enter Room ID or Paste Link */}
            <div className="bg-white dark:bg-[#1a2234] rounded-3xl p-5 border-3 border-slate-900 dark:border-slate-700 shadow-[5px_5px_0px_0px_#0f172a] dark:shadow-[5px_5px_0px_0px_#000] space-y-4">
              <div className="flex items-center gap-2 text-slate-950 dark:text-white font-black text-base">
                <div className="w-7 h-7 rounded-xl bg-[#43A047] flex items-center justify-center text-white border-2 border-slate-900">
                  <QrCode className="w-4 h-4" />
                </div>
                <span>วางลิงก์ห้อง หรือกรอกรหัสห้อง (Room ID)</span>
              </div>

              <form onSubmit={handleJoinSubmit} className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={joinInput}
                    onChange={(e) => setJoinInput(e.target.value)}
                    placeholder="วางลิงก์ห้อง เช่น .../room/... หรือใส่รหัสห้อง"
                    className="w-full px-4 py-3.5 pr-10 bg-[#FFFDF0] dark:bg-[#0f172a] border-3 border-slate-900 dark:border-slate-600 rounded-2xl text-slate-950 dark:text-white font-bold placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#43A047] transition-all text-xs sm:text-sm"
                  />
                  {joinInput && (
                    <button
                      type="button"
                      onClick={() => setJoinInput("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isJoining || !joinInput.trim()}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#43A047] hover:bg-[#388E3C] text-white font-black text-sm sm:text-base border-3 border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:shadow-[5px_5px_0px_#0f172a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>กำลังตรวจสอบห้อง...</span>
                    </>
                  ) : (
                    <>
                      <span>เข้าห้องเพื่อสแกนจ่ายเงินเลยฮะ!</span>
                      <ArrowRight className="w-4 h-4 stroke-[3]" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Card: Recent Rooms from LocalStorage */}
            {recentRooms.length > 0 && (
              <div className="bg-white dark:bg-[#1a2234] rounded-3xl p-5 border-3 border-slate-900 dark:border-slate-700 shadow-[5px_5px_0px_0px_#0f172a] dark:shadow-[5px_5px_0px_0px_#000] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-950 dark:text-white font-black text-sm">
                    <History className="w-4 h-4 text-[#43A047]" />
                    <span>ก๊วนแบดล่าสุดที่คุณเคยเข้า</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearRecentRooms}
                    className="text-[11px] font-bold text-slate-400 hover:text-[#E53935] transition-colors cursor-pointer"
                  >
                    ล้างประวัติ
                  </button>
                </div>

                <div className="space-y-2">
                  {recentRooms.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => router.push(`/room/${r.id}`)}
                      className="p-3.5 rounded-2xl bg-[#FFFDF0] dark:bg-[#0f172a] border-2 border-slate-900 dark:border-slate-700 hover:border-[#43A047] dark:hover:border-emerald-400 shadow-[2px_2px_0px_#0f172a] dark:shadow-none transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="text-xs font-black text-slate-950 dark:text-white truncate group-hover:text-[#43A047] dark:group-hover:text-emerald-400 transition-colors">
                          {r.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {r.per_person_fee ? (
                            <span className="text-[#2E7D32] dark:text-emerald-400">
                              ฿{r.per_person_fee}/คน
                            </span>
                          ) : r.total_fee ? (
                            <span>ยอดรวม ฿{r.total_fee}</span>
                          ) : null}
                          {r.visited_at && (
                            <span>
                              • {new Date(r.visited_at).toLocaleDateString("th-TH", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="px-3 py-1.5 rounded-xl bg-[#43A047] text-white text-xs font-black border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] shrink-0 group-hover:bg-[#388E3C] transition-colors flex items-center gap-1">
                        <span>เข้าห้อง</span>
                        <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Card: Active Public Rooms from Supabase */}
            <div className="bg-white dark:bg-[#1a2234] rounded-3xl p-5 border-3 border-slate-900 dark:border-slate-700 shadow-[5px_5px_0px_0px_#0f172a] dark:shadow-[5px_5px_0px_0px_#000] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-950 dark:text-white font-black text-sm">
                  <Users className="w-4 h-4 text-[#FDD835]" />
                  <span>ก๊วนแบดที่เพิ่งเปิดล่าสุดในระบบ</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400">
                  {filteredPublicRooms.length} ห้อง
                </span>
              </div>

              {/* Search Filter Box */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาก๊วนตามชื่อห้อง..."
                  className="w-full pl-9 pr-4 py-2 bg-[#FFFDF0] dark:bg-[#0f172a] border-2 border-slate-900 dark:border-slate-600 rounded-xl text-slate-950 dark:text-white font-bold placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-[#43A047]"
                />
              </div>

              {isLoadingPublicRooms ? (
                <div className="py-6 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#43A047]" />
                  <span>กำลังค้นหาก๊วนแบด...</span>
                </div>
              ) : filteredPublicRooms.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {filteredPublicRooms.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => router.push(`/room/${r.id}`)}
                      className="p-3 rounded-2xl bg-[#FFFDF0] dark:bg-[#0f172a] border-2 border-slate-900 dark:border-slate-700 hover:border-[#43A047] dark:hover:border-emerald-400 shadow-[2px_2px_0px_#0f172a] dark:shadow-none transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="text-xs font-black text-slate-950 dark:text-white truncate group-hover:text-[#43A047] dark:group-hover:text-emerald-400 transition-colors">
                          {r.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {r.per_person_fee ? (
                            <span className="text-[#2E7D32] dark:text-emerald-400">
                              ฿{r.per_person_fee}/คน
                            </span>
                          ) : r.total_fee ? (
                            <span>ยอดรวม ฿{r.total_fee}</span>
                          ) : null}
                          {r.created_at && (
                            <span>
                              • {new Date(r.created_at).toLocaleDateString("th-TH", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#1a2234] text-slate-900 dark:text-white text-[11px] font-black border-2 border-slate-900 group-hover:bg-[#43A047] group-hover:text-white transition-colors shrink-0 shadow-[1px_1px_0px_#0f172a]">
                        เข้าร่วม ➔
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-xs font-bold text-slate-400">
                  {searchQuery
                    ? "ไม่พบก๊วนที่ตรงกับคำค้นหาฮะ"
                    : "ยังไม่มีก๊วนที่เปิดล่าสุดฮะ"}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 3: CREATE (สร้างห้องก๊วนใหม่ - สำหรับหัวห้อง) */}
        {/* ========================================================================= */}
        {pageMode === "create" && (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Navigation Header */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => changeMode("select")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-white dark:bg-[#1a2234] border-2 border-slate-900 dark:border-slate-700 text-slate-950 dark:text-white text-xs font-black shadow-[2px_2px_0px_#0f172a] hover:bg-slate-50 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>กลับหน้าหลัก</span>
              </button>

              <span className="text-[11px] font-black bg-[#E53935] text-[#FDD835] px-3 py-1 rounded-full border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                โหมดสร้างห้อง 👑
              </span>
            </div>

            {/* Comic App Header */}
            <header className="text-center">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight flex items-center justify-center gap-2">
                <span>สร้างห้องก๊วนใหม่</span>
                <span className="text-[#E53935] drop-shadow-[2px_2px_0px_#FDD835]">
                  🏸
                </span>
              </h1>

              {/* Comic Speech Bubble */}
              <div className="mt-2.5 relative inline-block max-w-md bg-white dark:bg-[#1a2234] border-3 border-slate-900 dark:border-[#FDD835] rounded-2xl px-4 py-2 shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#FDD835]">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-1.5">
                  <span>
                    วู้ววว! ตั้งค่ายอดเงินก๊วนแบด ใครไม่โอนระวังโดนแม่มิซาเอะเขกหัวนะฮะ!
                  </span>
                </p>
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-[#1a2234] border-t-3 border-l-3 border-slate-900 dark:border-[#FDD835] transform rotate-45" />
              </div>
            </header>

            {/* Error Alert */}
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-[#FFEBEE] dark:bg-[#3b1219] border-3 border-[#E53935] text-[#C62828] dark:text-[#ff8a80] text-xs sm:text-sm font-bold flex items-start gap-3 shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0 text-[#E53935] mt-0.5" />
                <div className="flex-1">
                  <span className="underline">แง้! ข้อผิดพลาด:</span> {errorMessage}
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Section 1: Room Details */}
              <div className="bg-white dark:bg-[#1a2234] rounded-3xl p-5 border-3 border-slate-900 dark:border-slate-700 shadow-[5px_5px_0px_0px_#0f172a] dark:shadow-[5px_5px_0px_0px_#000] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-950 dark:text-white font-black text-base">
                    <div className="w-7 h-7 rounded-xl bg-[#E53935] flex items-center justify-center text-white border-2 border-slate-900 dark:border-white/20">
                      <ShuttleIcon className="w-4 h-4" />
                    </div>
                    <span>ชื่อห้องก๊วนแบด</span>
                  </div>
                  <span className="text-[11px] font-black bg-[#FDD835] text-slate-900 px-2.5 py-0.5 rounded-full border-2 border-slate-900">
                    ขั้นตอนที่ 1
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ตั้งชื่อก๊วน / วันเวลาเล่น <span className="text-[#E53935]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="เช่น ก๊วนชินจังวันศุกร์ สนาม Winner คอร์ท 3-4"
                    className="w-full px-4 py-3 bg-[#FFFDF0] dark:bg-[#0f172a] border-3 border-slate-900 dark:border-slate-600 rounded-2xl text-slate-950 dark:text-white font-bold placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#E53935] transition-all text-sm"
                  />
                </div>
              </div>

              {/* Section: Host Passkey / PIN */}
              <div className="bg-white dark:bg-[#1a2234] rounded-3xl p-5 border-3 border-slate-900 dark:border-slate-700 shadow-[5px_5px_0px_0px_#0f172a] dark:shadow-[5px_5px_0px_0px_#000] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-950 dark:text-white font-black text-base">
                    <div className="w-7 h-7 rounded-xl bg-[#FDD835] flex items-center justify-center text-slate-950 border-2 border-slate-900">
                      <KeyRound className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <span>รหัสผ่านหัวห้อง (Host PIN)</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-300 dark:border-slate-600">
                    แนะนำ
                  </span>
                </div>

                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  ตั้งรหัส 4-6 หลักเพื่อใช้จัดการห้อง แก้ไขโน้ตก๊วน และลบสลิปผิด (คุณจะเข้าสู่ระบบหัวห้องอัตโนมัติ)
                </p>

                <div>
                  <input
                    type="text"
                    value={passkey}
                    onChange={(e) => setPasskey(e.target.value)}
                    placeholder="เช่น 1234 หรือ Shin99"
                    maxLength={12}
                    className="w-full px-4 py-3 bg-[#FFFDF0] dark:bg-[#0f172a] border-3 border-slate-900 dark:border-slate-600 rounded-2xl text-slate-950 dark:text-white font-black tracking-wider placeholder:tracking-normal placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FDD835] transition-all text-sm"
                  />
                </div>
              </div>

              {/* Section 2: Expense Breakdown */}
              <div className="bg-white dark:bg-[#1a2234] rounded-3xl p-5 border-3 border-slate-900 dark:border-slate-700 shadow-[5px_5px_0px_0px_#0f172a] dark:shadow-[5px_5px_0px_0px_#000] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-950 dark:text-white font-black text-base">
                    <div className="w-7 h-7 rounded-xl bg-[#FDD835] flex items-center justify-center text-slate-950 border-2 border-slate-900">
                      <CreditCard className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <span>ค่าใช้จ่ายก๊วนแบด</span>
                  </div>
                  <span className="text-[11px] font-black bg-[#E53935] text-white px-2.5 py-0.5 rounded-full border-2 border-slate-900">
                    ขั้นตอนที่ 2
                  </span>
                </div>

                {/* Court Fee */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ค่าคอร์ททั้งหมด (บาท)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900 dark:text-slate-200 font-black text-sm">
                      ฿
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={courtFee}
                      onChange={(e) =>
                        setCourtFee(
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                      placeholder="0.00"
                      className="w-full pl-9 pr-4 py-3 bg-[#FFFDF0] dark:bg-[#0f172a] border-3 border-slate-900 dark:border-slate-600 rounded-2xl text-slate-950 dark:text-white font-bold placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#E53935] transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Shuttlecock Fee Toggle */}
                <div className="pt-2 border-t-2 border-dashed border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      ค่าลูกแบดมินตัน
                    </label>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border-2 border-slate-900 dark:border-slate-600">
                      <button
                        type="button"
                        onClick={() => setShuttleMode("total")}
                        className={`text-xs px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer ${
                          shuttleMode === "total"
                            ? "bg-[#E53935] text-white shadow-[1px_1px_0px_#0f172a]"
                            : "text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white"
                        }`}
                      >
                        ยอดรวม
                      </button>
                      <button
                        type="button"
                        onClick={() => setShuttleMode("units")}
                        className={`text-xs px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer ${
                          shuttleMode === "units"
                            ? "bg-[#E53935] text-white shadow-[1px_1px_0px_#0f172a]"
                            : "text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white"
                        }`}
                      >
                        ราคา/ลูก x จำนวน
                      </button>
                    </div>
                  </div>

                  {shuttleMode === "total" ? (
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900 dark:text-slate-200 font-black text-sm">
                        ฿
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={shuttleTotal}
                        onChange={(e) =>
                          setShuttleTotal(
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        placeholder="ระบุยอดรวมค่าลูกแบด"
                        className="w-full pl-9 pr-4 py-3 bg-[#FFFDF0] dark:bg-[#0f172a] border-3 border-slate-900 dark:border-slate-600 rounded-2xl text-slate-950 dark:text-white font-bold placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#E53935] transition-all text-sm"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          ราคาต่อลูก (฿)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={pricePerShuttle}
                          onChange={(e) =>
                            setPricePerShuttle(
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
                          placeholder="เช่น 75"
                          className="w-full px-3 py-2.5 bg-[#FFFDF0] dark:bg-[#0f172a] border-3 border-slate-900 dark:border-slate-600 rounded-xl text-slate-950 dark:text-white font-bold placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#E53935] transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          จำนวนลูกที่ใช้
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={shuttleCount}
                          onChange={(e) =>
                            setShuttleCount(
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
                          placeholder="เช่น 4"
                          className="w-full px-3 py-2.5 bg-[#FFFDF0] dark:bg-[#0f172a] border-3 border-slate-900 dark:border-slate-600 rounded-xl text-slate-950 dark:text-white font-bold placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#E53935] transition-all text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Split Calculation Mode */}
              <div className="bg-white dark:bg-[#1a2234] rounded-3xl p-5 border-3 border-slate-900 dark:border-slate-700 shadow-[5px_5px_0px_0px_#0f172a] dark:shadow-[5px_5px_0px_0px_#000] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-950 dark:text-white font-black text-base">
                    <div className="w-7 h-7 rounded-xl bg-[#43A047] flex items-center justify-center text-white border-2 border-slate-900">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <span>การหารค่าใช้จ่าย</span>
                  </div>
                  <span className="text-[11px] font-black bg-[#FDD835] text-slate-900 px-2.5 py-0.5 rounded-full border-2 border-slate-900">
                    ขั้นตอนที่ 3
                  </span>
                </div>

                {/* Split Option Switcher */}
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border-2 border-slate-900 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setSplitMode("players")}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      splitMode === "players"
                        ? "bg-white dark:bg-[#0f172a] text-slate-950 dark:text-white border-2 border-slate-900 dark:border-white/20 shadow-[2px_2px_0px_#0f172a]"
                        : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
                    }`}
                  >
                    <span>ระบุจำนวนคนเล่น</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMode("direct")}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      splitMode === "direct"
                        ? "bg-white dark:bg-[#0f172a] text-slate-950 dark:text-white border-2 border-slate-900 dark:border-white/20 shadow-[2px_2px_0px_#0f172a]"
                        : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
                    }`}
                  >
                    <span>ระบุยอดโอน/คนตรงๆ</span>
                  </button>
                </div>

                {splitMode === "players" ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      ประมาณการจำนวนคนเล่น (เพื่อคำนวณยอดต่อคน)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        value={estimatedPlayers}
                        onChange={(e) =>
                          setEstimatedPlayers(
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        placeholder="เช่น 6"
                        className="w-full px-4 py-3 bg-[#FFFDF0] dark:bg-[#0f172a] border-3 border-slate-900 dark:border-slate-600 rounded-2xl text-slate-950 dark:text-white font-bold placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#43A047] transition-all text-sm"
                      />
                      <div className="flex gap-1.5 shrink-0">
                        {[4, 6, 8].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setEstimatedPlayers(num)}
                            className={`px-3 py-2.5 rounded-xl text-xs font-black border-2 border-slate-900 transition-all cursor-pointer ${
                              estimatedPlayers === num
                                ? "bg-[#FDD835] text-slate-950 shadow-[2px_2px_0px_#0f172a]"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                            }`}
                          >
                            {num} คน
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      ยอดเงินที่ต้องโอนต่อคน (บาท)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900 dark:text-slate-200 font-black text-sm">
                        ฿
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={directPerPersonFee}
                        onChange={(e) =>
                          setDirectPerPersonFee(
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        placeholder="เช่น 120"
                        className="w-full pl-9 pr-4 py-3 bg-[#FFFDF0] dark:bg-[#0f172a] border-3 border-slate-900 dark:border-slate-600 rounded-2xl text-slate-950 dark:text-white font-bold placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#43A047] transition-all text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Action Kamen Card Frame for Host PromptPay QR */}
              <div className="bg-gradient-to-br from-[#E8F5E9] via-white to-[#C8E6C9] dark:from-[#0f2818] dark:via-[#163a23] dark:to-[#0a1e12] rounded-3xl p-5 border-4 border-[#43A047] dark:border-emerald-400 shadow-[5px_5px_0px_0px_#0f172a] dark:shadow-[5px_5px_0px_0px_#34d399] relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ActionKamenAvatar className="w-7 h-7" />
                    <span className="text-slate-950 dark:text-white font-black text-base">
                      การ์ดพร้อมเพย์หน้ากากแอคชั่น!
                    </span>
                  </div>
                  <span className="text-[11px] font-black text-white bg-[#43A047] border-2 border-slate-900 dark:border-white/30 px-2.5 py-0.5 rounded-full shadow-[2px_2px_0px_#0f172a] dark:shadow-none">
                    QR หัวห้อง
                  </span>
                </div>

                <p className="text-xs font-bold text-slate-700 dark:text-emerald-100 mb-3">
                  อัปโหลดรูป QR พร้อมเพย์ของหัวห้อง เพื่อให้เพื่อนในก๊วนสแกนจ่ายได้ทันที
                </p>

                {!qrPreview ? (
                  <label
                    htmlFor={fileInputId}
                    className="flex flex-col items-center justify-center border-3 border-dashed border-[#43A047] dark:border-emerald-400 hover:border-slate-900 rounded-2xl p-5 cursor-pointer bg-white dark:bg-[#0d1f14]/80 hover:bg-[#F1F8E9] dark:hover:bg-[#122e1d] transition-all group shadow-[3px_3px_0px_#0f172a] dark:shadow-none"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#E8F5E9] dark:bg-emerald-900/60 group-hover:bg-[#C8E6C9] border-2 border-slate-900 dark:border-emerald-400 flex items-center justify-center text-[#2E7D32] dark:text-emerald-300 transition-all mb-2 shadow-[2px_2px_0px_#0f172a]">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-black text-slate-900 dark:text-white">
                      แตะเพื่ออัปโหลดรูป QR Code พร้อมเพย์
                    </p>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-emerald-300 mt-0.5">
                      รองรับ PNG, JPG, WEBP (เพื่อนสแกนปุ๊บ โอนปั๊บ!)
                    </p>
                    <input
                      id={fileInputId}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-white dark:bg-[#0f172a] border-3 border-slate-900 dark:border-emerald-400 shadow-[3px_3px_0px_#0f172a] dark:shadow-none">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                      <img
                        src={qrPreview}
                        alt="Host QR Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-950 dark:text-white truncate">
                        {qrFile?.name || "Host PromptPay QR"}
                      </p>
                      <p className="text-[11px] font-bold text-[#2E7D32] dark:text-emerald-300 flex items-center gap-1 mt-0.5">
                        <Zap className="w-3.5 h-3.5" />
                        พร้อมให้สแกนจ่ายแล้วจ้า!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveQr}
                      aria-label="ลบรูป QR Code"
                      className="p-2 text-slate-500 hover:text-[#E53935] hover:bg-[#FFEBEE] rounded-xl border border-transparent hover:border-slate-900 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Section 5: Real-time Chocobi Snack Box Summary Card */}
              <div className="bg-[#43A047] dark:bg-[#1a3d28] rounded-3xl p-5 border-4 border-slate-900 dark:border-[#FDD835] shadow-[6px_6px_0px_0px_#0f172a] dark:shadow-[6px_6px_0px_0px_#FDD835] text-white relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider bg-slate-900 text-[#FDD835] px-3 py-1 rounded-full border border-yellow-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>สรุปยอดกล่องช็อกโกบี</span>
                  </div>
                  {targetPlayersCount > 0 && (
                    <span className="text-xs font-black bg-[#FDD835] text-slate-950 px-3 py-1 rounded-full border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                      เป้าหมาย {targetPlayersCount} คน
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 my-3">
                  <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-3.5 border-3 border-slate-900 dark:border-slate-700 shadow-[3px_3px_0px_#0f172a] text-slate-950 dark:text-white">
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      ยอดรวมทั้งหมด
                    </div>
                    <div className="text-2xl font-black tracking-tight text-slate-950 dark:text-white mt-0.5">
                      ฿{totalFee.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                      คอร์ท ฿{parsedCourtFee} + ลูก ฿{parsedShuttleFee}
                    </div>
                  </div>

                  <div className="bg-[#FFF9C4] dark:bg-[#2c2207] rounded-2xl p-3.5 border-3 border-slate-900 dark:border-yellow-400/80 shadow-[3px_3px_0px_#0f172a] text-slate-950 dark:text-yellow-200">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-yellow-300/80">
                      ยอดโอนต่อคน
                    </div>
                    <div className="text-2xl font-black tracking-tight text-[#E53935] dark:text-yellow-300 mt-0.5">
                      ฿{formattedPerPerson}
                    </div>
                    <div className="text-[10px] font-bold text-slate-600 dark:text-yellow-200/70 mt-1">
                      {targetPlayersCount > 0
                        ? `หาร ${targetPlayersCount} คน`
                        : "กำหนดยอดต่อคน"}
                    </div>
                  </div>
                </div>

                {/* Tactile 3D Action Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || calculatedPerPerson <= 0}
                  className="w-full mt-3 py-4 px-5 rounded-2xl bg-[#E53935] hover:bg-[#D32F2F] text-[#FDD835] font-black text-base sm:text-lg border-3 border-slate-900 dark:border-yellow-300 shadow-[4px_4px_0px_#0f172a] hover:shadow-[5px_5px_0px_#0f172a] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-[#FDD835]" />
                      <span>กำลังสร้างห้อง... รอก่อนนะฮะ!</span>
                    </>
                  ) : (
                    <>
                      <span>สร้างห้องก๊วนแบดเลยฮะ!</span>
                      <ArrowRight className="w-4 h-4 stroke-[3]" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
