import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { AlertCircle, Eye, EyeOff, Plus, X, GripVertical, TestTube, ArrowLeft } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { toast } from "sonner";
import { 
  getSettings, 
  setSetting, 
  getFlavours, 
  setFlavours, 
  getStorageLocations, 
  setStorageLocations, 
  getPrintingSettings, 
  setPrintingSettings, 
  getMonitorDensity, 
  setMonitorDensity,
  testStorefrontToken,
  connectCatalog,
  syncShopifyOrders
} from "../lib/rpc-client";

interface SettingsPageProps {
  store: "bannos" | "flourlane";
  onBack: () => void;
}

interface StoreSettings {
  shopifyToken: string;
  lastConnected?: string;
  lastSync?: string;
  inventoryTrackingEnabled: boolean;
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
  inventoryTrackingEnabled: false,
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

const ensureArray = <T,>(value: unknown, fallback: T[]): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
};

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
  const [loading, setLoading] = useState(true);

  // Fetch settings from database
  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        
        // Fetch all settings for this store
        const [flavours, storage, printing, monitor, allSettings] = await Promise.all([
          getFlavours(store),
          getStorageLocations(store),
          getPrintingSettings(store),
          getMonitorDensity(store),
          getSettings(store)
        ]);

        // Extract specific settings from the allSettings array
        const dueDateDefault = allSettings?.find((s: any) => s.key === 'dueDates.defaultDue')?.value;
        const dueDateDays = allSettings?.find((s: any) => s.key === 'dueDates.allowedDays')?.value;
        const dueDateBlackouts = allSettings?.find((s: any) => s.key === 'dueDates.blackoutDates')?.value;
        const autoRefresh = allSettings?.find((s: any) => s.key === 'monitor.autoRefresh')?.value;
        const shopifyToken = allSettings?.find((s: any) => s.key === 'shopifyToken')?.value;
        const inventoryTracking = allSettings?.find((s: any) => s.key === 'inventory_tracking_enabled')?.value;

        console.log('Fetched settings:', { flavours, storage, printing, monitor, allSettings, dueDateDefault, dueDateDays, dueDateBlackouts, autoRefresh, shopifyToken });
        console.log('Storage locations details:', { 
          storage, 
          isArray: Array.isArray(storage), 
          type: typeof storage,
          length: storage?.length 
        });
        console.log('Monitor density details:', { 
          monitor, 
          type: typeof monitor,
          isString: typeof monitor === 'string'
        });

        // Update settings with real data
        setSettings(prev => {
          const parsedInventoryTracking = (() => {
            if (typeof inventoryTracking === 'boolean') return inventoryTracking;
            if (typeof inventoryTracking === 'string') {
              return inventoryTracking.toLowerCase() === 'true';
            }
            return prev.inventoryTrackingEnabled;
          })();

          const newSettings = {
            ...prev,
            shopifyToken: shopifyToken || prev.shopifyToken,
            flavours: Array.isArray(flavours) ? flavours : prev.flavours,
            storage: Array.isArray(storage) ? storage : prev.storage,
            inventoryTrackingEnabled: parsedInventoryTracking,
            printing: {
              ...prev.printing,
              ...(typeof printing === 'object' && printing ? printing : {})
            },
            dueDates: {
              ...prev.dueDates,
              defaultDue: dueDateDefault || prev.dueDates.defaultDue,
              allowedDays: ensureArray(dueDateDays, prev.dueDates.allowedDays),
              blackoutDates: ensureArray(dueDateBlackouts, prev.dueDates.blackoutDates)
            },
            monitor: {
              ...prev.monitor,
              density: typeof monitor === 'string' ? monitor : prev.monitor.density,
              autoRefresh: autoRefresh ? parseInt(autoRefresh) : prev.monitor.autoRefresh
            }
          };
          
          
          return newSettings;
        });

      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [store]);

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

  const handleInventoryToggle = (enabled: boolean) => {
    handleSettingsChange('inventoryTrackingEnabled', enabled);
  };

  const handleTestConnection = async () => {
    if (!settings.shopifyToken.trim()) {
      toast.error("Please enter a Storefront Access Token");
      return;
    }

    setIsConnecting(true);
    setConnectionStatus('idle');
    
    try {
      const result = await testStorefrontToken(store, settings.shopifyToken);
      
      if (result.valid) {
        setConnectionStatus('success');
        toast.success(result.stub ? "Token saved (validation pending Edge Function)" : "Connected successfully");
        setSettings(prev => ({ ...prev, lastConnected: new Date().toLocaleString() }));
      } else {
        setConnectionStatus('error');
        toast.error(result.error || "Connection failed");
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setConnectionStatus('error');
      toast.error("Connection failed. Check token and permissions.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectAndSync = async () => {
    if (!settings.shopifyToken.trim()) {
      toast.error("Please enter a Storefront Access Token");
      return;
    }

    setIsConnecting(true);
    
    try {
      const result = await connectCatalog(store, settings.shopifyToken);
      
      if (result.success) {
        toast.success(result.stub ? "Catalog sync queued (Edge Function pending)" : "Catalog sync started");
        setSettings(prev => ({ ...prev, lastConnected: new Date().toLocaleString() }));
        setConnectionStatus('success');
      } else {
        toast.error("Catalog sync failed");
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('Catalog sync error:', error);
      toast.error("Catalog sync failed");
      setConnectionStatus('error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncOrders = async () => {
    setIsSyncing(true);
    setSyncStatus('idle');
    setSyncProgress({ imported: 0, skipped: 0, errors: 0 });
    
    try {
      const result = await syncShopifyOrders(store);
      
      if (result.success) {
        setSyncStatus('success');
        setSettings(prev => ({ ...prev, lastSync: new Date().toLocaleString() }));
        
        if (result.recommendation) {
          toast.success(result.recommendation, { duration: 5000 });
        } else {
          toast.success(result.stub ? "Sync queued (Edge Function pending)" : "Sync completed");
        }
        
        // Set progress from result if available
        if (result.imported !== undefined) {
          setSyncProgress({
            imported: result.imported || 0,
            skipped: result.skipped || 0,
            errors: result.errors || 0
          });
        }
      } else {
        setSyncStatus('error');
        toast.error("Sync failed");
      }
    } catch (error) {
      console.error('Sync orders error:', error);
      setSyncStatus('error');
      toast.error("Sync failed");
    } finally {
      setIsSyncing(false);
    }
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

  const handleAddStorageLocation = () => {
    handleSettingsChange('storage', [...settings.storage, `New Location ${settings.storage.length + 1}`]);
  };

  const handleRemoveStorageLocation = (index: number) => {
    const newStorage = settings.storage.filter((_, i) => i !== index);
    handleSettingsChange('storage', newStorage);
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

  const handleSave = async () => {
    try {
      setLoading(true);
      
      console.log('Saving settings for store:', store);
      console.log('Storage locations to save:', settings.storage);
      
      // Save all settings to database
      await Promise.all([
        setFlavours(store, settings.flavours),
        setStorageLocations(store, settings.storage),
        setPrintingSettings(store, settings.printing),
        setMonitorDensity(store, settings.monitor.density),
        setSetting(store, 'inventory_tracking_enabled', settings.inventoryTrackingEnabled),
        // Save due date settings
        setSetting(store, 'dueDates.defaultDue', settings.dueDates.defaultDue),
        setSetting(store, 'dueDates.allowedDays', JSON.stringify(settings.dueDates.allowedDays)),
        setSetting(store, 'dueDates.blackoutDates', JSON.stringify(settings.dueDates.blackoutDates)),
        // Save monitor auto-refresh
        setSetting(store, 'monitor.autoRefresh', settings.monitor.autoRefresh),
        // Save Shopify token
        setSetting(store, 'shopifyToken', settings.shopifyToken)
      ]);

      console.log('Settings saved successfully');
      setHasUnsavedChanges(false);
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
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
        {loading && (
          <div className="text-center py-8 text-muted-foreground">
            Loading settings...
          </div>
        )}
        
        {/* Inventory Tracking */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">Inventory Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Requires BOM data and inventory quantities before enabling. Feature flag controls `deduct_inventory_for_order` and `restock_order`.
              </p>
              <p className="text-xs text-muted-foreground">
                When disabled, all inventory RPCs safely no-op and log a skip event.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={settings.inventoryTrackingEnabled ? "default" : "outline"}>
                {settings.inventoryTrackingEnabled ? "Active" : "Inactive"}
              </Badge>
              <Switch
                checked={settings.inventoryTrackingEnabled}
                onCheckedChange={handleInventoryToggle}
              />
            </div>
          </div>
          <div className="mt-4 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700">
            Warning: Enable only after BOMs and inventory counts are loaded. The system is dormant by default.
          </div>
        </Card>

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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium text-foreground">Storage locations</h3>
              <p className="text-sm text-muted-foreground">Shown as a chip on cards; used by the Storage filter.</p>
            </div>
            <Button size="sm" variant="outline" onClick={handleAddStorageLocation}>
              <Plus className="h-4 w-4 mr-2" />
              Add location
            </Button>
          </div>

          <div className="space-y-2">
            {settings.storage.map((location, index) => (
              <div key={index} className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Input 
                  value={location}
                  onChange={(e) => {
                    const newStorage = [...settings.storage];
                    newStorage[index] = e.target.value;
                    handleSettingsChange('storage', newStorage);
                  }}
                  className="flex-1"
                />
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleRemoveStorageLocation(index)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
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
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}