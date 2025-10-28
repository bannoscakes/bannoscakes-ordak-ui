import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Users, User } from "lucide-react";

interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  isOnline: boolean;
}

interface NewConversationModalProps {
  open: boolean;
  onClose: () => void;
  onCreateConversation: (participants: string[], isGroup: boolean) => void;
}

export function NewConversationModal({
  open,
  onClose,
  onCreateConversation
}: NewConversationModalProps) {
  // TODO: Replace with real staff data from API
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [conversationType, setConversationType] = useState<"direct" | "group">("direct");
  const [groupName, setGroupName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // TODO: Implement real data fetching
  useEffect(() => {
    if (open) {
      // This will be replaced with actual API call
      // fetchStaffList();
    }
  }, [open]);

  const handleParticipantToggle = (staffId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(staffId)
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  const handleCreateConversation = () => {
    if (selectedParticipants.length === 0) return;

    const isGroup = conversationType === "group" || selectedParticipants.length > 1;
    onCreateConversation(selectedParticipants, isGroup);
    
    // Reset form
    setSelectedParticipants([]);
    setConversationType("direct");
    setGroupName("");
    setSearchTerm("");
  };

  const filteredStaff = staffList.filter(staff =>
    staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Conversation Type */}
          <div className="space-y-2">
            <Label>Conversation Type</Label>
            <Select
              value={conversationType}
              onValueChange={(value: "direct" | "group") => setConversationType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Direct Message
                  </div>
                </SelectItem>
                <SelectItem value="group">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Group Chat
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Group Name (for group chats) */}
          {conversationType === "group" && (
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
          )}

          {/* Search Staff */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Staff</Label>
            <Input
              id="search"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Staff List */}
          <div className="space-y-2">
            <Label>Select Participants</Label>
            <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
              {filteredStaff.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  {staffList.length === 0 ? "No staff available" : "No staff found"}
                </div>
              ) : (
                filteredStaff.map((staff) => (
                  <div
                    key={staff.id}
                    className="flex items-center space-x-2 p-2 hover:bg-accent rounded-lg cursor-pointer"
                    onClick={() => handleParticipantToggle(staff.id)}
                  >
                    <Checkbox
                      checked={selectedParticipants.includes(staff.id)}
                      onChange={() => handleParticipantToggle(staff.id)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {staff.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate">{staff.name}</p>
                        {staff.isOnline && (
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {staff.role} • {staff.email}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateConversation}
              disabled={selectedParticipants.length === 0}
            >
              Create Conversation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}