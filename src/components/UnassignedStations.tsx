import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { UserX } from "lucide-react";

interface UnassignedStationsProps {
  store: "bannos" | "flourlane";
}

const storeUnassignedData = {
  bannos: {
    stations: [
      {
        name: "Filling Unassigned",
        count: 3,
        color: "blue"
      },
      {
        name: "Covering Unassigned", 
        count: 2,
        color: "purple"
      },
      {
        name: "Decoration Unassigned",
        count: 1,
        color: "pink"
      },
      {
        name: "Packing Unassigned",
        count: 4,
        color: "orange"
      }
    ]
  },
  flourlane: {
    stations: [
      {
        name: "Filling Unassigned",
        count: 2,
        color: "blue"
      },
      {
        name: "Covering Unassigned", 
        count: 3,
        color: "purple"
      },
      {
        name: "Decoration Unassigned",
        count: 1,
        color: "pink"
      },
      {
        name: "Packing Unassigned",
        count: 2,
        color: "orange"
      }
    ]
  }
};

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
  const storeData = storeUnassignedData[store];

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
          {storeData.stations.reduce((total, station) => total + station.count, 0)} total
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {storeData.stations.map((station, index) => {
          const colors = getColorClasses(station.color);
          
          return (
            <div key={index} className={`p-3 border-2 ${colors.border} ${colors.bg} rounded-lg hover:shadow-sm transition-all duration-200`}>
              <div className="flex items-center justify-between mb-2">
                <UserX className={`h-4 w-4 ${colors.icon}`} />
                <span className={`text-sm font-medium ${colors.text}`}>{station.count}</span>
              </div>
              <div>
                <h4 className={`text-sm font-medium ${colors.text}`}>{station.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">Awaiting assignment</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}