"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Clock, FileCheck2, TrendingUp, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const METRICS = [
  {
    label: "Avg. documentation time per note",
    value: "4.5 min",
    delta: "-8.2 min vs. manual charting",
    icon: Clock,
  },
  {
    label: "Coding accuracy on AI-suggested claims",
    value: "+14%",
    delta: "fewer denials on first submission",
    icon: FileCheck2,
  },
  {
    label: "Est. monthly revenue recovered",
    value: "$42,300",
    delta: "from reduced denials & faster billing",
    icon: TrendingUp,
  },
  {
    label: "Provider hours saved per week",
    value: "6.5 hrs",
    delta: "across a 5-provider practice",
    icon: Users,
  },
];

const CHART_DATA = [
  { metric: "Time per note (min)", Before: 12.7, After: 4.5 },
  { metric: "Denied claims / month", Before: 38, After: 21 },
  { metric: "Days to claim submission", Before: 5.1, After: 2.3 },
];

export default function RoiDashboardPage() {
  return (
    <div className="p-6">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Revenue Cycle & ROI</h1>
        <Badge tone="amber">Illustrative sample data</Badge>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        Figures below are illustrative estimates for demo purposes, not measured results from
        this environment.
      </p>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((m) => (
          <Card key={m.label}>
            <m.icon className="mb-2 text-blue-600" size={18} />
            <p className="text-2xl font-semibold text-slate-900">{m.value}</p>
            <p className="mt-1 text-xs font-medium text-slate-700">{m.label}</p>
            <p className="mt-0.5 text-xs text-slate-400">{m.delta}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Before vs. after Meridian</h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={CHART_DATA} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="metric" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Before" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="After" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
