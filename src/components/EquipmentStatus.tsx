import { Wrench, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

interface EquipmentStatusProps {
  store: "bannos" | "flourlane";
}

const storeEquipment = {
  bannos: [
    {
      name: "Cake Mixer Pro",
      status: "operational",
      health: 95,
      lastMaintenance: "Aug 28, 2025",
      nextMaintenance: "Sep 28, 2025",
      hours: 1247
    },
    {
      name: "Dessert Oven A",
      status: "operational", 
      health: 88,
      lastMaintenance: "Aug 25, 2025",
      nextMaintenance: "Sep 25, 2025",
      hours: 2103
    },
    {
      name: "Filling Station",
      status: "warning",
      health: 72,
      lastMaintenance: "Aug 20, 2025", 
      nextMaintenance: "Sep 5, 2025",
      hours: 1856
    },
    {
      name: "Cake Packaging",
      status: "offline",
      health: 45,
      lastMaintenance: "Aug 15, 2025",
      nextMaintenance: "Sep 1, 2025",
      hours: 3024
    }
  ],
  flourlane: [
    {
      name: "Dough Mixer 1",
      status: "operational",
      health: 92,
      lastMaintenance: "Aug 30, 2025",
      nextMaintenance: "Sep 30, 2025",
      hours: 987
    },
    {
      name: "Stone Oven",
      status: "operational", 
      health: 96,
      lastMaintenance: "Aug 27, 2025",
      nextMaintenance: "Sep 27, 2025",
      hours: 1654
    },
    {
      name: "Proofing Cabinet",
      status: "warning",
      health: 68,
      lastMaintenance: "Aug 18, 2025", 
      nextMaintenance: "Sep 3, 2025",
      hours: 2241
    },
    {
      name: "Bread Slicer",
      status: "operational",
      health: 84,
      lastMaintenance: "Aug 22, 2025",
      nextMaintenance: "Sep 22, 2025",
      hours: 1432
    }
  ]
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "operational":
      return <CheckCircle className="h-4 w-4 text-success" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    case "offline":
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "operational":
      return "bg-success/15 text-success border-success/30";
    case "warning":
      return "bg-warning/15 text-warning border-warning/30";
    case "offline":
      return "bg-destructive/15 text-destructive border-destructive/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

const getHealthColor = (health: number) => {
  if (health >= 80) return "bg-success";
  if (health >= 60) return "bg-warning";
  return "bg-destructive";
};

export function EquipmentStatus({ store }: EquipmentStatusProps) {
  const equipment = storeEquipment[store];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-medium text-foreground">
            Equipment Status - {store === "bannos" ? "Bannos" : "Flourlane"}
          </h3>
          <p className="text-sm text-muted-foreground">Machinery health and maintenance</p>
        </div>
        <Wrench className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="space-y-4">
        {equipment.map((item, index) => (
          <div key={index} className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon(item.status)}
                <span className="font-medium text-foreground">{item.name}</span>
              </div>
              <Badge className={getStatusColor(item.status)}>
                {item.status}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Health</span>
                <span className="font-medium text-foreground">{item.health}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${getHealthColor(item.health)}`}
                  style={{ width: `${item.health}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground">Last Service</p>
                <p className="font-medium text-foreground">{item.lastMaintenance}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Next Service</p>
                <p className="font-medium text-foreground">{item.nextMaintenance}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Operating Hours</span>
                <span className="font-medium text-foreground">{item.hours.toLocaleString()}h</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-semibold text-success">
              {equipment.filter(item => item.status === "operational").length}
            </p>
            <p className="text-xs text-muted-foreground">Operational</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-warning">
              {equipment.filter(item => item.status === "warning").length}
            </p>
            <p className="text-xs text-muted-foreground">Warning</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-destructive">
              {equipment.filter(item => item.status === "offline").length}
            </p>
            <p className="text-xs text-muted-foreground">Offline</p>
          </div>
        </div>
      </div>
    </Card>
  );
}