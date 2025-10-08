import { Users, Clock, MapPin, Phone } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { useEffect, useState } from "react";
import { getStaffList, type StaffMember } from "../lib/rpc-client";

// Fallback staff data for both stores
const fallbackStaffData = [
  {
    id: "STF-001",
    name: "Sarah Chen",
    role: "Production Manager",
    status: "On Shift",
    location: "Bannos - Filling Station",
    shiftStart: "6:00 AM",
    shiftEnd: "2:00 PM",
    phone: "+1 (555) 0123",
    avatar: "SC",
    experience: "5 years",
    skills: ["Production Planning", "Quality Control", "Team Leadership"]
  },
  {
    id: "STF-002", 
    name: "Marcus Rodriguez",
    role: "Head Baker",
    status: "On Shift",
    location: "Flourlane - Baking Station",
    shiftStart: "4:00 AM",
    shiftEnd: "12:00 PM",
    phone: "+1 (555) 0124",
    avatar: "MR",
    experience: "8 years",
    skills: ["Artisan Baking", "Recipe Development", "Equipment Operation"]
  },
  {
    id: "STF-003",
    name: "Emma Thompson",
    role: "Decorator",
    status: "On Break",
    location: "Bannos - Decoration Station", 
    shiftStart: "8:00 AM",
    shiftEnd: "4:00 PM",
    phone: "+1 (555) 0125",
    avatar: "ET",
    experience: "3 years",
    skills: ["Cake Decoration", "Artistic Design", "Custom Orders"]
  },
  {
    id: "STF-004",
    name: "David Kim",
    role: "Quality Inspector",
    status: "On Shift",
    location: "Both Stores - Mobile",
    shiftStart: "9:00 AM", 
    shiftEnd: "5:00 PM",
    phone: "+1 (555) 0126",
    avatar: "DK",
    experience: "4 years",
    skills: ["Quality Assurance", "Safety Compliance", "Process Optimization"]
  },
  {
    id: "STF-005",
    name: "Lisa Park",
    role: "Packaging Supervisor",
    status: "Off Shift",
    location: "Both Stores - Packaging",
    shiftStart: "1:00 PM",
    shiftEnd: "9:00 PM", 
    phone: "+1 (555) 0127",
    avatar: "LP",
    experience: "6 years",
    skills: ["Packaging Operations", "Inventory Management", "Logistics"]
  },
  {
    id: "STF-006",
    name: "James Wilson", 
    role: "Maintenance Tech",
    status: "On Call",
    location: "Both Stores - Equipment",
    shiftStart: "On Call",
    shiftEnd: "On Call",
    phone: "+1 (555) 0128", 
    avatar: "JW",
    experience: "7 years",
    skills: ["Equipment Repair", "Preventive Maintenance", "Troubleshooting"]
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "On Shift":
      return "bg-green-100 text-green-700 border-green-200";
    case "On Break":
      return "bg-yellow-100 text-yellow-700 border-yellow-200"; 
    case "Off Shift":
      return "bg-gray-100 text-gray-700 border-gray-200";
    case "On Call":
      return "bg-blue-100 text-blue-700 border-blue-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

export function StaffOverview() {
  const [staffData, setStaffData] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaffData();
  }, []);

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      const staff = await getStaffList(null, true); // Get all active staff
      setStaffData(staff);
    } catch (error) {
      console.error('Failed to fetch staff data:', error);
      // Use empty array if RPC fails
      setStaffData([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-32"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const onShiftCount = staffData.filter(staff => staff.is_active).length;
  const onBreakCount = 0; // TODO: Implement break tracking
  const offShiftCount = staffData.filter(staff => !staff.is_active).length;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-medium text-foreground">Staff Overview</h3>
          <p className="text-sm text-muted-foreground">Shared staff across both stores</p>
        </div>
        <Users className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-lg font-semibold text-green-600">{onShiftCount}</p>
          <p className="text-xs text-muted-foreground">On Shift</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-yellow-600">{onBreakCount}</p>
          <p className="text-xs text-muted-foreground">On Break</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-600">{offShiftCount}</p>
          <p className="text-xs text-muted-foreground">Off Shift</p>
        </div>
      </div>

      <div className="space-y-4">
        {staffData.map((staff, index) => (
          <div key={staff.user_id} className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10 bg-primary text-primary-foreground flex items-center justify-center">
                  <span className="text-sm font-medium">{staff.full_name.charAt(0)}</span>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{staff.full_name}</p>
                  <p className="text-sm text-muted-foreground">{staff.role}</p>
                </div>
              </div>
              <Badge className={getStatusColor(staff.is_active ? "On Shift" : "Off Shift")}>
                {staff.is_active ? "On Shift" : "Off Shift"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Store Location</span>
              </div>
              {staff.phone && (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{staff.phone}</span>
                </div>
              )}
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{staff.is_active ? "Active" : "Inactive"}</span>
              </div>
              {staff.email && (
                <div className="text-muted-foreground">
                  <span className="font-medium">Email:</span> {staff.email}
                </div>
              )}
            </div>

            {staff.role && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Role</p>
                <Badge variant="secondary" className="text-xs">
                  {staff.role}
                </Badge>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}