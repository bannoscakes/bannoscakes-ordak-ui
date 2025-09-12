import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { AlertCircle, Eye, EyeOff, Plus, X, GripVertical, TestTube, ArrowLeft } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { toast } from "sonner@2.0.3";

interface SettingsPageProps {
  store: "bannos" | "flourlane";
  onBack: () => void;
}

interface StoreSettings {
  shopifyToken: string;
  lastConnected?: string;
  lastSync?: string;
  printing: {
    ticketSize: string;
    copies: number;
    barcodePrefix: string;
  };
  dueDates: {
    defaultDue: string;
    allowedDays: boolean[];
    blackoutDates: string[];
  };
  flavours: string[];
  storage: string[];
  monitor: {
    autoRefresh: number;
    density: string;
  };
}

// Mock settings data
const getDefaultSettings = (store: "bannos" | "flourlane"): StoreSettings => ({
  shopifyToken: "",
  lastConnected: "2024-12-19 14:30:00",
  lastSync: "2024-12-19 15:45:00",
  printing: {
    ticketSize: "80mm",
    copies: 1,
    barcodePrefix: store.toUpperCase()
  },
  dueDates: {
    defaultDue: "+1 day",
    allowedDays: [true, true, true, true, true, true, false], // Mon-Sat
    blackoutDates: ["2024-12-25", "2024-01-01"]
  },
  flavours: store === "bannos" 
    ? ["Vanilla", "Chocolate", "Strawberry", "Caramel"]
    : ["Vanilla", "Chocolate", "Strawberry", "Caramel", "Cinnamon", "Lemon", "Almond", "Sourdough"],
  storage: [
    "Store Fridge",
    "Store Freezer", 
    "Kitchen Coolroom",
    "Kitchen Freezer",
    "Basement Coolroom"
  ],
  monitor: {
    autoRefresh: 30,
    density: "cozy"
  }
});

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function SettingsPage({ store, onBack }: SettingsPageProps) {
  const storeName = store === "bannos" ? "Bannos" : "Flourlane";
  const [settings, setSettings] = useState<StoreSettings>(getDefaultSettings(store));
  const [showToken, setShowToken] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ imported: 0, skipped: 0, errors: 0 });
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [newBlackoutDate, setNewBlackoutDate] = useState("");

  const handleSettingsChange = (path: string, value: any) => {
    setSettings(prev => {
      const keys = path.split('.');
      const newSettings = { ...prev };
      let current: any = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
    setHasUnsavedChanges(true);
  };

  const handleTestConnection = async () => {
    if (!settings.shopifyToken.trim()) {
      toast.error("Please enter a Storefront Access Token");
      return;
    }

    setIsConnecting(true);
    setConnectionStatus('idle');
    
    // Simulate API call
    setTimeout(() => {
      const success = settings.shopifyToken.length > 10; // Mock validation
      setConnectionStatus(success ? 'success' : 'error');
      setIsConnecting(false);
      
      if (success) {
        toast.success("Connected successfully");
        setSettings(prev => ({ ...prev, lastConnected: new Date().toLocaleString() }));
      } else {
        toast.error("Connection failed. Check token and permissions.");
      }
    }, 2000);
  };

  const handleConnectAndSync = async () => {
    await handleTestConnection();
    if (connectionStatus === 'success') {
      handleSyncOrders();
    }
  };

  const handleSyncOrders = async () => {
    setIsSyncing(true);
    setSyncStatus('idle');
    setSyncProgress({ imported: 0, skipped: 0, errors: 0 });
    
    // Simulate sync progress
    const interval = setInterval(() => {
      setSyncProgress(prev => ({
        imported: Math.min(prev.imported + Math.floor(Math.random() * 3) + 1, 45),
        skipped: Math.min(prev.skipped + Math.floor(Math.random() * 2), 8),
        errors: Math.min(prev.errors + (Math.random() < 0.1 ? 1 : 0), 2)
      }));
    }, 200);

    setTimeout(() => {
      clearInterval(interval);
      setIsSyncing(false);
      setSyncStatus('success');
      setSettings(prev => ({ ...prev, lastSync: new Date().toLocaleString() }));
      toast.success("Sync completed successfully");
    }, 3000);
  };

  const handleTestPrint = () => {
    toast.success("Sent to printer");
  };

  const handleAddFlavour = () => {
    const maxFlavours = store === "bannos" ? 5 : 9;
    if (settings.flavours.length < maxFlavours) {
      handleSettingsChange('flavours', [...settings.flavours, `New Flavour ${settings.flavours.length + 1}`]);
    }
  };

  const handleRemoveFlavour = (index: number) => {
    const newFlavours = settings.flavours.filter((_, i) => i !== index);
    handleSettingsChange('flavours', newFlavours);
  };

  const handleAddBlackoutDate = () => {
    if (newBlackoutDate && !settings.dueDates.blackoutDates.includes(newBlackoutDate)) {
      handleSettingsChange('dueDates.blackoutDates', [...settings.dueDates.blackoutDates, newBlackoutDate]);
      setNewBlackoutDate("");
    }
  };

  const handleRemoveBlackoutDate = (date: string) => {
    const newDates = settings.dueDates.blackoutDates.filter(d => d !== date);
    handleSettingsChange('dueDates.blackoutDates', newDates);
  };

  const handleSave = () => {
    setHasUnsavedChanges(false);
    toast.success("Settings saved successfully");
  };

  const handleCancel = () => {
    setSettings(getDefaultSettings(store));
    setHasUnsavedChanges(false);
    toast.info("Changes discarded");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-medium text-foreground">{storeName} Settings</h1>
              <p className="text-sm text-muted-foreground">Configure store-specific settings and integrations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 pb-32 space-y-6">
        
        {/* Shopify Integration Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">Shopify Integration</h2>
          
          {/* Storefront Access Token */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium text-foreground">Storefront Access Token</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Used to fetch product info/images. From: Shopify Admin → Apps → Private apps → Storefront API.
                </p>
              </div>
              {settings.lastConnected && (
                <div className="text-xs text-muted-foreground">
                  Last connected: {settings.lastConnected}
                </div>
              )}
            </div>

            {connectionStatus === 'success' && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">Connected. Catalog sync started.</p>
              </div>
            )}

            {connectionStatus === 'error' && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <p className="text-sm text-red-700">Connection failed. Check token and permissions.</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <Input
                  type={showToken ? "text" : "password"}
                  placeholder="Enter your Storefront Access Token"
                  value={settings.shopifyToken}
                  onChange={(e) => handleSettingsChange('shopifyToken', e.target.value)}
                  disabled={isConnecting}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isConnecting || !settings.shopifyToken.trim()}
                >
                  {isConnecting ? "Testing..." : "Test Connection"}
                </Button>
                <Button
                  onClick={handleConnectAndSync}
                  disabled={isConnecting || !settings.shopifyToken.trim()}
                >
                  Connect & Sync Complete Catalog
                </Button>
              </div>
            </div>
          </Card>

          {/* Shopify Order Sync */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium text-foreground">Shopify Order Sync</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Pull unfulfilled orders when webhooks aren't available, and for first-time import.
                </p>
              </div>
              {settings.lastSync && (
                <div className="text-xs text-muted-foreground">
                  Last sync: {settings.lastSync}
                </div>
              )}
            </div>

            {syncStatus === 'success' && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">Sync complete</p>
              </div>
            )}

            {syncStatus === 'error' && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <p className="text-sm text-red-700">Sync failed — <button className="underline">View Sync Log</button></p>
                </div>
              </div>
            )}

            {isSyncing && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-700">Sync in progress...</span>
                    <div className="text-xs text-blue-600">
                      Imported {syncProgress.imported} · Skipped {syncProgress.skipped} · Errors {syncProgress.errors}
                    </div>
                  </div>
                  <Progress value={(syncProgress.imported / 50) * 100} className="h-2" />
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <Button onClick={handleSyncOrders} disabled={isSyncing}>
                {isSyncing ? "Syncing..." : "Sync Orders"}
              </Button>
              <Button variant="ghost" size="sm">
                View Sync Log
              </Button>
            </div>
          </Card>
        </div>

        {/* Printing */}
        <Card className="p-6">
          <h3 className="font-medium text-foreground mb-4">Printing</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Ticket size</Label>
                <Select value={settings.printing.ticketSize} onValueChange={(value) => handleSettingsChange('printing.ticketSize', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58mm">58 mm</SelectItem>
                    <SelectItem value="80mm">80 mm</SelectItem>
                    <SelectItem value="custom">Custom width (px)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Copies</Label>
                <Select value={settings.printing.copies.toString()} onValueChange={(value) => handleSettingsChange('printing.copies', parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Barcode prefix</Label>
                <div className="space-y-2">
                  <Input 
                    value={settings.printing.barcodePrefix}
                    onChange={(e) => handleSettingsChange('printing.barcodePrefix', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Barcode type: CODE128, content: Order #
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-end justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <TestTube className="h-4 w-4 mr-2" />
                    Test print
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Send test ticket to printer?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will send a test print ticket using your current printer settings.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleTestPrint}>
                      Send to printer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </Card>

        {/* Due Date defaults */}
        <Card className="p-6">
          <h3 className="font-medium text-foreground mb-4">Due Date defaults</h3>
          
          <div className="space-y-4">
            <div>
              <Label>Default Due Date</Label>
              <Select value={settings.dueDates.defaultDue} onValueChange={(value) => handleSettingsChange('dueDates.defaultDue', value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="+1 day">+1 day</SelectItem>
                  <SelectItem value="+2 days">+2 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Allowed days</Label>
              <div className="flex gap-2 mt-2">
                {dayNames.map((day, index) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Switch
                      checked={settings.dueDates.allowedDays[index]}
                      onCheckedChange={(checked) => {
                        const newDays = [...settings.dueDates.allowedDays];
                        newDays[index] = checked;
                        handleSettingsChange('dueDates.allowedDays', newDays);
                      }}
                    />
                    <Label className="text-xs">{day.slice(0, 3)}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Blackout dates</Label>
              <div className="space-y-2 mt-2">
                <div className="flex flex-wrap gap-2">
                  {settings.dueDates.blackoutDates.map((date) => (
                    <Badge key={date} variant="outline" className="flex items-center gap-1">
                      {date}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handleRemoveBlackoutDate(date)}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={newBlackoutDate}
                    onChange={(e) => setNewBlackoutDate(e.target.value)}
                    className="w-48"
                  />
                  <Button size="sm" variant="outline" onClick={handleAddBlackoutDate}>
                    Add date
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Priority (read-only) */}
        <Card className="p-4 bg-muted/30">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Priority is derived from Due Date: High = today/overdue, Medium = tomorrow, Low = later.
            </p>
          </div>
        </Card>

        {/* Filling flavours */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium text-foreground">Filling flavours</h3>
              <p className="text-sm text-muted-foreground">Used by the Filling dropdown.</p>
            </div>
            <Button size="sm" variant="outline" onClick={handleAddFlavour}>
              <Plus className="h-4 w-4 mr-2" />
              Add flavour
            </Button>
          </div>

          <div className="space-y-2">
            {settings.flavours.map((flavour, index) => (
              <div key={index} className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Input 
                  value={flavour}
                  onChange={(e) => {
                    const newFlavours = [...settings.flavours];
                    newFlavours[index] = e.target.value;
                    handleSettingsChange('flavours', newFlavours);
                  }}
                  className="flex-1"
                />
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleRemoveFlavour(index)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <Input value="Other" disabled className="flex-1" />
              <div className="h-8 w-8" /> {/* Spacer for alignment */}
            </div>
          </div>
        </Card>

        {/* Storage locations */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="font-medium text-foreground">Storage locations</h3>
            <p className="text-sm text-muted-foreground">Shown as a chip on cards; used by the Storage filter.</p>
          </div>

          <div className="space-y-3">
            {settings.storage.map((location, index) => (
              <div key={index}>
                <Label>Storage location {index + 1}</Label>
                <Input 
                  value={location}
                  onChange={(e) => {
                    const newStorage = [...settings.storage];
                    newStorage[index] = e.target.value;
                    handleSettingsChange('storage', newStorage);
                  }}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Monitor options */}
        <Card className="p-6">
          <h3 className="font-medium text-foreground mb-4">Monitor options</h3>
          <p className="text-sm text-muted-foreground mb-4">Scope is date-based; time is not collected.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Auto-refresh</Label>
              <Select value={settings.monitor.autoRefresh.toString()} onValueChange={(value) => handleSettingsChange('monitor.autoRefresh', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 sec</SelectItem>
                  <SelectItem value="30">30 sec</SelectItem>
                  <SelectItem value="60">60 sec</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Density</Label>
              <Select value={settings.monitor.density} onValueChange={(value) => handleSettingsChange('monitor.density', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="cozy">Cozy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </div>

      {/* Sticky Footer */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
          <div className="max-w-4xl mx-auto flex justify-end gap-3">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}