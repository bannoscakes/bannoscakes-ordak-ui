import { Package, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";

// Shared inventory data for both stores
const sharedInventoryData = [
  {
    id: "INV-001",
    name: "All-Purpose Flour",
    category: "Raw Materials",
    currentStock: 850,
    minStock: 200,
    maxStock: 1000,
    unit: "kg",
    status: "Good Stock",
    location: "Warehouse A - Section 1",
    supplier: "Golden Grain Co.",
    lastRestocked: "Aug 30, 2025",
    expiryDate: "Feb 15, 2026",
    usedIn: ["Bannos: Cakes, Muffins", "Flourlane: Bread, Rolls"]
  },
  {
    id: "INV-002", 
    name: "Granulated Sugar",
    category: "Raw Materials",
    currentStock: 320,
    minStock: 150,
    maxStock: 500,
    unit: "kg",
    status: "Good Stock", 
    location: "Warehouse A - Section 2",
    supplier: "Sweet Supply Inc.",
    lastRestocked: "Aug 28, 2025",
    expiryDate: "Dec 31, 2026",
    usedIn: ["Bannos: All desserts", "Flourlane: Sweet breads"]
  },
  {
    id: "INV-003",
    name: "Fresh Eggs",
    category: "Perishables",
    currentStock: 45,
    minStock: 50,
    maxStock: 200,
    unit: "dozen",
    status: "Low Stock",
    location: "Cold Storage - Section B",
    supplier: "Farm Fresh Eggs Ltd.",
    lastRestocked: "Sep 1, 2025",
    expiryDate: "Sep 8, 2025",
    usedIn: ["Bannos: Cakes, Custards", "Flourlane: Enriched breads"]
  },
  {
    id: "INV-004",
    name: "Unsalted Butter", 
    category: "Dairy",
    currentStock: 75,
    minStock: 40,
    maxStock: 120,
    unit: "kg",
    status: "Good Stock",
    location: "Cold Storage - Section A",
    supplier: "Dairy Best Co.",
    lastRestocked: "Aug 31, 2025", 
    expiryDate: "Sep 15, 2025",
    usedIn: ["Bannos: Buttercream, Cookies", "Flourlane: Croissants, Pastries"]
  },
  {
    id: "INV-005",
    name: "Vanilla Extract",
    category: "Flavorings",
    currentStock: 8,
    minStock: 12,
    maxStock: 25,
    unit: "liters",
    status: "Low Stock",
    location: "Warehouse B - Flavorings",
    supplier: "Pure Extracts Inc.", 
    lastRestocked: "Aug 25, 2025",
    expiryDate: "Aug 25, 2027",
    usedIn: ["Bannos: Cakes, Frostings", "Flourlane: Sweet breads, Glazes"]
  },
  {
    id: "INV-006",
    name: "Active Dry Yeast",
    category: "Leavening",
    currentStock: 25,
    minStock: 10,
    maxStock: 40,
    unit: "kg", 
    status: "Good Stock",
    location: "Warehouse B - Section 1",
    supplier: "Baker's Yeast Co.",
    lastRestocked: "Aug 29, 2025",
    expiryDate: "Nov 29, 2025",
    usedIn: ["Flourlane: All breads", "Bannos: Some specialty items"]
  },
  {
    id: "INV-007",
    name: "Cocoa Powder",
    category: "Specialty",
    currentStock: 18,
    minStock: 15,
    maxStock: 50,
    unit: "kg",
    status: "Critical Stock",
    location: "Warehouse B - Section 2", 
    supplier: "Premium Cocoa Ltd.",
    lastRestocked: "Aug 22, 2025",
    expiryDate: "Jun 22, 2026",
    usedIn: ["Bannos: Chocolate cakes, Brownies", "Flourlane: Chocolate breads"]
  },
  {
    id: "INV-008",
    name: "Sea Salt",
    category: "Seasonings",
    currentStock: 95,
    minStock: 20,
    maxStock: 100,
    unit: "kg",
    status: "Good Stock",
    location: "Warehouse A - Section 3",
    supplier: "Ocean Harvest Co.",
    lastRestocked: "Aug 20, 2025", 
    expiryDate: "No expiry",
    usedIn: ["Both stores: All recipes for flavor enhancement"]
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Good Stock":
      return "bg-green-100 text-green-700 border-green-200";
    case "Low Stock":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "Critical Stock":
      return "bg-red-100 text-red-700 border-red-200";
    case "Out of Stock":
      return "bg-gray-100 text-gray-700 border-gray-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "Good Stock":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "Low Stock":
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case "Critical Stock":
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    default:
      return <Package className="h-4 w-4 text-gray-600" />;
  }
};

const getStockPercentage = (current: number, max: number) => {
  return Math.min((current / max) * 100, 100);
};

export function InventoryOverview() {
  const goodStockCount = sharedInventoryData.filter(item => item.status === "Good Stock").length;
  const lowStockCount = sharedInventoryData.filter(item => item.status === "Low Stock").length;
  const criticalStockCount = sharedInventoryData.filter(item => item.status === "Critical Stock").length;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-medium text-foreground">Inventory Overview</h3>
          <p className="text-sm text-muted-foreground">Shared inventory across both stores</p>
        </div>
        <Package className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-lg font-semibold text-green-600">{goodStockCount}</p>
          <p className="text-xs text-muted-foreground">Good Stock</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-yellow-600">{lowStockCount}</p>
          <p className="text-xs text-muted-foreground">Low Stock</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">{criticalStockCount}</p>
          <p className="text-xs text-muted-foreground">Critical</p>
        </div>
      </div>

      <div className="space-y-4">
        {sharedInventoryData.map((item, index) => {
          const stockPercentage = getStockPercentage(item.currentStock, item.maxStock);
          
          return (
            <div key={item.id} className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(item.status)}
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.category}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(item.status)}>
                  {item.status}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current Stock</span>
                  <span className="font-medium text-foreground">
                    {item.currentStock} {item.unit}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Min: {item.minStock}</span>
                    <span>Max: {item.maxStock}</span>
                  </div>
                  <Progress value={stockPercentage} className="h-2" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Location: </span>
                    <span className="text-foreground">{item.location}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Supplier: </span>
                    <span className="text-foreground">{item.supplier}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Restocked: </span>
                    <span className="text-foreground">{item.lastRestocked}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expiry: </span>
                    <span className="text-foreground">{item.expiryDate}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Used In</p>
                  <p className="text-sm text-foreground">{item.usedIn.join(" | ")}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  );
}