import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ComponentsInventory } from "./inventory/ComponentsInventory";
import { BOMsInventory } from "./inventory/BOMsInventory";
import { AccessoryKeywords } from "./inventory/AccessoryKeywords";
import { ProductRequirements } from "./inventory/ProductRequirements";
import { TransactionsInventory } from "./inventory/TransactionsInventory";
import { ToolsInventory } from "./inventory/ToolsInventory";

export function InventoryPage() {
  const [activeTab, setActiveTab] = useState("components");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground">Unified inventory management across Bannos and Flourlane</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="boms">BOMs</TabsTrigger>
          <TabsTrigger value="keywords">Accessory Keywords</TabsTrigger>
          <TabsTrigger value="requirements">Product Requirements</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="space-y-6">
          <ComponentsInventory />
        </TabsContent>

        <TabsContent value="boms" className="space-y-6">
          <BOMsInventory />
        </TabsContent>

        <TabsContent value="keywords" className="space-y-6">
          <AccessoryKeywords />
        </TabsContent>

        <TabsContent value="requirements" className="space-y-6">
          <ProductRequirements />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <TransactionsInventory />
        </TabsContent>

        <TabsContent value="tools" className="space-y-6">
          <ToolsInventory />
        </TabsContent>
      </Tabs>
    </div>
  );
}