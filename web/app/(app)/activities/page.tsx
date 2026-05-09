import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockActivities } from "@/lib/mock-data";
import { formatDuration, formatDistance, formatPace, formatRelative } from "@/lib/utils";
import { MapPin, Heart, Flame, TrendingUp, Mountain } from "lucide-react";

export const metadata: Metadata = { title: "Activities" };

const activityIcon: Record<string, string> = { run: "🏃", ride: "🚴", hike: "🥾", walk: "🚶", swim: "🏊" };
const activityColor: Record<string, string> = {
  run: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ride: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  hike: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  walk: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  swim: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

export default function ActivitiesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Activities</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">{mockActivities.length} activities recorded</p>
      </div>

      <div className="flex flex-col gap-4">
        {mockActivities.map((activity) => {
          const pace = activity.durationSeconds / (activity.distanceMeters / 1000);
          return (
            <Link key={activity.id} href={`/activities/${activity.id}`}>
              <Card className="hover:border-blue-500/30 transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center text-xl border ${activityColor[activity.type]}`}>
                      {activityIcon[activity.type]}
                    </div>
                    <div>
                      <h2 className="font-semibold text-[var(--color-text)]">{activity.name}</h2>
                      <p className="text-xs text-[var(--color-text-muted)]">{formatRelative(activity.startedAt)}</p>
                    </div>
                  </div>
                  <Badge variant="blue">{activity.type}</Badge>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[var(--color-surface-2)] rounded-[var(--radius-md)] p-3 text-center">
                    <MapPin className="w-3.5 h-3.5 text-[var(--color-text-muted)] mx-auto mb-1" />
                    <div className="text-base font-bold text-[var(--color-text)]">{formatDistance(activity.distanceMeters)}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">Distance</div>
                  </div>
                  <div className="bg-[var(--color-surface-2)] rounded-[var(--radius-md)] p-3 text-center">
                    <TrendingUp className="w-3.5 h-3.5 text-[var(--color-text-muted)] mx-auto mb-1" />
                    <div className="text-base font-bold text-[var(--color-text)]">{formatDuration(activity.durationSeconds)}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">Duration</div>
                  </div>
                  {activity.averageHeartRate && (
                    <div className="bg-[var(--color-surface-2)] rounded-[var(--radius-md)] p-3 text-center">
                      <Heart className="w-3.5 h-3.5 text-red-400 mx-auto mb-1" />
                      <div className="text-base font-bold text-[var(--color-text)]">{activity.averageHeartRate} bpm</div>
                      <div className="text-xs text-[var(--color-text-muted)]">Avg HR</div>
                    </div>
                  )}
                  {activity.calories && (
                    <div className="bg-[var(--color-surface-2)] rounded-[var(--radius-md)] p-3 text-center">
                      <Flame className="w-3.5 h-3.5 text-orange-400 mx-auto mb-1" />
                      <div className="text-base font-bold text-[var(--color-text)]">{activity.calories} kcal</div>
                      <div className="text-xs text-[var(--color-text-muted)]">Calories</div>
                    </div>
                  )}
                </div>

                {/* Pace + elevation footer */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--color-border)]">
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Pace: <span className="text-[var(--color-text)] font-medium">{formatPace(pace)}</span>
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Elevation: <span className="text-[var(--color-text)] font-medium">+{activity.elevationGainMeters}m</span>
                  </span>
                  {activity.kudosCount > 0 && (
                    <span className="text-xs text-[var(--color-text-muted)] ml-auto">
                      ⚡ {activity.kudosCount} kudos
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
