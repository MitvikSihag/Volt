import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockActivities } from "@/lib/mock-data";
import { formatDuration, formatDistance, formatPace, formatDate } from "@/lib/utils";
import { ArrowLeft, MapPin, Heart, Flame, Mountain, TrendingUp, Clock } from "lucide-react";
import { ActivityMap } from "@/components/activity-map";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activity = mockActivities.find((a) => a.id === id);
  if (!activity) notFound();

  const pace = activity.durationSeconds / (activity.distanceMeters / 1000);

  const stats = [
    { label: "Distance", value: formatDistance(activity.distanceMeters), icon: MapPin },
    { label: "Duration", value: formatDuration(activity.durationSeconds), icon: Clock },
    { label: "Pace", value: formatPace(pace), icon: TrendingUp },
    { label: "Elevation", value: `+${activity.elevationGainMeters}m`, icon: Mountain },
    ...(activity.averageHeartRate ? [{ label: "Avg HR", value: `${activity.averageHeartRate} bpm`, icon: Heart }] : []),
    ...(activity.maxHeartRate ? [{ label: "Max HR", value: `${activity.maxHeartRate} bpm`, icon: Heart }] : []),
    ...(activity.calories ? [{ label: "Calories", value: `${activity.calories} kcal`, icon: Flame }] : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/activities" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to activities
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">{activity.name}</h1>
            <p className="text-sm text-[var(--color-text-muted)]">{formatDate(activity.startedAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="blue">{activity.type}</Badge>
            {activity.kudosCount > 0 && (
              <span className="text-sm text-[var(--color-text-muted)]">⚡ {activity.kudosCount}</span>
            )}
          </div>
        </div>
      </div>

      {/* Map placeholder */}
      <ActivityMap />

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="text-center py-4">
            <Icon className="w-4 h-4 text-[var(--color-accent)] mx-auto mb-2" />
            <div className="text-lg font-bold text-[var(--color-text)]">{value}</div>
            <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
          </Card>
        ))}
      </div>

      {/* Laps */}
      {activity.laps.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Splits</CardTitle></CardHeader>
          <CardContent>
            <div className="bg-[var(--color-surface-2)] rounded-[var(--radius-md)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)]">Lap</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)]">Distance</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)]">Time</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)]">Pace</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)]">Elevation</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.laps.map((lap, i) => {
                    const lapPace = lap.durationSeconds / (lap.distanceMeters / 1000);
                    const isFirst = i === 0;
                    const prevPace = i > 0 ? activity.laps[i - 1].durationSeconds / (activity.laps[i - 1].distanceMeters / 1000) : lapPace;
                    const faster = !isFirst && lapPace < prevPace;
                    return (
                      <tr key={lap.number} className={i < activity.laps.length - 1 ? "border-b border-[var(--color-border-subtle)]" : ""}>
                        <td className="px-4 py-3 text-[var(--color-text-muted)]">{lap.number}</td>
                        <td className="px-4 py-3 text-[var(--color-text)]">{formatDistance(lap.distanceMeters)}</td>
                        <td className="px-4 py-3 text-[var(--color-text)]">{formatDuration(lap.durationSeconds)}</td>
                        <td className={`px-4 py-3 font-medium ${faster ? "text-[var(--color-green)]" : "text-[var(--color-text)]"}`}>
                          {formatPace(lapPace)}
                        </td>
                        <td className="px-4 py-3 text-[var(--color-text-muted)]">+{lap.elevationGain}m</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
