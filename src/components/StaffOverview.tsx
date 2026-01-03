import { Users, Clock, MapPin, Phone } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { useEffect, useState } from "react";
import { getStaffWithShiftStatus, type StaffWithShiftStatus } from "../lib/rpc-client";

const getStatusColor = (status: string) => {
  switch (status) {
    case "On Shift":
      return "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800";
    case "On Break":
      return "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
    case "Off Shift":
      return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700";
    default:
      return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700";
  }
};

export function StaffOverview() {
  const [staffData, setStaffData] = useState<StaffWithShiftStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaffData();
  }, []);

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      const staff = await getStaffWithShiftStatus();
      setStaffData(staff);
    } catch (error) {
      console.error('Failed to fetch staff data:', error);
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

  // Calculate counts from real shift data
  const onShiftCount = staffData.filter(s => s.shift_status === 'On Shift').length;
  const onBreakCount = staffData.filter(s => s.shift_status === 'On Break').length;
  const offShiftCount = staffData.filter(s => s.shift_status === 'Off Shift').length;

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
              <Badge className={getStatusColor(staff.shift_status)}>
                {staff.shift_status}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{staff.shift_store || staff.store || 'No store assigned'}</span>
              </div>
              {staff.phone && (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{staff.phone}</span>
                </div>
              )}
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {staff.shift_start
                    ? `Started ${new Date(staff.shift_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Not clocked in'}
                </span>
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
