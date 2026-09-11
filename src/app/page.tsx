/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useId } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Upload,
  QrCode,
  Users,
  AlertCircle,
  Sparkles,
  ClipboardPaste,
  ArrowRight,
  Loader2,
  X,
  FileText,
  CreditCard,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ShuttleIcon } from "@/components/ShuttleIcon";

interface PlayerInput {
  id: string;
  name: string;
}

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

  // Players list
  const [players, setPlayers] = useState<PlayerInput[]>([
    { id: "1", name: "" },
    { id: "2", name: "" },
    { id: "3", name: "" },
    { id: "4", name: "" },
  ]);

  // Bulk paste modal
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkText, setBulkText] = useState("");

  // QR Code upload
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

  const validPlayers = players
    .map((p) => p.name.trim())
    .filter((name) => name.length > 0);
  
  const playerCount = validPlayers.length;
  const perPersonCost = playerCount > 0 ? totalFee / playerCount : 0;
  // Rounded for clean display if decimal
  const formattedPerPerson =
    perPersonCost % 1 === 0 ? perPersonCost.toFixed(0) : perPersonCost.toFixed(2);

  // Player handlers
  const handleAddPlayer = () => {
    setPlayers((prev) => [...prev, { id: crypto.randomUUID(), name: "" }]);
  };

  const handleRemovePlayer = (id: string) => {
    if (players.length <= 1) return;
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const handlePlayerNameChange = (id: string, name: string) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name } : p))
    );
  };

  const handleApplyBulkPaste = () => {
    if (!bulkText.trim()) {
      setShowBulkPaste(false);
      return;
    }

    // Parse lines, strip common numbering like "1.", "1)", "-", "•"
    const parsedNames = bulkText
      .split(/\r?\n|,/)
      .map((line) =>
        line
          .replace(/^[\s\d]+[.)\-•]\s*/, "") // remove leading "1.", "2)", "• "
          .trim()
      )
      .filter((name) => name.length > 0);

    if (parsedNames.length > 0) {
      setPlayers(
        parsedNames.map((name) => ({
          id: crypto.randomUUID(),
          name,
        }))
      );
    }
    setBulkText("");
    setShowBulkPaste(false);
  };

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
      const cleanFileName = `qr_${Date.now()}_${Math.random()
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
        console.warn("QR upload notice:", uploadError.message);
        // If storage bucket isn't configured, we'll continue gracefully
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

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("กรุณากรอกชื่อห้องหรือชื่อก๊วน");
      return;
    }

    if (validPlayers.length === 0) {
      setErrorMessage("กรุณาใส่ชื่อผู้เล่นอย่างน้อย 1 คน");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload QR Code if attached
      let qrUrl: string | null = null;
      if (qrFile) {
        qrUrl = await uploadQrCode();
      }

      // 2. Insert Room
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .insert([
          {
            title: title.trim(),
            court_fee: parsedCourtFee,
            shuttle_fee: parsedShuttleFee,
            total_fee: totalFee,
            qr_url: qrUrl,
          },
        ])
        .select()
        .single();

      if (roomError || !roomData) {
        throw new Error(roomError?.message || "ไม่สามารถสร้างห้องได้ กรุณาลองใหม่อีกครั้ง");
      }

      // 3. Insert Members
      const membersPayload = validPlayers.map((name) => ({
        room_id: roomData.id,
        name,
        amount: Math.round(perPersonCost * 100) / 100, // round to 2 decimal places
        is_paid: false,
      }));

      const { error: membersError } = await supabase
        .from("members")
        .insert(membersPayload);

      if (membersError) {
        throw new Error(membersError.message);
      }

      // 4. Redirect to Room Dashboard
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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-6 px-4 sm:px-6">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-emerald-500/15 blur-[120px] rounded-full" />
        <div className="absolute top-96 right-10 w-[300px] h-[300px] bg-emerald-600/10 blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-xl">
        {/* App Header */}
        <header className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <ShuttleIcon className="w-4 h-4 text-emerald-400" />
            <span>Badminton Expense Split</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
            สร้างห้องหารค่าแบด
          </h1>
          <p className="text-slate-400 text-sm mt-1.5">
            หารค่าคอร์ท ค่าลูกแบด พร้อมสรุปยอดและส่งลิงก์เช็คสถานะให้เพื่อนในก๊วน
          </p>
        </header>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">
              <span className="font-medium">เกิดข้อผิดพลาด:</span> {errorMessage}
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Room Details */}
          <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-5 border border-slate-700/60 shadow-xl shadow-slate-950/40">
            <div className="flex items-center gap-2 mb-3 text-slate-200 font-semibold text-base">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>ข้อมูลห้อง / ก๊วนแบด</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                ชื่อห้อง / วันที่เล่น <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น ก๊วนแบดวันศุกร์ สนาม Winner คอร์ท 3-4"
                className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500 transition-all text-sm"
              />
            </div>
          </div>

          {/* Section 2: Expense Breakdown */}
          <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-5 border border-slate-700/60 shadow-xl shadow-slate-950/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200 font-semibold text-base">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>ค่าใช้จ่ายทั้งหมด</span>
              </div>
              <span className="text-xs text-emerald-400 font-medium">
                คำนวณอัตโนมัติ
              </span>
            </div>

            {/* Court Fee */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                ค่าคอร์ท (บาท)
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
                  className="w-full pl-3.5 pr-12 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500 transition-all text-sm"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                  ฿
                </span>
              </div>
            </div>

            {/* Shuttle Fee Segmented Selector */}
            <div className="pt-2 border-t border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-400">
                  ค่าลูกแบดมินตัน
                </label>
                <div className="inline-flex p-0.5 bg-slate-900/90 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShuttleMode("total")}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                      shuttleMode === "total"
                        ? "bg-emerald-500 text-slate-950 font-semibold shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    ใส่ยอดรวม
                  </button>
                  <button
                    type="button"
                    onClick={() => setShuttleMode("units")}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                      shuttleMode === "units"
                        ? "bg-emerald-500 text-slate-950 font-semibold shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    คำนวณตามลูก
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
                    className="w-full pl-3.5 pr-12 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500 transition-all text-sm"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                    ฿
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
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
                      className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      จำนวนลูกที่ใช้
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
                      className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>
                  {parsedShuttleFee > 0 && (
                    <div className="col-span-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 flex items-center justify-between">
                      <span>รวมค่าลูกแบด:</span>
                      <span className="font-semibold">฿{parsedShuttleFee.toLocaleString()} บาท</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Players Input */}
          <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-5 border border-slate-700/60 shadow-xl shadow-slate-950/40 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200 font-semibold text-base">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>รายชื่อผู้เล่น ({playerCount} คน)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkPaste(true)}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium py-1 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>วางรายชื่อจาก LINE</span>
              </button>
            </div>

            {/* Players List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {players.map((player, index) => (
                <div key={player.id} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-900/80 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-400 shrink-0">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) =>
                      handlePlayerNameChange(player.id, e.target.value)
                    }
                    placeholder={`ชื่อผู้เล่นคนที่ ${index + 1}`}
                    className="flex-1 px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500 transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePlayer(player.id)}
                    disabled={players.length <= 1}
                    aria-label={`ลบผู้เล่น ${player.name || index + 1}`}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddPlayer}
              className="w-full py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-slate-300 hover:text-emerald-400 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มผู้เล่นทีละคน</span>
            </button>
          </div>

          {/* Section 4: QR Code Upload */}
          <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-5 border border-slate-700/60 shadow-xl shadow-slate-950/40">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-200 font-semibold text-base">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>QR Code พร้อมเพย์ / บัญชีรับเงิน</span>
              </div>
              <span className="text-[11px] text-slate-400">(ไม่บังคับ)</span>
            </div>

            {!qrPreview ? (
              <label
                htmlFor={fileInputId}
                className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl p-5 cursor-pointer bg-slate-900/50 hover:bg-slate-900/90 transition-all group"
              >
                <div className="w-11 h-11 rounded-full bg-slate-800 group-hover:bg-emerald-500/10 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 transition-all mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-slate-300 group-hover:text-white">
                  กดเพื่ออัปโหลดรูปภาพ QR Code พร้อมเพย์
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  รองรับไฟล์ PNG, JPG, WebP
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
              <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-900/90 border border-slate-700">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                  {/* Preview image */}
                  <img
                    src={qrPreview}
                    alt="QR Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {qrFile?.name || "QR Code Image"}
                  </p>
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                    <Sparkles className="w-3 h-3" />
                    พร้อมอัปโหลดเข้าคลาวด์
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveQr}
                  aria-label="ลบรูป QR Code"
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Section 5: Real-time Live Summary Card */}
          <div className="bg-gradient-to-br from-emerald-600/90 to-teal-700/90 text-white rounded-2xl p-5 shadow-2xl shadow-emerald-950/50 border border-emerald-400/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-emerald-100/80 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                สรุปยอดคำนวณเรียลไทม์
              </span>
              <span className="text-xs bg-emerald-900/40 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/20">
                {playerCount} คน
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 my-3">
              <div className="bg-slate-950/30 rounded-xl p-3 border border-emerald-300/20">
                <div className="text-[11px] text-emerald-100/70">ยอดรวมทั้งหมด</div>
                <div className="text-xl font-bold tracking-tight text-white mt-0.5">
                  ฿{totalFee.toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-200/80 mt-1">
                  คอร์ท ฿{parsedCourtFee} + ลูก ฿{parsedShuttleFee}
                </div>
              </div>

              <div className="bg-slate-950/30 rounded-xl p-3 border border-emerald-300/20">
                <div className="text-[11px] text-emerald-100/70">ยอดเฉลี่ยต่อคน</div>
                <div className="text-xl font-bold tracking-tight text-emerald-200 mt-0.5">
                  ฿{formattedPerPerson}
                </div>
                <div className="text-[10px] text-emerald-200/80 mt-1">
                  {playerCount > 0
                    ? `หาร ${playerCount} คน`
                    : "กรุณาใส่ชื่อผู้เล่น"}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || playerCount === 0}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm shadow-lg shadow-black/20 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                  <span>กำลังสร้างห้องและอัปโหลด...</span>
                </>
              ) : (
                <>
                  <span>สร้างห้องและรับลิงก์ชำระเงิน</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Bulk Paste Modal */}
        {showBulkPaste && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ClipboardPaste className="w-4 h-4 text-emerald-400" />
                  <span>วางรายชื่อหลายคนพร้อมกัน</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowBulkPaste(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400">
                สามารถคัดลอกจากโพลใน LINE หรือรายชื่อที่คั่นด้วยเครื่องหมายจุลภาค (,) หรือขึ้นบรรทัดใหม่ ระบบจะแยกชื่อให้อัตโนมัติ
              </p>
              <textarea
                rows={6}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"1. บอย\n2. แนน\n3. โจ้\n4. บอส\n5. มายด์"}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkPaste(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulkPaste}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow transition-all"
                >
                  นำเข้ารายชื่อ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
