import { Users, Clock, MapPin, Phone } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { useEffect, useState } from "react";
import { getStaffList, type StaffMember } from "../lib/rpc-client";

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

  // TODO: Replace with actual shift status when shift tracking is implemented
  // For now, use account status as a placeholder
  const activeStaffCount = staffData.filter(staff => staff.is_active).length;
  
  // Placeholder values until shift tracking is implemented
  const onShiftCount = Math.floor(activeStaffCount * 0.7); // Estimate 70% of active staff are on shift
  const onBreakCount = Math.floor(activeStaffCount * 0.1); // Estimate 10% on break
  const offShiftCount = activeStaffCount - onShiftCount - onBreakCount;

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
        {staffData.map((staff) => (
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