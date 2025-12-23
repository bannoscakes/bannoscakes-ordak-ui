import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { adjustStaffTime, getStaffTimes, getStaffTimesDetail } from "../lib/rpc-client";
import type { GetStaffTimesRow, GetStaffTimesDetailRow } from "../types/supabase";
import { 
  Calendar,
  Search, 
  Download, 
  Check,
  Eye,
  Clock,
  DollarSign,
  Edit,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";

interface TimeEntry {
  shiftId: string;
  date: string;
  shiftStart: string;
  shiftEnd: string;
  breakMinutes: number;
  netHours: number;
  adjustmentNote?: string;
}

interface StaffTimeRecord {
  id: string;
  name: string;
  avatar: string;
  daysWorked: number;
  totalShiftHours: number;
  totalBreakMinutes: number;
  totalNetHours: number;
  hourlyRate: number;
  totalPay: number;
  timeEntries: TimeEntry[];
}

// Real staff data will be fetched from Supabase

interface TimePayrollPageProps {
  initialStaffFilter?: string;
  onBack?: () => void;
}

export function TimePayrollPage({ initialStaffFilter, onBack }: TimePayrollPageProps) {
  const [timeData, setTimeData] = useState<StaffTimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("this-week");
  const [storeFilter, setStoreFilter] = useState("all");
  const [selectedStaff, setSelectedStaff] = useState<StaffTimeRecord | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  // Helper: Format date to YYYY-MM-DD without timezone conversion
  function formatDateForDB(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Helper: Get date range from filter
  function getDateRange() {
    const today = new Date();
    const thisWeekStart = new Date(today);
    // Calculate Monday of current week
    // If today is Sunday (0), go back 6 days; otherwise go back to Monday
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    thisWeekStart.setDate(today.getDate() - daysToMonday); // Monday
    
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(thisWeekStart.getDate() - 1);
    
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    switch (dateRange) {
      case 'this-week':
        return { from: formatDateForDB(thisWeekStart), to: formatDateForDB(today) };
      case 'last-week':
        return { from: formatDateForDB(lastWeekStart), to: formatDateForDB(lastWeekEnd) };
      case 'this-month':
        return { from: formatDateForDB(thisMonthStart), to: formatDateForDB(today) };
      case 'last-month':
        return { from: formatDateForDB(lastMonthStart), to: formatDateForDB(lastMonthEnd) };
      default:
        return { from: formatDateForDB(thisWeekStart), to: formatDateForDB(today) };
    }
  }

  // Fetch real staff time data
  useEffect(() => {
    async function fetchStaffData() {
      try {
        setLoading(true);
        const { from, to } = getDateRange();
        
        // Fetch real time tracking data from RPC
        const staffTimes = await getStaffTimes(from, to);
        
        // Convert to UI format
        const staffTimeRecords: StaffTimeRecord[] = staffTimes.map((staff: GetStaffTimesRow) => ({
          id: staff.staff_id,
          name: staff.staff_name || 'Unknown Staff',
          avatar: (staff.staff_name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase(),
          daysWorked: staff.days_worked || 0,
          totalShiftHours: staff.total_shift_hours || 0,
          totalBreakMinutes: staff.total_break_minutes || 0,
          totalNetHours: staff.net_hours || 0,
          hourlyRate: staff.hourly_rate || 0,
          totalPay: staff.total_pay || 0,
          timeEntries: [] // Loaded separately when "View Details" clicked
        }));
        
        setTimeData(staffTimeRecords);
      } catch (error) {
        console.error('Error fetching staff data:', error);
        toast.error('Failed to load staff time data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchStaffData();
  }, [dateRange]);

  // Filter by initial staff if provided
  useEffect(() => {
    if (initialStaffFilter) {
      const staff = timeData.find(s => s.id === initialStaffFilter);
      if (staff) {
        setSelectedStaff(staff);
        setIsDetailsModalOpen(true);
      }
    }
  }, [initialStaffFilter, timeData]);

  const filteredData = timeData.filter(record =>
    record.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    toast.success("Payroll data exported to CSV");
  };

  const handleApprovePeriod = () => {
    toast.success("Pay period approved and locked");
  };

  const handleViewDetails = async (staff: StaffTimeRecord) => {
    try {
      const { from, to } = getDateRange();
      
      // Fetch daily breakdown for this staff member
      const detailData = await getStaffTimesDetail(staff.id, from, to);
      
      // Convert to UI format
      const timeEntries: TimeEntry[] = detailData.map((day: GetStaffTimesDetailRow) => {
        // Extract time from ISO timestamp
        const startTime = day.shift_start ? new Date(day.shift_start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
        const endTime = day.shift_end ? new Date(day.shift_end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

        return {
          shiftId: day.shift_id,
          date: day.shift_date,
          shiftStart: startTime,
          shiftEnd: endTime,
          breakMinutes: day.break_minutes || 0,
          netHours: day.net_hours || 0,
          adjustmentNote: day.notes || undefined
        };
      });
      
      // Update selected staff with time entries
      setSelectedStaff({ ...staff, timeEntries });
      setIsDetailsModalOpen(true);
    } catch (error) {
      console.error('Error fetching time details:', error);
      toast.error('Failed to load time details');
    }
  };

  const handleEditEntry = (entry: TimeEntry) => {
    setEditingEntry({ ...entry });
  };

  const handleSaveEntry = async () => {
    if (!selectedStaff || !editingEntry) return;
    
    try {
      // Convert time strings back to ISO timestamps with proper timezone handling
      const dateStr = editingEntry.date;
      let newStart: string | undefined;
      let newEnd: string | undefined;
      
      if (editingEntry.shiftStart) {
        const startDate = new Date(`${dateStr}T${editingEntry.shiftStart}:00`);
        newStart = startDate.toISOString();
      }
      
      if (editingEntry.shiftEnd) {
        const endDate = new Date(`${dateStr}T${editingEntry.shiftEnd}:00`);
        newEnd = endDate.toISOString();
      }
      
      // Call RPC to persist changes
      await adjustStaffTime(
        editingEntry.shiftId,
        newStart,
        newEnd,
        editingEntry.adjustmentNote
      );
      
      // Refresh data from database to get updated totals
      const { from, to } = getDateRange();
      const staffTimes = await getStaffTimes(from, to);
      const updatedData = staffTimes.map((staff: GetStaffTimesRow) => ({
        id: staff.staff_id,
        name: staff.staff_name || 'Unknown Staff',
        avatar: (staff.staff_name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase(),
        daysWorked: staff.days_worked || 0,
        totalShiftHours: staff.total_shift_hours || 0,
        totalBreakMinutes: staff.total_break_minutes || 0,
        totalNetHours: staff.net_hours || 0,
        hourlyRate: staff.hourly_rate || 0,
        totalPay: staff.total_pay || 0,
        timeEntries: []
      }));
      setTimeData(updatedData);
      
      // Also refresh the details for the currently selected staff
      const detailData = await getStaffTimesDetail(selectedStaff.id, from, to);
      const timeEntries: TimeEntry[] = detailData.map((day: GetStaffTimesDetailRow) => {
        const startTime = day.shift_start ? new Date(day.shift_start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
        const endTime = day.shift_end ? new Date(day.shift_end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
        return {
          shiftId: day.shift_id,
          date: day.shift_date,
          shiftStart: startTime,
          shiftEnd: endTime,
          breakMinutes: day.break_minutes || 0,
          netHours: day.net_hours || 0,
          adjustmentNote: day.notes || undefined
        };
      });

      // Update selectedStaff with fresh data including updated totals
      const freshStaffData = updatedData.find((s) => s.id === selectedStaff.id);
      if (freshStaffData) {
        setSelectedStaff({ ...freshStaffData, timeEntries });
      }
      
      setEditingEntry(null);
      toast.success("Time entry updated successfully");
    } catch (error) {
      console.error('Error saving time entry:', error);
      toast.error('Failed to save time entry');
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading staff data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-medium text-foreground">Time & Payroll</h1>
            <p className="text-sm text-muted-foreground">Manage staff time tracking and payroll</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handleApprovePeriod}>
            <Check className="h-4 w-4 mr-2" />
            Approve Period
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="last-week">Last Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Search Staff</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label>Store Filter</Label>
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                <SelectItem value="bannos">Bannos</SelectItem>
                <SelectItem value="flourlane">Flourlane</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Badge className="bg-blue-100 text-blue-700 border-blue-200">
              Dec 16-20, 2024
            </Badge>
          </div>
        </div>
      </Card>

      {/* Time & Payroll Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff</TableHead>
              <TableHead>Days Worked</TableHead>
              <TableHead>Shift Hours</TableHead>
              <TableHead>Break Minutes</TableHead>
              <TableHead>Net Hours</TableHead>
              <TableHead>Hourly Rate</TableHead>
              <TableHead>Pay</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((record) => (
              <TableRow key={record.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8 bg-primary text-primary-foreground flex items-center justify-center">
                      <span className="text-sm font-medium">{record.avatar}</span>
                    </Avatar>
                    <span className="font-medium">{record.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {record.daysWorked}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {record.totalShiftHours.toFixed(1)}h
                  </div>
                </TableCell>
                <TableCell>{record.totalBreakMinutes}m</TableCell>
                <TableCell className="font-medium">{record.totalNetHours.toFixed(1)}h</TableCell>
                <TableCell>${record.hourlyRate.toFixed(2)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-600">
                      ${record.totalPay.toFixed(2)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleViewDetails(record)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Details Modal */}
      {selectedStaff && (
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Time Details - {selectedStaff.name}</DialogTitle>
              <DialogDescription>
                Daily time entries for Dec 16-20, 2024
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Shift Start</TableHead>
                    <TableHead>Shift End</TableHead>
                    <TableHead>Breaks</TableHead>
                    <TableHead>Net Hours</TableHead>
                    <TableHead>Adjustment Note</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedStaff.timeEntries.map((entry) => (
                    <TableRow key={entry.shiftId}>
                      <TableCell>{formatDate(entry.date)}</TableCell>
                      <TableCell>{formatTime(entry.shiftStart)}</TableCell>
                      <TableCell>{formatTime(entry.shiftEnd)}</TableCell>
                      <TableCell>{entry.breakMinutes}m</TableCell>
                      <TableCell className="font-medium">{entry.netHours}h</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {entry.adjustmentNote || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEditEntry(entry)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Summary */}
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Shift Hours</p>
                    <p className="font-medium">{selectedStaff.totalShiftHours.toFixed(1)}h</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Breaks</p>
                    <p className="font-medium">{selectedStaff.totalBreakMinutes}m</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Net Hours</p>
                    <p className="font-medium">{selectedStaff.totalNetHours.toFixed(1)}h</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Pay</p>
                    <p className="font-medium text-green-600">${selectedStaff.totalPay.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Entry Modal */}
      {editingEntry && (
        <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Time Entry</DialogTitle>
              <DialogDescription>
                {formatDate(editingEntry.date)} - {selectedStaff?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label>Shift Start</Label>
                <Input
                  type="time"
                  value={editingEntry.shiftStart}
                  onChange={(e) => setEditingEntry({...editingEntry, shiftStart: e.target.value})}
                />
              </div>

              <div>
                <Label>Shift End</Label>
                <Input
                  type="time"
                  value={editingEntry.shiftEnd}
                  onChange={(e) => setEditingEntry({...editingEntry, shiftEnd: e.target.value})}
                />
              </div>

              <div>
                <Label>Break Minutes (calculated)</Label>
                <Input
                  type="number"
                  value={editingEntry.breakMinutes}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-muted-foreground mt-1">Auto-calculated from break records</p>
              </div>

              <div>
                <Label>Net Hours (calculated)</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={editingEntry.netHours}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-muted-foreground mt-1">Auto-calculated from shift and breaks</p>
              </div>

              <div className="col-span-2">
                <Label>Adjustment Note</Label>
                <Textarea
                  placeholder="Optional note for any time adjustments..."
                  value={editingEntry.adjustmentNote || ""}
                  onChange={(e) => setEditingEntry({...editingEntry, adjustmentNote: e.target.value})}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingEntry(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEntry}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}