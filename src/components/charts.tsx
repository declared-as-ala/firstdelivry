"use client"

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line, CartesianGrid, Legend,
} from "recharts"

export const COLORS = {
  blue: "#2563eb",
  green: "#16a34a",
  orange: "#ea580c",
  red: "#dc2626",
  gray: "#94a3b8",
  indigo: "#4f46e5",
}

// map a status key to a tone color
export function keyColor(key?: string): string {
  switch (key) {
    case "DELIVERED": case "PAID_BY_NAVEX": return COLORS.green
    case "IN_TRANSIT": case "OUT_FOR_DELIVERY": return COLORS.blue
    case "PENDING": case "COD_EXPECTED": return COLORS.gray
    case "RETURN": case "DELIVERED_UNPAID": return COLORS.orange
    case "UNKNOWN": case "PAYMENT_DISPUTE": return COLORS.red
    default: return COLORS.blue
  }
}

export function ChartCard({ title, subtitle, children, right }: { title: string; subtitle?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

const tooltipStyle = { fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }

// Single-series bar; color per item via item.color or keyColor(item.key); optional click
export function SingleBar({ data, height = 240, onClick }: {
  data: { name: string; value: number; key?: string; color?: string }[]
  height?: number
  onClick?: (d: any) => void
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "#475569" }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20} onClick={onClick} cursor={onClick ? "pointer" : undefined}>
          {data.map((d, i) => <Cell key={i} fill={d.color || keyColor(d.key)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Grouped bars (e.g. expected vs scanned vs missing per lot)
export function GroupedBar({ data, series, height = 260, onBarClick, xKey = "name" }: {
  data: any[]
  series: { key: string; name: string; color: string }[]
  height?: number
  onBarClick?: (d: any) => void
  xKey?: string
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 0, right: 8 }}>
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "#475569" }} interval={0} angle={-15} textAnchor="end" height={50} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[3, 3, 0, 0]} onClick={onBarClick} cursor={onBarClick ? "pointer" : undefined} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

function fmtDT(n: number) {
  return `${(n || 0).toFixed(3).replace(/\.?0+$/, "")} DT`
}
function AgingTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-slate-800">{d.name}</p>
      <p className="text-slate-600">{d.value} colis</p>
      <p className="text-red-600 font-medium">{fmtDT(d.cod)} à risque</p>
    </div>
  )
}

/** Horizontal aging bars for "à vérifier" parcels, with a count + COD tooltip. */
export function AgingBar({ data, height = 220 }: { data: { name: string; value: number; cod: number; color: string }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 20 }}>
        <CartesianGrid horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11, fill: "#475569" }} />
        <Tooltip content={<AgingTooltip />} cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24} label={{ position: "right", fontSize: 11, fill: "#64748b" }}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function Donut({ data, centerLabel, height = 240 }: {
  data: { name: string; value: number; key?: string; color?: string }[]
  centerLabel?: string | number
  height?: number
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
            {data.map((d, i) => <Cell key={i} fill={d.color || keyColor(d.key)} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: -28 }}>
        <span className="text-2xl font-bold text-slate-900 tabular-nums">{centerLabel ?? total}</span>
        <span className="text-[10px] uppercase tracking-wide text-slate-400">total</span>
      </div>
    </div>
  )
}

export function MiniLine({ data, xKey, yKey, height = 200 }: { data: any[]; xKey: string; yKey: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: 0, right: 8 }}>
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#475569" }} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey={yKey} stroke={COLORS.blue} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
