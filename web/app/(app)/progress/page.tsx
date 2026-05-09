"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { mockVolumeData, mockProgressData } from "@/lib/mock-data";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const ACCENT = "#F97316";
const BLUE = "#3B82F6";
const GREEN = "#22C55E";

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1C1C28] border border-[#2A2A3C] rounded-[10px] px-3 py-2 text-xs shadow-xl">
      <p className="text-[#6B7280] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
          {p.name === "volume" ? "kg" : p.name === "workouts" ? "" : "kg"}
        </p>
      ))}
    </div>
  );
}

export default function ProgressPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F0F0F8]">Progress</h1>
        <p className="text-sm text-[#6B7280] mt-1">Your training trends over time</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly volume */}
        <Card>
          <CardHeader><CardTitle>Weekly Volume (kg)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={mockVolumeData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ACCENT} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3C" />
                <XAxis dataKey="week" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="volume" stroke={ACCENT} strokeWidth={2} fill="url(#volumeGrad)" dot={{ fill: ACCENT, r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Workouts per week */}
        <Card>
          <CardHeader><CardTitle>Workouts Per Week</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={mockVolumeData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3C" />
                <XAxis dataKey="week" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="workouts" fill={BLUE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Strength progression */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Strength Progression (1RM estimate, kg)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={mockProgressData} margin={{ top: 4, right: 16, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3C" />
                <XAxis dataKey="date" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
                  formatter={(value) => <span style={{ color: "#9CA3AF" }}>{value}</span>}
                />
                <Line type="monotone" dataKey="squat" stroke={ACCENT} strokeWidth={2} dot={{ fill: ACCENT, r: 4 }} name="squat" />
                <Line type="monotone" dataKey="bench" stroke={BLUE} strokeWidth={2} dot={{ fill: BLUE, r: 4 }} name="bench" />
                <Line type="monotone" dataKey="deadlift" stroke={GREEN} strokeWidth={2} dot={{ fill: GREEN, r: 4 }} name="deadlift" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
