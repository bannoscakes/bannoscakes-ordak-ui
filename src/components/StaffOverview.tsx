import { Users, Clock, MapPin, Phone, Package } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { useMemo } from "react";
import { useStaffWithShiftStatus, useStaffOrderCounts } from "../hooks/useDashboardQueries";

const getStatusColor = (status: string) => {
  switch (status) {
    case "On Shift":
      return "bg-success/15 text-success border-success/30";
    case "On Break":
      return "bg-warning/15 text-warning border-warning/30";
    case "Off Shift":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

const getRoleAvatarColor = (role: string) => {
  switch (role) {
    case "Admin":
      return "bg-orange-500 text-white";
    case "Supervisor":
      return "bg-pink-500 text-white";
    case "Staff":
    default:
      return "bg-green-500 text-white";
  }
};

export function StaffOverview() {
  const { data: staffData, isLoading: staffLoading, isError: staffError } = useStaffWithShiftStatus();
  const { data: orderCountsData, isLoading: countsLoading, isError: countsError } = useStaffOrderCounts();

  // Create lookup map for order counts
  const orderCounts = useMemo(() => {
    if (!orderCountsData) return new Map<string, number>();
    return new Map(orderCountsData.map(c => [c.user_id, c.order_count]));
  }, [orderCountsData]);

  const isLoading = staffLoading || countsLoading;

  if (isLoading) {
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

  if (staffError || countsError) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <p>Failed to load {staffError ? 'staff information' : 'order counts'}</p>
        </div>
      </Card>
    );
  }

  const staff = staffData || [];

  // Calculate counts from real shift data
  const onShiftCount = staff.filter(s => s.shift_status === 'On Shift').length;
  const onBreakCount = staff.filter(s => s.shift_status === 'On Break').length;
  const offShiftCount = staff.filter(s => s.shift_status === 'Off Shift').length;

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
          <p className="text-lg font-semibold text-success">{onShiftCount}</p>
          <p className="text-xs text-muted-foreground">On Shift</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-warning">{onBreakCount}</p>
          <p className="text-xs text-muted-foreground">On Break</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-muted-foreground">{offShiftCount}</p>
          <p className="text-xs text-muted-foreground">Off Shift</p>
        </div>
      </div>

      <div className="space-y-4">
        {staff.map((member) => (
          <div key={member.user_id} className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Avatar className={`h-10 w-10 flex items-center justify-center ${getRoleAvatarColor(member.role)}`}>
                  <span className="text-sm font-medium">{member.full_name.charAt(0)}</span>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{member.full_name}</p>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{orderCounts.get(member.user_id) || 0}</span>
                </div>
                <Badge className={getStatusColor(member.shift_status)}>
                  {member.shift_status}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{member.shift_store || member.store || 'No store assigned'}</span>
              </div>
              {member.phone && (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{member.phone}</span>
                </div>
              )}
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {member.shift_start
                    ? `Started ${new Date(member.shift_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Not clocked in'}
                </span>
              </div>
              {member.email && (
                <div className="text-muted-foreground">
                  <span className="font-medium">Email:</span> {member.email}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
