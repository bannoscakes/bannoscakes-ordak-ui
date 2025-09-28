import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "./ui/utils";
import { Button } from "./ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Product, getProductsForStore } from "./ProductData";

interface ProductComboboxProps {
  store: "bannos" | "flourlane";
  value: string;
  onValueChange: (product: Product) => void;
  className?: string;
  isDirty?: boolean;
}

export function ProductCombobox({ store, value, onValueChange, className, isDirty }: ProductComboboxProps) {
  const [open, setOpen] = useState(false);
  const products = getProductsForStore(store);
  
  // Find the selected product
  const selectedProduct = useMemo(() => {
    return products.find(product => product.title === value) || null;
  }, [products, value]);

  // Group products by category
  const groupedProducts = useMemo(() => {
    const groups: { [key: string]: Product[] } = {};
    products.forEach(product => {
      if (!groups[product.category]) {
        groups[product.category] = [];
      }
      groups[product.category].push(product);
    });
    return groups;
  }, [products]);

  const handleSelect = (product: Product) => {
    onValueChange(product);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !selectedProduct && "text-muted-foreground",
            isDirty && "border-orange-300 bg-orange-50",
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {selectedProduct && (
              <div className="w-6 h-6 rounded overflow-hidden bg-muted border flex-shrink-0">
                <ImageWithFallback
                  src={selectedProduct.thumbnail}
                  alt={selectedProduct.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <span className="truncate">
              {selectedProduct ? selectedProduct.title : "Select product..."}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search products..." className="h-9" />
          <CommandList>
            <CommandEmpty>No product found.</CommandEmpty>
            {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
              <CommandGroup key={category} heading={category}>
                {categoryProducts.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={product.title}
                    onSelect={() => handleSelect(product)}
                    className="flex items-center gap-2 py-2"
                  >
                    <div className="w-8 h-8 rounded overflow-hidden bg-muted border flex-shrink-0">
                      <ImageWithFallback
                        src={product.thumbnail}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{product.title}</div>
                      <div className="text-xs text-muted-foreground">{product.category}</div>
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedProduct?.id === product.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}