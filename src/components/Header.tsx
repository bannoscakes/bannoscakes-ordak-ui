import { Search, Bell, User } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";

interface HeaderProps {
  onRefresh?: () => Promise<void>;
}

export function Header({ onRefresh }: HeaderProps) {
  return (
    <header className="bg-background border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h2 className="text-2xl font-medium text-foreground">Multi-Store Production Dashboard</h2>
            <p className="text-sm text-muted-foreground">Monday, September 1, 2025 • Bannos & Flourlane Operations</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Orders"
              className="pl-10 w-64 bg-input-background border-border focus:bg-background"
            />
          </div>
          
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
              3
            </Badge>
          </Button>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Admin
            </Badge>
            <Button variant="ghost" size="sm">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}