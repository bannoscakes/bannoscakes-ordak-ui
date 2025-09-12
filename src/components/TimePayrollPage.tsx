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
import { toast } from "sonner@2.0.3";

interface TimeEntry {
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

// Mock time data for the week
const mockTimeData: StaffTimeRecord[] = [
  {
    id: "STF-001",
    name: "Sarah Chen",
    avatar: "SC",
    daysWorked: 5,
    totalShiftHours: 40.0,
    totalBreakMinutes: 150,
    totalNetHours: 37.5,
    hourlyRate: 28.50,
    totalPay: 1068.75,
    timeEntries: [
      { date: "2024-12-16", shiftStart: "06:00", shiftEnd: "14:00", breakMinutes: 30, netHours: 7.5 },
      { date: "2024-12-17", shiftStart: "06:00", shiftEnd: "14:00", breakMinutes: 30, netHours: 7.5 },
      { date: "2024-12-18", shiftStart: "06:00", shiftEnd: "14:00", breakMinutes: 30, netHours: 7.5 },
      { date: "2024-12-19", shiftStart: "06:00", shiftEnd: "14:00", breakMinutes: 30, netHours: 7.5 },
      { date: "2024-12-20", shiftStart: "06:00", shiftEnd: "14:00", breakMinutes: 30, netHours: 7.5 }
    ]
  },
  {
    id: "STF-002",
    name: "Marcus Rodriguez",
    avatar: "MR",
    daysWorked: 5,
    totalShiftHours: 40.0,
    totalBreakMinutes: 150,
    totalNetHours: 37.5,
    hourlyRate: 24.75,
    totalPay: 928.13,
    timeEntries: [
      { date: "2024-12-16", shiftStart: "04:00", shiftEnd: "12:00", breakMinutes: 30, netHours: 7.5 },
      { date: "2024-12-17", shiftStart: "04:00", shiftEnd: "12:00", breakMinutes: 30, netHours: 7.5 },
      { date: "2024-12-18", shiftStart: "04:00", shiftEnd: "12:00", breakMinutes: 30, netHours: 7.5 },
      { date: "2024-12-19", shiftStart: "04:00", shiftEnd: "12:00", breakMinutes: 30, netHours: 7.5 },
      { date: "2024-12-20", shiftStart: "04:00", shiftEnd: "12:00", breakMinutes: 30, netHours: 7.5 }
    ]
  },
  {
    id: "STF-003",
    name: "Emma Thompson",
    avatar: "ET",
    daysWorked: 4,
    totalShiftHours: 32.0,
    totalBreakMinutes: 120,
    totalNetHours: 30.0,
    hourlyRate: 22.00,
    totalPay: 660.00,
    timeEntries: [
      { date: "2024-12-16", shiftStart: "08:00", shiftEnd: "16:00", breakMinutes: 30, netHours: 7.5 },
      { date: "2024-12-17", shiftStart: "08:00", shiftEnd: "16:00", breakMinutes: 30, netHours: 7.5 },
      { date: "2024-12-19", shiftStart: "08:00", shiftEnd: "16:00", breakMinutes: 30, netHours: 7.5 },
      { date: "2024-12-20", shiftStart: "08:00", shiftEnd: "16:00", breakMinutes: 30, netHours: 7.5 }
    ]
  },
  {
    id: "STF-004",
    name: "David Kim",
    avatar: "DK",
    daysWorked: 5,
    totalShiftHours: 40.0,
    totalBreakMinutes: 150,
    totalNetHours: 37.5,
    hourlyRate: 26.25,
    totalPay: 984.38,
    timeEntries: [
      { date: "2024-12-16", shiftStart: "09:00", shiftEnd: "17:00", breakMinutes: 30, netHours: 7.5 },
      { date: "2024-12-17", shiftStart: "09:00", shiftEnd: "17:00", breakMinutes: 30, netHours: 7.5 },
      { date: "2024-12-18", shiftStart: "09:00", shiftEnd: "17:00", breakMinutes: 30, netHours: 7.5 },
      { date: "2024-12-19", shiftStart: "09:00", shiftEnd: "17:00", breakMinutes: 30, netHours: 7.5 },
      { date: "2024-12-20", shiftStart: "09:00", shiftEnd: "17:00", breakMinutes: 30, netHours: 7.5 }
    ]
  },
  {
    id: "STF-005",
    name: "Lisa Park",
    avatar: "LP",
    daysWorked: 5,
    totalShiftHours: 40.0,
    totalBreakMinutes: 150,
    totalNetHours: 37.5,
    hourlyRate: 23.50,
    totalPay: 881.25,
    timeEntries: [
      { date: "2024-12-16", shiftStart: "13:00", shiftEnd: "21:00", breakMinutes: 30, netHours: 7.5 },
      { date: "2024-12-17", shiftStart: "13:00", shiftEnd: "21:00", breakMinutes: 30, netHours: 7.5 },
      { date: "2024-12-18", shiftStart: "13:00", shiftEnd: "21:00", breakMinutes: 30, netHours: 7.5 },
      { date: "2024-12-19", shiftStart: "13:00", shiftEnd: "21:00", breakMinutes: 30, netHours: 7.5 },
      { date: "2024-12-20", shiftStart: "13:00", shiftEnd: "21:00", breakMinutes: 30, netHours: 7.5 }
    ]
  }
];

interface TimePayrollPageProps {
  initialStaffFilter?: string;
  onBack?: () => void;
}

export function TimePayrollPage({ initialStaffFilter, onBack }: TimePayrollPageProps) {
  const [timeData, setTimeData] = useState<StaffTimeRecord[]>(mockTimeData);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("this-week");
  const [storeFilter, setStoreFilter] = useState("all");
  const [selectedStaff, setSelectedStaff] = useState<StaffTimeRecord | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

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

  const handleViewDetails = (staff: StaffTimeRecord) => {
    setSelectedStaff(staff);
    setIsDetailsModalOpen(true);
  };

  const handleEditEntry = (entry: TimeEntry) => {
    setEditingEntry({ ...entry });
  };

  const handleSaveEntry = () => {
    if (selectedStaff && editingEntry) {
      const updatedEntries = selectedStaff.timeEntries.map(entry =>
        entry.date === editingEntry.date ? editingEntry : entry
      );
      
      const updatedStaff = { ...selectedStaff, timeEntries: updatedEntries };
      
      // Recalculate totals
      const totalShiftHours = updatedEntries.reduce((sum, entry) => {
        const start = new Date(`2024-01-01 ${entry.shiftStart}`);
        const end = new Date(`2024-01-01 ${entry.shiftEnd}`);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      
      const totalBreakMinutes = updatedEntries.reduce((sum, entry) => sum + entry.breakMinutes, 0);
      const totalNetHours = updatedEntries.reduce((sum, entry) => sum + entry.netHours, 0);
      const totalPay = totalNetHours * updatedStaff.hourlyRate;

      updatedStaff.totalShiftHours = totalShiftHours;
      updatedStaff.totalBreakMinutes = totalBreakMinutes;
      updatedStaff.totalNetHours = totalNetHours;
      updatedStaff.totalPay = totalPay;

      setSelectedStaff(updatedStaff);
      setTimeData(prev => prev.map(record => 
        record.id === updatedStaff.id ? updatedStaff : record
      ));
      
      setEditingEntry(null);
      toast.success("Time entry updated successfully");
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
                  {selectedStaff.timeEntries.map((entry, index) => (
                    <TableRow key={entry.date}>
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
                <Label>Break Minutes</Label>
                <Input
                  type="number"
                  value={editingEntry.breakMinutes}
                  onChange={(e) => setEditingEntry({...editingEntry, breakMinutes: parseInt(e.target.value) || 0})}
                />
              </div>

              <div>
                <Label>Net Hours</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={editingEntry.netHours}
                  onChange={(e) => setEditingEntry({...editingEntry, netHours: parseFloat(e.target.value) || 0})}
                />
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