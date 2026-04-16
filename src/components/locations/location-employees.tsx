"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Camera,
  X,
  Users,
} from "lucide-react";
import type { SiteEmployeeAttendance } from "@/lib/validations/attendance";

const STATUS = {
  checked_in: { dot: "bg-emerald-500", label: "Online", text: "text-emerald-600" },
  checked_out: { dot: "bg-blue-500", label: "Clocked Out", text: "text-blue-600" },
  not_yet: { dot: "bg-slate-300", label: "Not Yet", text: "text-slate-500" },
} as const;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function elapsed(clockIn: string) {
  const mins = Math.round((Date.now() - new Date(clockIn).getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

interface Props {
  employees: SiteEmployeeAttendance[];
  locationName: string;
  locationCity: string;
}

export function LocationEmployees({ employees, locationName, locationCity }: Props) {
  const [enlargedPhoto, setEnlargedPhoto] = useState<{ url: string; name: string } | null>(null);

  const online = employees.filter((e) => e.status === "checked_in").length;
  const total = employees.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/dashboard/locations"
          className="mt-1 flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground sm:text-2xl">
            {locationName}
          </h1>
          <p className="text-sm text-muted-foreground">{locationCity}</p>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
          <Users className="size-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {online} / {total} online
          </p>
          <p className="text-xs text-muted-foreground">
            {total - online - employees.filter(e => e.status === "checked_out").length} not clocked in
          </p>
        </div>
      </div>

      {/* Employee list */}
      <div className="space-y-3">
        {employees.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border">
            <p className="text-sm text-muted-foreground">No employees at this location</p>
          </div>
        ) : (
          employees.map((emp) => {
            const s = STATUS[emp.status];
            return (
              <div
                key={emp.employee_id}
                className="rounded-xl border border-border bg-card p-4 ring-1 ring-foreground/5"
              >
                {/* Top row: name + status */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Photo or status dot */}
                    {emp.clock_in_photo_url ? (
                      <button
                        onClick={() =>
                          setEnlargedPhoto({
                            url: emp.clock_in_photo_url!,
                            name: emp.full_name,
                          })
                        }
                        className="relative size-11 shrink-0 overflow-hidden rounded-full border-2 border-border transition-all hover:ring-2 hover:ring-primary/40"
                      >
                        <img
                          src={emp.clock_in_photo_url}
                          alt={emp.full_name}
                          className="size-full object-cover"
                        />
                        <span
                          className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-card ${s.dot}`}
                        />
                      </button>
                    ) : (
                      <div className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                        {emp.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                        <span
                          className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-card ${s.dot}`}
                        />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {emp.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {emp.employee_number}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.text} bg-current/10`}
                    style={{
                      backgroundColor:
                        emp.status === "checked_in"
                          ? "rgba(16,185,129,0.1)"
                          : emp.status === "checked_out"
                          ? "rgba(59,130,246,0.1)"
                          : "rgba(148,163,184,0.1)",
                    }}
                  >
                    {s.label}
                  </span>
                </div>

                {/* Detail row — only if clocked in/out */}
                {emp.status !== "not_yet" && emp.clock_in && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                    {/* Time */}
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatTime(emp.clock_in)}
                      {emp.clock_out
                        ? ` — ${formatTime(emp.clock_out)}`
                        : ` (${elapsed(emp.clock_in)})`}
                    </span>

                    {/* GPS location */}
                    {emp.clock_in_lat && emp.clock_in_lng && (
                      <a
                        href={`https://www.google.com/maps?q=${emp.clock_in_lat},${emp.clock_in_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <MapPin className="size-3" />
                        View Location
                      </a>
                    )}

                    {/* Photo button */}
                    {emp.clock_in_photo_url && (
                      <button
                        onClick={() =>
                          setEnlargedPhoto({
                            url: emp.clock_in_photo_url!,
                            name: emp.full_name,
                          })
                        }
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <Camera className="size-3" />
                        View Photo
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Enlarged photo overlay */}
      {enlargedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200"
          onClick={() => setEnlargedPhoto(null)}
        >
          <div
            className="relative max-h-[80vh] max-w-lg overflow-hidden rounded-2xl bg-card shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Camera className="size-4 text-primary" />
                {enlargedPhoto.name} — Clock-in Photo
              </div>
              <button
                onClick={() => setEnlargedPhoto(null)}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            <img
              src={enlargedPhoto.url}
              alt={`${enlargedPhoto.name} clock-in photo`}
              className="w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
