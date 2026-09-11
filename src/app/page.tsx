/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useId } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Loader2,
  X,
  CreditCard,
  Calculator,
  Trash2,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ShuttleIcon } from "@/components/ShuttleIcon";
import {
  ShinchanAvatar,
  ShiroAvatar,
  ActionKamenAvatar,
  ChocobiStar,
} from "@/components/NoharaAvatars";
import { ShinchanFloatingBackground } from "@/components/ShinchanFloatingBackground";

export default function CreateRoomPage() {
  const router = useRouter();
  const fileInputId = useId();

  // Form states
  const [title, setTitle] = useState("");
  const [courtFee, setCourtFee] = useState<number | "">("");

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

  // Calculated values
  const parsedCourtFee = typeof courtFee === "number" ? courtFee : 0;

  const parsedShuttleFee =
    shuttleMode === "total"
      ? typeof shuttleTotal === "number"
        ? shuttleTotal
        : 0
      : (typeof pricePerShuttle === "number" ? pricePerShuttle : 0) *
        (typeof shuttleCount === "number" ? shuttleCount : 0);

  const totalFee = parsedCourtFee + parsedShuttleFee;

  // Calculate per person amount and target players
  let calculatedPerPerson = 0;
  let targetPlayersCount = 0;

  if (splitMode === "players") {
    targetPlayersCount = typeof estimatedPlayers === "number" && estimatedPlayers > 0 ? estimatedPlayers : 0;
    calculatedPerPerson = targetPlayersCount > 0 ? Math.round((totalFee / targetPlayersCount) * 100) / 100 : 0;
  } else {
    calculatedPerPerson = typeof directPerPersonFee === "number" && directPerPersonFee > 0 ? directPerPersonFee : 0;
    targetPlayersCount = calculatedPerPerson > 0 ? Math.ceil(totalFee / calculatedPerPerson) : 0;
  }

  const formattedPerPerson =
    calculatedPerPerson % 1 === 0 ? calculatedPerPerson.toFixed(0) : calculatedPerPerson.toFixed(2);

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

      // Attempt insert with target_players & per_person_fee if supported by table
      const fullPayload: Record<string, unknown> = {
        title: formattedTitle,
        court_fee: parsedCourtFee,
        shuttle_fee: parsedShuttleFee,
        total_fee: totalFee,
        qr_url: qrUrl,
        target_players: targetPlayersCount > 0 ? targetPlayersCount : null,
        per_person_fee: calculatedPerPerson > 0 ? calculatedPerPerson : null,
      };

      let { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .insert([fullPayload])
        .select()
        .single();

      // If columns target_players or per_person_fee don't exist in Supabase schema, retry with standard columns
      if (
        roomError &&
        (roomError.message?.includes("target_players") ||
          roomError.message?.includes("per_person_fee") ||
          roomError.code === "PGRST204")
      ) {
        console.warn("Retrying with base room columns:", roomError.message);
        const basePayload = {
          title: formattedTitle,
          court_fee: parsedCourtFee,
          shuttle_fee: parsedShuttleFee,
          total_fee: totalFee,
          qr_url: qrUrl,
        };

        const retry = await supabase
          .from("rooms")
          .insert([basePayload])
          .select()
          .single();

        roomData = retry.data;
        roomError = retry.error;
      }

      if (roomError || !roomData) {
        throw new Error(roomError?.message || "ไม่สามารถสร้างห้องได้ กรุณาลองใหม่อีกครั้ง");
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

  return (
    <div className="min-h-screen relative flex flex-col items-center py-6 px-4 sm:px-6">
      {/* Floating Nohara Family Ambient Background */}
      <ShinchanFloatingBackground />

      <div className="w-full max-w-xl relative z-10">
        {/* Comic App Header */}
        <header className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FDD835] border-3 border-slate-900 text-slate-950 text-xs font-black uppercase tracking-wider mb-3 shadow-[3px_3px_0px_#0f172a] transform -rotate-1">
            <ShinchanAvatar className="w-5 h-5 -ml-1" />
            <span>Bad-Split x Crayon Shin-chan</span>
            <ChocobiStar className="w-4 h-4 text-slate-900" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight flex items-center justify-center gap-2">
            <span>ก๊วนนี้ใครจ่าย!</span>
            <span className="text-[#E53935] drop-shadow-[2px_2px_0px_#FDD835]">🏸</span>
          </h1>

          {/* Comic Speech Bubble */}
          <div className="mt-3 relative inline-block max-w-md bg-white border-3 border-slate-900 rounded-2xl px-4 py-2.5 shadow-[4px_4px_0px_#0f172a]">
            <p className="text-xs sm:text-sm font-bold text-slate-800 flex items-center justify-center gap-1.5">
              <span>วู้ววว! ตั้งค่ายอดเงินก๊วนแบด ใครไม่โอนระวังโดนแม่มิซาเอะเขกหัวนะฮะ!</span>
            </p>
            {/* Bubble arrow pointing up */}
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-t-3 border-l-3 border-slate-900 transform rotate-45" />
          </div>
        </header>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-4 rounded-2xl bg-[#FFEBEE] border-3 border-[#E53935] text-[#C62828] text-xs sm:text-sm font-bold flex items-start gap-3 shadow-[4px_4px_0px_#0f172a] animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 text-[#E53935] mt-0.5" />
            <div className="flex-1">
              <span className="underline">แง้! ข้อผิดพลาด:</span> {errorMessage}
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-slate-600 hover:text-black"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Room Details */}
          <div className="bg-white rounded-3xl p-5 border-3 border-slate-900 shadow-[5px_5px_0px_0px_#0f172a] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-950 font-black text-base">
                <div className="w-7 h-7 rounded-xl bg-[#E53935] flex items-center justify-center text-white border-2 border-slate-900">
                  <ShuttleIcon className="w-4 h-4" />
                </div>
                <span>ชื่อห้องก๊วนแบด</span>
              </div>
              <span className="text-[11px] font-black bg-[#FDD835] text-slate-900 px-2.5 py-0.5 rounded-full border-2 border-slate-900">
                ขั้นตอนที่ 1
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ตั้งชื่อก๊วน / วันเวลาเล่น <span className="text-[#E53935]">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น ก๊วนชินจังวันศุกร์ สนาม Winner คอร์ท 3-4"
                className="w-full px-4 py-3 bg-[#FFFDF0] border-3 border-slate-900 rounded-2xl text-slate-950 font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E53935] transition-all text-sm"
              />
            </div>
          </div>

          {/* Section 2: Expense Breakdown */}
          <div className="bg-white rounded-3xl p-5 border-3 border-slate-900 shadow-[5px_5px_0px_0px_#0f172a] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-950 font-black text-base">
                <div className="w-7 h-7 rounded-xl bg-[#43A047] flex items-center justify-center text-white border-2 border-slate-900">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span>ค่าใช้จ่ายทั้งหมด</span>
              </div>
              <span className="text-[11px] font-black text-[#2E7D32] bg-[#E8F5E9] border-2 border-[#43A047] px-2 py-0.5 rounded-full">
                คำนวณอัตโนมัติ
              </span>
            </div>

            {/* Court Fee */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ค่าคอร์ทแบดมินตัน (บาท)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={courtFee}
                  onChange={(e) =>
                    setCourtFee(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="0"
                  className="w-full pl-4 pr-12 py-2.5 bg-[#FFFDF0] border-3 border-slate-900 rounded-2xl text-slate-950 font-black placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E53935] transition-all text-base"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-500 text-sm">
                  ฿
                </span>
              </div>
            </div>

            {/* Shuttle Fee Segmented Selector */}
            <div className="pt-3 border-t-2 border-dashed border-slate-200">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold text-slate-700">
                  ค่าลูกแบดมินตัน
                </label>
                <div className="inline-flex p-1 bg-slate-100 rounded-xl border-2 border-slate-900">
                  <button
                    type="button"
                    onClick={() => setShuttleMode("total")}
                    className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                      shuttleMode === "total"
                        ? "bg-[#E53935] text-white shadow-[2px_2px_0px_#0f172a] border border-slate-900"
                        : "text-slate-600 hover:text-black"
                    }`}
                  >
                    ใส่ยอดรวม
                  </button>
                  <button
                    type="button"
                    onClick={() => setShuttleMode("units")}
                    className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                      shuttleMode === "units"
                        ? "bg-[#E53935] text-white shadow-[2px_2px_0px_#0f172a] border border-slate-900"
                        : "text-slate-600 hover:text-black"
                    }`}
                  >
                    คิดตามลูก
                  </button>
                </div>
              </div>

              {shuttleMode === "total" ? (
                <div className="relative">
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
                    placeholder="ยอดรวมค่าลูกแบด (0)"
                    className="w-full pl-4 pr-12 py-2.5 bg-[#FFFDF0] border-3 border-slate-900 rounded-2xl text-slate-950 font-black placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E53935] transition-all text-base"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-500 text-sm">
                    ฿
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ราคาต่อลูก (บาท)
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
                      placeholder="เช่น 25"
                      className="w-full px-3 py-2 bg-[#FFFDF0] border-3 border-slate-900 rounded-xl text-slate-950 font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E53935] transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      จำนวนลูกที่ตี
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={shuttleCount}
                      onChange={(e) =>
                        setShuttleCount(
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                      placeholder="เช่น 6"
                      className="w-full px-3 py-2 bg-[#FFFDF0] border-3 border-slate-900 rounded-xl text-slate-950 font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E53935] transition-all text-sm"
                    />
                  </div>
                  {parsedShuttleFee > 0 && (
                    <div className="col-span-2 text-xs font-black text-slate-900 bg-[#FFF9C4] px-3.5 py-2 rounded-xl border-2 border-slate-900 flex items-center justify-between">
                      <span>รวมค่าลูกแบดทั้งหมด:</span>
                      <span className="text-[#E53935] text-sm font-black">
                        ฿{parsedShuttleFee.toLocaleString()} บาท
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Split Settings */}
          <div className="bg-white rounded-3xl p-5 border-3 border-slate-900 shadow-[5px_5px_0px_0px_#0f172a] space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-950 font-black text-base">
                <div className="w-7 h-7 rounded-xl bg-[#FDD835] flex items-center justify-center text-slate-900 border-2 border-slate-900">
                  <Calculator className="w-4 h-4" />
                </div>
                <span>วิธีหารยอดเงิน</span>
              </div>
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border-2 border-slate-900">
                <button
                  type="button"
                  onClick={() => setSplitMode("players")}
                  className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                    splitMode === "players"
                      ? "bg-[#FDD835] text-slate-950 shadow-[2px_2px_0px_#0f172a] border border-slate-900"
                      : "text-slate-600 hover:text-black"
                  }`}
                >
                  ตามจำนวนคน
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode("direct")}
                  className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                    splitMode === "direct"
                      ? "bg-[#FDD835] text-slate-950 shadow-[2px_2px_0px_#0f172a] border border-slate-900"
                      : "text-slate-600 hover:text-black"
                  }`}
                >
                  กำหนดยอดต่อคน
                </button>
              </div>
            </div>

            {splitMode === "players" ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  จำนวนผู้เล่นโดยประมาณ (คน)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={estimatedPlayers}
                    onChange={(e) =>
                      setEstimatedPlayers(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    placeholder="เช่น 6"
                    className="w-full pl-4 pr-14 py-2.5 bg-[#FFFDF0] border-3 border-slate-900 rounded-2xl text-slate-950 font-black placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E53935] transition-all text-base"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-500 text-sm">
                    คน
                  </span>
                </div>
                <div className="text-[11px] font-bold text-slate-700 mt-2 flex items-center gap-1.5 bg-[#F1F5F9] p-2.5 rounded-xl border border-slate-300">
                  <ShiroAvatar className="w-4 h-4 shrink-0" />
                  <span>
                    ยอดรวม ฿{totalFee} บาท ÷ {targetPlayersCount} คน ={" "}
                    <strong className="text-[#E53935] font-black text-xs">
                      ฿{formattedPerPerson} บาท/คน
                    </strong>
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  กำหนดยอดที่ต้องโอนต่อคนโดยตรง (บาท)
                </label>
                <div className="relative">
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
                    placeholder="เช่น 100 หรือ 120"
                    className="w-full pl-4 pr-16 py-2.5 bg-[#FFFDF0] border-3 border-slate-900 rounded-2xl text-slate-950 font-black placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E53935] transition-all text-base"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-500 text-sm">
                    ฿ / คน
                  </span>
                </div>
                <div className="text-[11px] font-bold text-slate-700 mt-2 flex items-center gap-1.5 bg-[#F1F5F9] p-2.5 rounded-xl border border-slate-300">
                  <ShiroAvatar className="w-4 h-4 shrink-0" />
                  <span>
                    สมาชิกจะเห็นยอดโอนคนละ{" "}
                    <strong className="text-[#E53935] font-black">
                      ฿{formattedPerPerson} บาท
                    </strong>
                    {totalFee > 0 && targetPlayersCount > 0 && (
                      <span> (ต้องการ {targetPlayersCount} คน ถึงจะครบ)</span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Action Kamen Card Frame for Host PromptPay QR */}
          <div className="bg-gradient-to-br from-[#E8F5E9] via-white to-[#C8E6C9] rounded-3xl p-5 border-4 border-[#43A047] shadow-[5px_5px_0px_0px_#0f172a] relative overflow-hidden">
            {/* Action Kamen Badge Watermark */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ActionKamenAvatar className="w-7 h-7" />
                <span className="text-slate-950 font-black text-base">
                  การ์ดพร้อมเพย์หน้ากากแอคชั่น!
                </span>
              </div>
              <span className="text-[11px] font-black text-white bg-[#43A047] border-2 border-slate-900 px-2.5 py-0.5 rounded-full shadow-[2px_2px_0px_#0f172a]">
                QR หัวห้อง
              </span>
            </div>

            <p className="text-xs font-bold text-slate-700 mb-3">
              อัปโหลดรูป QR พร้อมเพย์ของหัวห้อง เพื่อให้เพื่อนในก๊วนสแกนจ่ายได้ทันที
            </p>

            {!qrPreview ? (
              <label
                htmlFor={fileInputId}
                className="flex flex-col items-center justify-center border-3 border-dashed border-[#43A047] hover:border-slate-900 rounded-2xl p-5 cursor-pointer bg-white hover:bg-[#F1F8E9] transition-all group shadow-[3px_3px_0px_#0f172a]"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#E8F5E9] group-hover:bg-[#C8E6C9] border-2 border-slate-900 flex items-center justify-center text-[#2E7D32] transition-all mb-2 shadow-[2px_2px_0px_#0f172a]">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs font-black text-slate-900">
                  แตะเพื่ออัปโหลดรูป QR Code พร้อมเพย์
                </p>
                <p className="text-[11px] font-bold text-slate-500 mt-0.5">
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
              <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-white border-3 border-slate-900 shadow-[3px_3px_0px_#0f172a]">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                  <img
                    src={qrPreview}
                    alt="Host QR Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate">
                    {qrFile?.name || "Host PromptPay QR"}
                  </p>
                  <p className="text-[11px] font-bold text-[#2E7D32] flex items-center gap-1 mt-0.5">
                    <Zap className="w-3.5 h-3.5" />
                    พร้อมให้สแกนจ่ายแล้วจ้า!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveQr}
                  aria-label="ลบรูป QR Code"
                  className="p-2 text-slate-500 hover:text-[#E53935] hover:bg-[#FFEBEE] rounded-xl border border-transparent hover:border-slate-900 transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Section 5: Real-time Chocobi Snack Box Summary Card */}
          <div className="bg-[#43A047] rounded-3xl p-5 border-4 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] text-white relative overflow-hidden">
            {/* Chocobi Pink Star corner accent */}
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
              <div className="bg-white rounded-2xl p-3.5 border-3 border-slate-900 shadow-[3px_3px_0px_#0f172a] text-slate-950">
                <div className="text-[11px] font-bold text-slate-600">ยอดรวมทั้งหมด</div>
                <div className="text-2xl font-black tracking-tight text-slate-950 mt-0.5">
                  ฿{totalFee.toLocaleString()}
                </div>
                <div className="text-[10px] font-bold text-slate-500 mt-1">
                  คอร์ท ฿{parsedCourtFee} + ลูก ฿{parsedShuttleFee}
                </div>
              </div>

              <div className="bg-[#FFF9C4] rounded-2xl p-3.5 border-3 border-slate-900 shadow-[3px_3px_0px_#0f172a] text-slate-950">
                <div className="text-[11px] font-bold text-slate-700">ยอดโอนต่อคน</div>
                <div className="text-2xl font-black tracking-tight text-[#E53935] mt-0.5">
                  ฿{formattedPerPerson}
                </div>
                <div className="text-[10px] font-bold text-slate-600 mt-1">
                  {targetPlayersCount > 0 ? `หาร ${targetPlayersCount} คน` : "กำหนดยอดต่อคน"}
                </div>
              </div>
            </div>

            {/* Tactile 3D Action Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || calculatedPerPerson <= 0}
              className="w-full mt-3 py-4 px-5 rounded-2xl bg-[#E53935] hover:bg-[#D32F2F] text-[#FDD835] font-black text-base sm:text-lg border-3 border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:shadow-[5px_5px_0px_#0f172a] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-[#FDD835]" />
                  <span>กำลังสร้างห้อง... รอก่อนนะฮะ!</span>
                </>
              ) : (
                <>
                  <span>สร้างห้องก๊วนแบดเลยฮะ!</span>
                  <ArrowRight className="w-5 h-5 stroke-[3]" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
