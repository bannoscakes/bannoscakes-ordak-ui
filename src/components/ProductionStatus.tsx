import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { useMemo } from "react";
import { useQueueStats } from "../hooks/useDashboardQueries";
import { getStageColorParts, getStageProgressColor } from "../lib/stage-colors";

interface ProductionStatusProps {
  store: "bannos" | "flourlane";
}

const storeProductionData = {
  bannos: {
    systemStatus: "All Systems Operational",
    systemStatusColor: "bg-success/15 text-success border-success/30",
    stations: [
      {
        name: "Filling",
        count: 45,
        status: "Active",
        progress: 92,
        color: "blue",
        todayTarget: 50,
        weekTarget: 350,
        efficiency: "92%"
      },
      {
        name: "Covering", 
        count: 38,
        status: "Active",
        progress: 88,
        color: "purple",
        todayTarget: 45,
        weekTarget: 315,
        efficiency: "88%"
      },
      {
        name: "Decoration",
        count: 32, 
        status: "Active",
        progress: 94,
        color: "pink",
        todayTarget: 35,
        weekTarget: 245,
        efficiency: "94%"
      },
      {
        name: "Packing",
        count: 28,
        status: "Active", 
        progress: 85,
        color: "orange",
        todayTarget: 40,
        weekTarget: 280,
        efficiency: "85%"
      }
    ]
  },
  flourlane: {
    systemStatus: "All Systems Operational",
    systemStatusColor: "bg-success/15 text-success border-success/30",
    stations: [
      {
        name: "Filling",
        count: 22,
        status: "Active",
        progress: 89,
        color: "blue",
        todayTarget: 25,
        weekTarget: 175,
        efficiency: "89%"
      },
      {
        name: "Covering", 
        count: 18,
        status: "Active",
        progress: 75,
        color: "purple",
        todayTarget: 24,
        weekTarget: 168,
        efficiency: "75%"
      },
      {
        name: "Decoration",
        count: 15, 
        status: "Active",
        progress: 62,
        color: "pink",
        todayTarget: 22,
        weekTarget: 154,
        efficiency: "62%"
      },
      {
        name: "Packing",
        count: 12,
        status: "Active", 
        progress: 85,
        color: "orange",
        todayTarget: 20,
        weekTarget: 140,
        efficiency: "85%"
      }
    ]
  }
};

// Map color names to stage names (used by storeProductionData)
const colorToStage: Record<string, string> = {
  blue: "Filling",
  purple: "Covering",
  pink: "Decorating",
  orange: "Packing"
};

const getColorClasses = (color: string) => {
  const stageName = colorToStage[color];

  if (!stageName) {
    return {
      text: "text-gray-700 dark:text-gray-300",
      progress: "bg-gray-500"
    };
  }

  const baseParts = getStageColorParts(stageName);
  return {
    text: baseParts.text,
    progress: getStageProgressColor(stageName)
  };
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Active":
      return "bg-success/15 text-success border-success/30";
    case "Maintenance":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "Warning":
      return "bg-warning/15 text-warning border-warning/30";
    case "Idle":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

export function ProductionStatus({ store }: ProductionStatusProps) {
  const { data: stats, isLoading } = useQueueStats(store);

  // Transform stats to store data format with real counts
  const storeData = useMemo(() => {
    const baseData = storeProductionData[store];
    
    if (!stats) return baseData;
    
    return {
      ...baseData,
      stations: baseData.stations.map(station => {
        let count = 0;
        switch (station.name) {
          case 'Filling':
            count = Number(stats.filling_count) || 0;
            break;
          case 'Covering':
            count = Number(stats.covering_count) || 0;
            break;
          case 'Decoration':
            count = Number(stats.decorating_count) || 0;
            break;
          case 'Packing':
            count = Number(stats.packing_count) || 0;
            break;
        }
        return { ...station, count };
      })
    };
  }, [store, stats]);

  // Only show skeleton on initial load, not on refetch
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-medium text-foreground">
            Production Status - {store === "bannos" ? "Bannos" : "Flourlane"}
          </h3>
          <p className="text-sm text-muted-foreground">Real-time station performance</p>
        </div>
        <Badge className={storeData.systemStatusColor}>
          {storeData.systemStatus}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {storeData.stations.map((station, index) => {
          const colors = getColorClasses(station.color);
          
          return (
            <div key={index} className={`p-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 bg-white/70 dark:bg-gray-900/80 md:backdrop-blur-md border border-white/20`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className={`font-medium ${colors.text}`}>{station.name}</h4>
                  <Badge className={getStatusColor(station.status)}>
                    {station.status}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-end space-x-2">
                    <span className="text-3xl font-semibold text-foreground">{station.count}</span>
                    <span className="text-sm text-muted-foreground pb-1">units</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className={`font-medium ${colors.text}`}>{station.efficiency}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${colors.progress}`}
                        style={{ width: `${station.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-border">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <div>
                      <span className="block font-medium text-foreground">{station.todayTarget}</span>
                      <span>Today</span>
                    </div>
                    <div className="text-right">
                      <span className="block font-medium text-foreground">{station.weekTarget}</span>
                      <span>This Week</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}