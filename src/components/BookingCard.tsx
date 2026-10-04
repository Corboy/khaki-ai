"use client";

import React, { useState } from "react";
import { BookingDetails } from "@/types/chat";
import { buildWhatsAppBookingUrl, KHAKI_CONFIG } from "@/config/khaki";
import {
  Calendar,
  Clock,
  User,
  Music,
  FileText,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Edit3,
  Check,
} from "lucide-react";

interface BookingCardProps {
  booking: BookingDetails;
  onUpdateBooking?: (updated: BookingDetails) => void;
}

export const BookingCard: React.FC<BookingCardProps> = ({ booking, onUpdateBooking }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<BookingDetails>({ ...booking });

  const currentData = isEditing ? formData : booking;
  const whatsappUrl = buildWhatsAppBookingUrl(currentData);

  const handleFieldChange = (field: keyof BookingDetails, value: string) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    if (onUpdateBooking) {
      onUpdateBooking(updated);
    }
  };

  return (
    <div className="my-5 overflow-hidden rounded-[26px] apple-glass-gold p-5 sm:p-6 transition-all duration-300 animate-slide-up shadow-gold">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3.5 border-b border-[#D4AF37]/20">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37]/30 to-[#996515]/20 text-[#F5D061] border border-[#D4AF37]/40 shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
              <span>Taarifa za Booking ya Studio</span>
              <span className="hidden sm:inline-block rounded-full bg-[#D4AF37]/15 px-2 py-0.5 text-[10px] font-medium text-[#F5D061] border border-[#D4AF37]/30">
                Tayari Kutumwa
              </span>
            </h4>
            <p className="text-[11px] text-zinc-400">
              Imetayarishwa na Khaki AI • Bonyeza hapa chini kuwasiliana WhatsApp
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-[#F5D061] hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 transition-all active:scale-95"
        >
          {isEditing ? (
            <>
              <Check className="h-3 w-3" />
              <span>Hifadhi</span>
            </>
          ) : (
            <>
              <Edit3 className="h-3 w-3" />
              <span>Hariri</span>
            </>
          )}
        </button>
      </div>

      {/* Captured details grid */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        {/* Jina */}
        <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-3 border border-white/[0.06] backdrop-blur-sm">
          <User className="h-4 w-4 text-[#D4AF37] shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block">
              Jina la Mteja
            </span>
            {isEditing ? (
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                placeholder="Ingiza jina lako..."
                className="w-full bg-black/60 text-white rounded-lg px-2 py-1 text-xs border border-white/15 focus:border-[#D4AF37] focus:outline-none"
              />
            ) : (
              <span className="font-medium text-white truncate block text-[13px]">
                {currentData.name || <em className="text-zinc-500 font-normal">Halijawekwa bado</em>}
              </span>
            )}
          </div>
        </div>

        {/* Huduma */}
        <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-3 border border-white/[0.06] backdrop-blur-sm">
          <Music className="h-4 w-4 text-[#D4AF37] shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block">
              Huduma ya Studio
            </span>
            {isEditing ? (
              <input
                type="text"
                value={formData.service || ""}
                onChange={(e) => handleFieldChange("service", e.target.value)}
                placeholder="Mfano: Studio Recording"
                className="w-full bg-black/60 text-white rounded-lg px-2 py-1 text-xs border border-white/15 focus:border-[#D4AF37] focus:outline-none"
              />
            ) : (
              <span className="font-medium text-white truncate block text-[13px]">
                {currentData.service || <em className="text-zinc-500 font-normal">Haijachaguliwa</em>}
              </span>
            )}
          </div>
        </div>

        {/* Tarehe */}
        <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-3 border border-white/[0.06] backdrop-blur-sm">
          <Calendar className="h-4 w-4 text-[#D4AF37] shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block">
              Tarehe / Siku
            </span>
            {isEditing ? (
              <input
                type="text"
                value={formData.date || ""}
                onChange={(e) => handleFieldChange("date", e.target.value)}
                placeholder="Mfano: Jumamosi au 15/10"
                className="w-full bg-black/60 text-white rounded-lg px-2 py-1 text-xs border border-white/15 focus:border-[#D4AF37] focus:outline-none"
              />
            ) : (
              <span className="font-medium text-white truncate block text-[13px]">
                {currentData.date || <em className="text-zinc-500 font-normal">Haijatajwa</em>}
              </span>
            )}
          </div>
        </div>

        {/* Muda */}
        <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-3 border border-white/[0.06] backdrop-blur-sm">
          <Clock className="h-4 w-4 text-[#D4AF37] shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block">
              Muda
            </span>
            {isEditing ? (
              <input
                type="text"
                value={formData.time || ""}
                onChange={(e) => handleFieldChange("time", e.target.value)}
                placeholder="Mfano: 14:00 au 04:00 Jioni"
                className="w-full bg-black/60 text-white rounded-lg px-2 py-1 text-xs border border-white/15 focus:border-[#D4AF37] focus:outline-none"
              />
            ) : (
              <span className="font-medium text-white truncate block text-[13px]">
                {currentData.time || <em className="text-zinc-500 font-normal">Haijatajwa</em>}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Maelezo ya Ziada */}
      {(currentData.notes || isEditing) && (
        <div className="mt-2.5 flex items-start gap-3 rounded-2xl bg-white/[0.03] p-3 border border-white/[0.06] text-xs">
          <FileText className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block">
              Maelezo ya Ziada
            </span>
            {isEditing ? (
              <input
                type="text"
                value={formData.notes || ""}
                onChange={(e) => handleFieldChange("notes", e.target.value)}
                placeholder="Mfano: Recording ya nyimbo 3 na beat production"
                className="w-full bg-black/60 text-white rounded-lg px-2 py-1 text-xs border border-white/15 focus:border-[#D4AF37] focus:outline-none"
              />
            ) : (
              <span className="text-zinc-300 block text-[13px]">{currentData.notes}</span>
            )}
          </div>
        </div>
      )}

      {/* 1-Click WhatsApp Booking CTA */}
      <div className="mt-4 pt-3.5 border-t border-[#D4AF37]/20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] text-zinc-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>Taarifa zitatumwa zikiwa tayari zimejazwa moja kwa moja</span>
        </div>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 px-6 py-3 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
        >
          <span>📲 Book kupitia WhatsApp</span>
          <ExternalLink className="h-4 w-4 stroke-[2.2]" />
        </a>
      </div>
    </div>
  );
};
