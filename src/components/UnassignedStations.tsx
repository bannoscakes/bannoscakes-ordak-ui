import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchUnassignedCounts } from "@/lib/queue.data";

interface UnassignedStationsProps {
  store: "bannos" | "flourlane";
}

interface Station {
  name: string;
  count: number;
  color: string;
}

const getColorClasses = (color: string) => {
  const colorMap = {
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      icon: "text-blue-500"
    },
    purple: {
      bg: "bg-purple-50", 
      border: "border-purple-200",
      text: "text-purple-700",
      icon: "text-purple-500"
    },
    pink: {
      bg: "bg-pink-50",
      border: "border-pink-200", 
      text: "text-pink-700",
      icon: "text-pink-500"
    },
    orange: {
      bg: "bg-orange-50",
      border: "border-orange-200",
      text: "text-orange-700", 
      icon: "text-orange-500"
    }
  };
  return colorMap[color as keyof typeof colorMap];
};

export function UnassignedStations({ store }: UnassignedStationsProps) {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUnassigned, setTotalUnassigned] = useState(0);

  useEffect(() => {
    async function loadUnassignedCounts() {
      setLoading(true);
      try {
        const data = await fetchUnassignedCounts(store);
        
        // Transform the RPC data to our expected format
        const counts = {
          filling: data.find(d => d.stage === 'Filling_pending')?.count || 0,
          covering: data.find(d => d.stage === 'Covering_pending')?.count || 0,
          decorating: data.find(d => d.stage === 'Decorating_pending')?.count || 0,
          // Packing should reflect UNASSIGNED work → use pending (or normalized "packing")
          packing: data.find(d => d.stage === 'Packing_pending')?.count || 0
        };
        
        const stationData: Station[] = [
          {
            name: "Filling Unassigned",
            count: counts.filling,
            color: "blue"
          },
          {
            name: "Covering Unassigned", 
            count: counts.covering,
            color: "purple"
          },
          {
            name: "Decoration Unassigned",
            count: counts.decorating,
            color: "pink"
          },
          {
            name: "Packing Unassigned",
            count: counts.packing,
            color: "orange"
          }
        ];
        
        setStations(stationData);
        setTotalUnassigned(stationData.reduce((total, station) => total + station.count, 0));
      } catch (error) {
        console.error("Failed to load unassigned counts:", error);
        // Set default empty stations on error
        setStations([
          { name: "Filling Unassigned", count: 0, color: "blue" },
          { name: "Covering Unassigned", count: 0, color: "purple" },
          { name: "Decoration Unassigned", count: 0, color: "pink" },
          { name: "Packing Unassigned", count: 0, color: "orange" }
        ]);
        setTotalUnassigned(0);
      } finally {
        setLoading(false);
      }
    }
    
    loadUnassignedCounts();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadUnassignedCounts, 30000);
    return () => clearInterval(interval);
  }, [store]);

  if (loading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium text-foreground text-base">
            Unassigned Tasks - {store === "bannos" ? "Bannos" : "Flourlane"}
          </h3>
          <p className="text-sm text-muted-foreground">Tasks waiting for staff assignment</p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {totalUnassigned} total
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {stations.map((station, index) => {
          const colors = getColorClasses(station.color);
          
          return (
            <div key={index} className={`p-3 border-2 ${colors.border} ${colors.bg} rounded-lg hover:shadow-sm transition-all duration-200`}>
              <div className="flex items-center justify-between mb-2">
                <UserX className={`h-4 w-4 ${colors.icon}`} />
                <span className={`text-sm font-medium ${colors.text}`}>{station.count}</span>
              </div>
              <div>
                <h4 className={`text-sm font-medium ${colors.text}`}>{station.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {station.count > 0 ? "Awaiting assignment" : "All assigned"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}