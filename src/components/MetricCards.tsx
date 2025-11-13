import { TrendingUp, CheckCircle, Clock, Zap } from "lucide-react";
import { Card } from "./ui/card";
import { useEffect, useState } from "react";
import { getQueueStats } from "../lib/rpc-client";

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

export function MetricCards({ store }: MetricCardsProps) {
  // TODO: Replace with real metrics data from API
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, [store]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      
      // Fetch real stats from Supabase
      const stats = await getQueueStats(store);
      
      if (stats) {
        const metricsData: Metric[] = [
          {
            title: "Total Orders",
            value: stats.total_orders?.toString() || "0",
            subtitle: `${stats.unassigned_orders || 0} unassigned`,
            icon: TrendingUp,
            bg: "bg-blue-50",
            iconColor: "text-blue-600"
          },
          {
            title: "Completed",
            value: stats.completed_orders?.toString() || "0",
            subtitle: `${stats.high_priority_count || 0} high priority`,
            icon: CheckCircle,
            bg: "bg-green-50",
            iconColor: "text-green-600"
          },
          {
            title: "In Production",
            value: ((stats.filling_count || 0) + (stats.covering_count || 0) + (stats.decorating_count || 0) + (stats.packing_count || 0)).toString(),
            subtitle: `${stats.overdue_count || 0} overdue`,
            icon: Clock,
            bg: "bg-orange-50",
            iconColor: "text-orange-600"
          },
          {
            title: "By Stage",
            value: `${stats.filling_count || 0}/${stats.decorating_count || 0}`,
            subtitle: "Filling/Decorating",
            icon: Zap,
            bg: "bg-purple-50",
            iconColor: "text-purple-600"
          }
        ];
        
        setMetrics(metricsData);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      setMetrics([]); // Will show default metrics
    } finally {
      setLoading(false);
    }
  };

  // Default metric structure for when no data is available
  const defaultMetrics: Metric[] = [
    {
      title: "Total Orders",
      value: "0",
      subtitle: "No data available",
      icon: TrendingUp,
      bg: "bg-blue-50",
      iconColor: "text-blue-600"
    },
    {
      title: "Completed Today",
      value: "0",
      subtitle: "No data available", 
      icon: CheckCircle,
      bg: "bg-green-50",
      iconColor: "text-green-600"
    },
    {
      title: "In Production",
      value: "0",
      subtitle: "No data available",
      icon: Clock,
      bg: "bg-orange-50",
      iconColor: "text-orange-600"
    },
    {
      title: "Quality Score",
      value: "0%",
      subtitle: "No data available",
      icon: Zap,
      bg: "bg-purple-50",
      iconColor: "text-purple-600"
    }
  ];

  const displayMetrics = metrics.length > 0 ? metrics : defaultMetrics;

  if (loading) {
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
        <Card key={index} className="p-6">
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