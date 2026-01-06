import { TrendingUp, CheckCircle, Clock, Zap } from "lucide-react";
import { Card } from "./ui/card";
import { useMemo } from "react";
import { useQueueStats } from "../hooks/useDashboardQueries";

interface MetricCardsProps {
  store: "bannos" | "flourlane";
}

interface Metric {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  bg: string;
  iconColor: string;
}

// Shared color schemes for metric card icons
const METRIC_COLORS = {
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/40",
    iconColor: "text-blue-600 dark:text-blue-400"
  },
  green: {
    bg: "bg-green-100 dark:bg-green-900/40",
    iconColor: "text-green-600 dark:text-green-400"
  },
  orange: {
    bg: "bg-orange-100 dark:bg-orange-900/40",
    iconColor: "text-orange-600 dark:text-orange-400"
  },
  purple: {
    bg: "bg-purple-100 dark:bg-purple-900/40",
    iconColor: "text-purple-600 dark:text-purple-400"
  }
} as const;

export function MetricCards({ store }: MetricCardsProps) {
  const { data: stats, isLoading } = useQueueStats(store);

  // Transform stats to metrics display format
  const metrics = useMemo<Metric[]>(() => {
    if (!stats) return [];

    return [
      {
        title: "Total Orders",
        value: stats.total_orders?.toString() || "0",
        subtitle: `${stats.unassigned_orders || 0} unassigned`,
        icon: TrendingUp,
        ...METRIC_COLORS.blue
      },
      {
        title: "Completed",
        value: stats.completed_orders?.toString() || "0",
        subtitle: stats.total_orders ? `${Math.round(((stats.completed_orders || 0) / stats.total_orders) * 100)}% of total` : "0 orders",
        icon: CheckCircle,
        ...METRIC_COLORS.green
      },
      {
        title: "In Production",
        value: ((stats.filling_count || 0) + (stats.covering_count || 0) + (stats.decorating_count || 0) + (stats.packing_count || 0)).toString(),
        subtitle: `${stats.unassigned_orders || 0} unassigned`,
        icon: Clock,
        ...METRIC_COLORS.orange
      },
      {
        title: "By Stage",
        value: `${stats.filling_count || 0}/${stats.decorating_count || 0}`,
        subtitle: "Filling/Decorating",
        icon: Zap,
        ...METRIC_COLORS.purple
      }
    ];
  }, [stats]);

  // Default metric structure for when no data is available
  const defaultMetrics: Metric[] = [
    {
      title: "Total Orders",
      value: "0",
      subtitle: "No data available",
      icon: TrendingUp,
      ...METRIC_COLORS.blue
    },
    {
      title: "Completed Today",
      value: "0",
      subtitle: "No data available",
      icon: CheckCircle,
      ...METRIC_COLORS.green
    },
    {
      title: "In Production",
      value: "0",
      subtitle: "No data available",
      icon: Clock,
      ...METRIC_COLORS.orange
    },
    {
      title: "Quality Score",
      value: "0%",
      subtitle: "No data available",
      icon: Zap,
      ...METRIC_COLORS.purple
    }
  ];

  const displayMetrics = metrics.length > 0 ? metrics : defaultMetrics;

  // Only show skeleton on initial load, not on refetch
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-8 bg-muted rounded w-16"></div>
                  <div className="h-3 bg-muted rounded w-20"></div>
                </div>
                <div className="w-12 h-12 bg-muted rounded-lg"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {displayMetrics.map((metric, index) => (
        <Card key={index} className="p-6 bg-white/70 dark:bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-muted-foreground">{metric.title}</p>
              <p className="text-2xl">{metric.value}</p>
              <p className="text-xs text-muted-foreground">{metric.subtitle}</p>
            </div>
            <div className={`w-12 h-12 rounded-lg ${metric.bg} flex items-center justify-center`}>
              <metric.icon className={`w-6 h-6 ${metric.iconColor}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}