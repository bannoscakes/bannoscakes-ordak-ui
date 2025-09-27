import { Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

interface ProductionTimelineProps {
  store: "bannos" | "flourlane";
}

const storeTimelines = {
  bannos: [
    {
      time: "09:00 AM",
      title: "Filling Station Start",
      description: "Chocolate Cupcakes - BAN-001",
      status: "completed",
      type: "production"
    },
    {
      time: "10:30 AM", 
      title: "Quality Check",
      description: "Wedding Cake - BAN-003",
      status: "current",
      type: "quality"
    },
    {
      time: "12:00 PM",
      title: "Lunch Break",
      description: "All stations pause",
      status: "upcoming",
      type: "break"
    },
    {
      time: "01:30 PM",
      title: "Covering Phase",
      description: "Vanilla Cake - BAN-002",
      status: "upcoming",
      type: "production"
    },
    {
      time: "03:00 PM",
      title: "Decoration Start",
      description: "Birthday Cupcakes - BAN-005",
      status: "upcoming",
      type: "production"
    },
    {
      time: "04:30 PM",
      title: "Final Inspection",
      description: "Daily quality review",
      status: "upcoming",
      type: "quality"
    }
  ],
  flourlane: [
    {
      time: "06:00 AM",
      title: "Dough Prep Start",
      description: "Sourdough Rolls - FLR-002",
      status: "completed",  
      type: "production"
    },
    {
      time: "08:30 AM",
      title: "First Bake Cycle",
      description: "Artisan Bread - FLR-001",
      status: "current",
      type: "production"
    },
    {
      time: "10:00 AM",
      title: "Quality Testing",
      description: "Whole Wheat batch check",
      status: "upcoming",
      type: "quality"
    },
    {
      time: "12:00 PM",
      title: "Lunch Break",
      description: "All ovens on hold",
      status: "upcoming",
      type: "break"
    },
    {
      time: "01:00 PM",
      title: "Afternoon Bake",
      description: "French Baguettes - FLR-004",
      status: "upcoming",
      type: "production"
    },
    {
      time: "03:30 PM",
      title: "Gluten-Free Prep",
      description: "Muffin preparation - FLR-005",
      status: "upcoming",
      type: "production"
    }
  ]
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "current":
      return <Clock className="h-4 w-4 text-blue-600" />;
    case "upcoming":
      return <AlertCircle className="h-4 w-4 text-gray-400" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-50 border-green-200";
    case "current":
      return "bg-blue-50 border-blue-200";
    case "upcoming":
      return "bg-gray-50 border-gray-200";
    default:
      return "bg-gray-50 border-gray-200";
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case "production":
      return "bg-blue-100 text-blue-700";
    case "quality":
      return "bg-orange-100 text-orange-700";
    case "break":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export function ProductionTimeline({ store }: ProductionTimelineProps) {
  const timelineEvents = storeTimelines[store];

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="font-medium text-foreground">
          Today's Schedule - {store === "bannos" ? "Bannos" : "Flourlane"}
        </h3>
        <p className="text-sm text-muted-foreground">Production timeline and milestones</p>
      </div>

      <div className="space-y-4">
        {timelineEvents.map((event, index) => (
          <div key={index} className={`flex items-start space-x-3 p-3 rounded-lg border ${getStatusColor(event.status)} transition-colors`}>
            <div className="flex-shrink-0 mt-0.5">
              {getStatusIcon(event.status)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-foreground">{event.time}</p>
                <Badge className={`text-xs ${getTypeColor(event.type)}`}>
                  {event.type}
                </Badge>
              </div>
              <p className="font-medium text-foreground">{event.title}</p>
              <p className="text-sm text-muted-foreground">{event.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span className="text-muted-foreground">Completed</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3 text-blue-600" />
              <span className="text-muted-foreground">Current</span>
            </div>
            <div className="flex items-center space-x-1">
              <AlertCircle className="h-3 w-3 text-gray-400" />
              <span className="text-muted-foreground">Upcoming</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}