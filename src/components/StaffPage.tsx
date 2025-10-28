import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { 
  Users, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  UserX, 
  RotateCcw, 
  Clock,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { getStaffList, type StaffMember as RpcStaffMember } from "../lib/rpc-client";

interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  role: "Admin" | "Supervisor" | "Staff";
  status: "Approved" | "Active";
  onShift: boolean;
  hourlyRate: number;
  phone?: string;
  avatar: string;
  hireDate: string;
  lastLogin?: string;
}

export function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Fetch staff from Supabase
  useEffect(() => {
    async function fetchStaff() {
      try {
        const staffList = await getStaffList();
        // Map Supabase staff to UI format
        const mappedStaff: StaffMember[] = staffList.map((s) => ({
          id: s.user_id,
          fullName: s.full_name,
          email: s.email || '',
          role: s.role,
          status: s.is_active ? "Active" : "Approved",
          onShift: false, // TODO: Get from shift data
          hourlyRate: 20.00, // TODO: Get from staff_shared if we add this column
          phone: s.phone || undefined,
          avatar: s.full_name.split(' ').map(n => n[0]).join('').toUpperCase(),
          hireDate: new Date(s.created_at).toISOString().split('T')[0],
          lastLogin: s.last_login || undefined,
        }));
        setStaff(mappedStaff);
      } catch (error) {
        console.error('Error fetching staff:', error);
        toast.error('Failed to load staff data');
      } finally {
        setLoading(false);
      }
    }
    fetchStaff();
  }, []);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // Mock current user role (in real app, this would come from auth context)
  const currentUserRole = "Admin";
  const isAdmin = currentUserRole === "Admin";

  const filteredStaff = staff.filter(member =>
    member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    return status === "Active" 
      ? <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
      : <Badge className="bg-blue-100 text-blue-700 border-blue-200">Approved</Badge>;
  };

  const getOnShiftBadge = (onShift: boolean) => {
    return onShift 
      ? <Badge className="bg-green-100 text-green-700 border-green-200">On Shift</Badge>
      : <Badge variant="outline">Off Shift</Badge>;
  };

  const formatWage = (hourlyRate: number) => {
    return isAdmin ? `$${hourlyRate.toFixed(2)}/hr` : "••••";
  };

  const handleViewProfile = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    setEditMode(false);
    setIsProfileModalOpen(true);
  };

  const handleEditProfile = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    setEditMode(true);
    setIsProfileModalOpen(true);
  };

  const handleDeactivate = (staffMember: StaffMember) => {
    setStaff(prev => prev.map(member => 
      member.id === staffMember.id 
        ? { ...member, status: member.status === "Active" ? "Approved" : "Active" }
        : member
    ));
    toast.success(`${staffMember.fullName} has been ${staffMember.status === "Active" ? "deactivated" : "activated"}`);
  };

  const handleResetPIN = (staffMember: StaffMember) => {
    toast.success(`PIN reset for ${staffMember.fullName}. New PIN sent via email.`);
  };

  const handleViewTimesheet = (staffMember: StaffMember) => {
    // Navigate to time & payroll page filtered to this staff member
    window.history.pushState({}, '', `/admin/time?staff=${staffMember.id}`);
    // Force a reload to trigger the navigation (in a real app this would use proper routing)
    window.location.reload();
  };

  const handleSaveProfile = () => {
    if (selectedStaff) {
      setStaff(prev => prev.map(member => 
        member.id === selectedStaff.id ? selectedStaff : member
      ));
      toast.success("Profile updated successfully");
      setIsProfileModalOpen(false);
    }
  };

  const handleAddStaff = () => {
    const newStaff: StaffMember = {
      id: `STF-${String(staff.length + 1).padStart(3, '0')}`,
      fullName: "New Staff Member",
      email: "new.staff@manufactory.com",
      role: "Staff",
      status: "Approved",
      onShift: false,
      hourlyRate: 20.00,
      avatar: "NS",
      hireDate: new Date().toISOString().split('T')[0]
    };
    setSelectedStaff(newStaff);
    setEditMode(true);
    setIsAddModalOpen(false);
    setIsProfileModalOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-foreground">Staff</h1>
          <p className="text-sm text-muted-foreground">Manage staff across Bannos and Flourlane stores</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search staff by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Staff Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Email/ID</TableHead>
              <TableHead>On Shift</TableHead>
              <TableHead>Wage</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading staff...
                </TableCell>
              </TableRow>
            ) : filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No staff members found
                </TableCell>
              </TableRow>
            ) : (
              filteredStaff.map((staffMember) => (
              <TableRow key={staffMember.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8 bg-primary text-primary-foreground flex items-center justify-center">
                      <span className="text-sm font-medium">{staffMember.avatar}</span>
                    </Avatar>
                    <span className="font-medium">{staffMember.fullName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={staffMember.role === "Admin" ? "default" : "secondary"}>
                    {staffMember.role}
                  </Badge>
                </TableCell>
                <TableCell>{getStatusBadge(staffMember.status)}</TableCell>
                <TableCell className="font-mono text-sm">{staffMember.email}</TableCell>
                <TableCell>{getOnShiftBadge(staffMember.onShift)}</TableCell>
                <TableCell>{formatWage(staffMember.hourlyRate)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewProfile(staffMember)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditProfile(staffMember)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewTimesheet(staffMember)}>
                        <Clock className="h-4 w-4 mr-2" />
                        View Timesheet
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeactivate(staffMember)}>
                        <UserX className="h-4 w-4 mr-2" />
                        {staffMember.status === "Active" ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleResetPIN(staffMember)}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset PIN
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )))}
          </TableBody>
        </Table>
      </Card>

      {/* Add Staff Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
            <DialogDescription>
              Create a new staff account with access to both Bannos and Flourlane stores.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Click "Create" to add a new staff member with default settings. You can edit their details immediately after creation.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStaff}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Modal */}
      {selectedStaff && (
        <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editMode ? "Edit" : "View"} Staff Profile
              </DialogTitle>
              <DialogDescription>
                Staff member details and permissions
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={selectedStaff.fullName}
                    onChange={(e) => setSelectedStaff({...selectedStaff, fullName: e.target.value})}
                    disabled={!editMode}
                  />
                </div>

                <div>
                  <Label>Email/ID</Label>
                  <Input
                    value={selectedStaff.email}
                    onChange={(e) => setSelectedStaff({...selectedStaff, email: e.target.value})}
                    disabled={!editMode}
                  />
                </div>

                <div>
                  <Label>Role</Label>
                  <Select
                    value={selectedStaff.role}
                    onValueChange={(value: "Admin" | "Supervisor" | "Staff") => 
                      setSelectedStaff({...selectedStaff, role: value})
                    }
                    disabled={!editMode}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Supervisor">Supervisor</SelectItem>
                      <SelectItem value="Staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isAdmin && (
                  <div>
                    <Label>Hourly Rate</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.25"
                        value={selectedStaff.hourlyRate}
                        onChange={(e) => setSelectedStaff({...selectedStaff, hourlyRate: parseFloat(e.target.value) || 0})}
                        className="pl-10"
                        disabled={!editMode}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Status - Approved</Label>
                  <Switch
                    checked={selectedStaff.status === "Approved"}
                    onCheckedChange={(checked) => 
                      setSelectedStaff({...selectedStaff, status: checked ? "Approved" : "Active"})
                    }
                    disabled={!editMode}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Status - Active</Label>
                  <Switch
                    checked={selectedStaff.status === "Active"}
                    onCheckedChange={(checked) => 
                      setSelectedStaff({...selectedStaff, status: checked ? "Active" : "Approved"})
                    }
                    disabled={!editMode}
                  />
                </div>

                {editMode && (
                  <div>
                    <Button variant="outline" size="sm" onClick={() => handleResetPIN(selectedStaff)}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset PIN
                    </Button>
                  </div>
                )}

                <div className="pt-4 border-t border-border">
                  <Label className="text-sm text-muted-foreground">Store Permissions</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Shared across Bannos & Flourlane
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsProfileModalOpen(false)}>
                Cancel
              </Button>
              {editMode && (
                <Button onClick={handleSaveProfile}>
                  Save
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}