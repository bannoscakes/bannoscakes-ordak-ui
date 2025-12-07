import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Package, FileText, Gift, Cake } from "lucide-react";
import { ComponentsTab } from "./ComponentsTab";
import { BOMsTab } from "./BOMsTab";
import { AccessoriesTab } from "./AccessoriesTab";
import { CakeToppersTab } from "./CakeToppersTab";

export function InventoryPage() {
  const [activeTab, setActiveTab] = useState("components");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">
            Manage components, BOMs, accessories, and cake toppers
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="components" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Components</span>
          </TabsTrigger>
          <TabsTrigger value="boms" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">BOMs</span>
          </TabsTrigger>
          <TabsTrigger value="accessories" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            <span className="hidden sm:inline">Accessories</span>
          </TabsTrigger>
          <TabsTrigger value="cake-toppers" className="flex items-center gap-2">
            <Cake className="h-4 w-4" />
            <span className="hidden sm:inline">Cake Toppers</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="components">
          <ComponentsTab />
        </TabsContent>

        <TabsContent value="boms">
          <BOMsTab />
        </TabsContent>

        <TabsContent value="accessories">
          <AccessoriesTab />
        </TabsContent>

        <TabsContent value="cake-toppers">
          <CakeToppersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
