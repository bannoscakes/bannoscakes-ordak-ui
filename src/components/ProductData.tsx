// Product catalog data for both stores with variants and thumbnails

export interface ProductVariant {
  id: string;
  title: string;
  available: boolean;
}

export interface Product {
  id: string;
  title: string;
  thumbnail: string;
  category: string;
  variants?: ProductVariant[];
  allowCustomSize?: boolean;
}

export const BANNOS_PRODUCTS: Product[] = [
  {
    id: "chocolate-cupcakes",
    title: "Chocolate Cupcakes",
    thumbnail: "https://images.unsplash.com/photo-1587668178277-295251f900ce?w=100&h=100&fit=crop",
    category: "Cupcakes",
    variants: [
      { id: "mini", title: "Mini (24 pack)", available: true },
      { id: "standard", title: "Standard (12 pack)", available: true },
      { id: "jumbo", title: "Jumbo (6 pack)", available: true }
    ]
  },
  {
    id: "vanilla-cupcakes",
    title: "Vanilla Cupcakes",
    thumbnail: "https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=100&h=100&fit=crop",
    category: "Cupcakes",
    variants: [
      { id: "mini", title: "Mini (24 pack)", available: true },
      { id: "standard", title: "Standard (12 pack)", available: true },
      { id: "jumbo", title: "Jumbo (6 pack)", available: true }
    ]
  },
  {
    id: "strawberry-cupcakes",
    title: "Strawberry Cupcakes",
    thumbnail: "https://images.unsplash.com/photo-1426869981800-95ebf51ce900?w=100&h=100&fit=crop",
    category: "Cupcakes",
    variants: [
      { id: "mini", title: "Mini (24 pack)", available: true },
      { id: "standard", title: "Standard (12 pack)", available: true },
      { id: "jumbo", title: "Jumbo (6 pack)", available: true }
    ]
  },
  {
    id: "themed-character-cupcakes",
    title: "Themed Character Cupcakes",
    thumbnail: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=100&h=100&fit=crop",
    category: "Cupcakes",
    variants: [
      { id: "mini", title: "Mini (24 pack)", available: true },
      { id: "standard", title: "Standard (12 pack)", available: true },
      { id: "jumbo", title: "Jumbo (6 pack)", available: true }
    ]
  },
  {
    id: "graduation-cap-cupcakes",
    title: "Graduation Cap Cupcakes",
    thumbnail: "https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=100&h=100&fit=crop",
    category: "Cupcakes",
    variants: [
      { id: "mini", title: "Mini (24 pack)", available: true },
      { id: "standard", title: "Standard (12 pack)", available: true },
      { id: "jumbo", title: "Jumbo (6 pack)", available: true }
    ]
  },
  {
    id: "holiday-themed-cupcakes",
    title: "Holiday Themed Cupcakes",
    thumbnail: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=100&h=100&fit=crop",
    category: "Cupcakes",
    variants: [
      { id: "mini", title: "Mini (24 pack)", available: true },
      { id: "standard", title: "Standard (12 pack)", available: true },
      { id: "jumbo", title: "Jumbo (6 pack)", available: true }
    ]
  },
  {
    id: "gift-box-cupcakes",
    title: "Gift Box Cupcakes",
    thumbnail: "https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=100&h=100&fit=crop",
    category: "Cupcakes",
    variants: [
      { id: "mini", title: "Mini (24 pack)", available: true },
      { id: "standard", title: "Standard (12 pack)", available: true },
      { id: "jumbo", title: "Jumbo (6 pack)", available: true }
    ]
  },
  {
    id: "vanilla-birthday-cake",
    title: "Vanilla Birthday Cake",
    thumbnail: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=100&h=100&fit=crop",
    category: "Birthday Cakes",
    variants: [
      { id: "6-inch-round", title: "6-inch Round", available: true },
      { id: "8-inch-round", title: "8-inch Round", available: true },
      { id: "10-inch-round", title: "10-inch Round", available: true },
      { id: "quarter-sheet", title: "Quarter Sheet", available: true },
      { id: "half-sheet", title: "Half Sheet", available: true }
    ]
  },
  {
    id: "chocolate-birthday-cake",
    title: "Chocolate Birthday Cake",
    thumbnail: "https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=100&h=100&fit=crop",
    category: "Birthday Cakes",
    variants: [
      { id: "6-inch-round", title: "6-inch Round", available: true },
      { id: "8-inch-round", title: "8-inch Round", available: true },
      { id: "10-inch-round", title: "10-inch Round", available: true },
      { id: "quarter-sheet", title: "Quarter Sheet", available: true },
      { id: "half-sheet", title: "Half Sheet", available: true }
    ]
  },
  {
    id: "caramel-cake",
    title: "Caramel Cake",
    thumbnail: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=100&h=100&fit=crop",
    category: "Specialty Cakes",
    variants: [
      { id: "6-inch-round", title: "6-inch Round", available: true },
      { id: "8-inch-round", title: "8-inch Round", available: true },
      { id: "10-inch-round", title: "10-inch Round", available: true }
    ]
  },
  {
    id: "themed-character-cake",
    title: "Themed Character Cake",
    thumbnail: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=100&h=100&fit=crop",
    category: "Specialty Cakes",
    variants: [
      { id: "6-inch-round", title: "6-inch Round", available: true },
      { id: "8-inch-round", title: "8-inch Round", available: true },
      { id: "10-inch-round", title: "10-inch Round", available: true },
      { id: "quarter-sheet", title: "Quarter Sheet", available: true }
    ]
  },
  {
    id: "custom-wedding-cake",
    title: "Custom Wedding Cake",
    thumbnail: "https://images.unsplash.com/photo-1535254973040-607b474cb50d?w=100&h=100&fit=crop",
    category: "Wedding Cakes",
    variants: [
      { id: "single-tier-6", title: "Single Tier - 6 inch", available: true },
      { id: "single-tier-8", title: "Single Tier - 8 inch", available: true },
      { id: "single-tier-10", title: "Single Tier - 10 inch", available: true },
      { id: "two-tier", title: "Two Tier", available: true },
      { id: "three-tier", title: "Three Tier", available: true },
      { id: "four-tier", title: "Four Tier", available: true }
    ]
  },
  {
    id: "three-tier-wedding-cake",
    title: "Three-Tier Wedding Cake",
    thumbnail: "https://images.unsplash.com/photo-1535254973040-607b474cb50d?w=100&h=100&fit=crop",
    category: "Wedding Cakes",
    variants: [
      { id: "standard-three-tier", title: "Standard Three Tier", available: true },
      { id: "deluxe-three-tier", title: "Deluxe Three Tier", available: true }
    ]
  },
  {
    id: "special-anniversary-cake",
    title: "Special Anniversary Cake",
    thumbnail: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=100&h=100&fit=crop",
    category: "Anniversary Cakes",
    variants: [
      { id: "6-inch-round", title: "6-inch Round", available: true },
      { id: "8-inch-round", title: "8-inch Round", available: true },
      { id: "10-inch-round", title: "10-inch Round", available: true }
    ]
  },
  {
    id: "heart-shaped-cake",
    title: "Heart-Shaped Cake",
    thumbnail: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=100&h=100&fit=crop",
    category: "Specialty Cakes",
    variants: [
      { id: "small-heart", title: "Small Heart", available: true },
      { id: "medium-heart", title: "Medium Heart", available: true },
      { id: "large-heart", title: "Large Heart", available: true }
    ]
  },
  {
    id: "company-logo-cake",
    title: "Company Logo Cake",
    thumbnail: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=100&h=100&fit=crop",
    category: "Corporate Cakes",
    allowCustomSize: true
  },
  {
    id: "artistic-design-cake",
    title: "Artistic Design Cake",
    thumbnail: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=100&h=100&fit=crop",
    category: "Specialty Cakes",
    allowCustomSize: true
  },
  {
    id: "assorted-muffins",
    title: "Assorted Muffins",
    thumbnail: "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=100&h=100&fit=crop",
    category: "Muffins",
    variants: [
      { id: "dozen", title: "Dozen (12 pack)", available: true },
      { id: "half-dozen", title: "Half Dozen (6 pack)", available: true },
      { id: "bulk-50", title: "Bulk (50 pack)", available: true },
      { id: "bulk-100", title: "Bulk (100 pack)", available: true }
    ]
  }
];

export const FLOURLANE_PRODUCTS: Product[] = [
  {
    id: "artisan-sourdough-bread",
    title: "Artisan Sourdough Bread",
    thumbnail: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop",
    category: "Artisan Breads",
    variants: [
      { id: "small-loaf", title: "Small Loaf (400g)", available: true },
      { id: "standard-loaf", title: "Standard Loaf (600g)", available: true },
      { id: "large-loaf", title: "Large Loaf (800g)", available: true }
    ]
  },
  {
    id: "fresh-dinner-rolls",
    title: "Fresh Dinner Rolls",
    thumbnail: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop",
    category: "Dinner Rolls",
    variants: [
      { id: "6-pack", title: "6 Pack", available: true },
      { id: "12-pack", title: "12 Pack", available: true },
      { id: "24-pack", title: "24 Pack", available: true },
      { id: "bulk-50", title: "Bulk (50 pack)", available: true }
    ]
  },
  {
    id: "cocoa-swirl-bread",
    title: "Cocoa Swirl Bread",
    thumbnail: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop",
    category: "Sweet Breads",
    variants: [
      { id: "small-loaf", title: "Small Loaf", available: true },
      { id: "standard-loaf", title: "Standard Loaf", available: true },
      { id: "large-loaf", title: "Large Loaf", available: true }
    ]
  },
  {
    id: "strawberry-danish-rolls",
    title: "Strawberry Danish Rolls",
    thumbnail: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop",
    category: "Danish Pastries",
    variants: [
      { id: "6-pack", title: "6 Pack", available: true },
      { id: "12-pack", title: "12 Pack", available: true },
      { id: "24-pack", title: "24 Pack", available: true }
    ]
  },
  {
    id: "vanilla-bean-croissants",
    title: "Vanilla Bean Croissants",
    thumbnail: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop",
    category: "Croissants",
    variants: [
      { id: "6-pack", title: "6 Pack", available: true },
      { id: "12-pack", title: "12 Pack", available: true },
      { id: "24-pack", title: "24 Pack", available: true }
    ]
  },
  {
    id: "multigrain-power-bread",
    title: "Multigrain Power Bread",
    thumbnail: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop",
    category: "Health Breads",
    variants: [
      { id: "small-loaf", title: "Small Loaf (400g)", available: true },
      { id: "standard-loaf", title: "Standard Loaf (600g)", available: true },
      { id: "large-loaf", title: "Large Loaf (800g)", available: true }
    ]
  },
  {
    id: "glazed-honey-donuts",
    title: "Glazed Honey Donuts",
    thumbnail: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop",
    category: "Donuts",
    variants: [
      { id: "6-pack", title: "6 Pack", available: true },
      { id: "12-pack", title: "12 Pack", available: true },
      { id: "24-pack", title: "24 Pack", available: true }
    ]
  },
  {
    id: "double-chocolate-rolls",
    title: "Double Chocolate Rolls",
    thumbnail: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop",
    category: "Sweet Rolls",
    variants: [
      { id: "6-pack", title: "6 Pack", available: true },
      { id: "12-pack", title: "12 Pack", available: true },
      { id: "24-pack", title: "24 Pack", available: true }
    ]
  },
  {
    id: "caramel-swirl-bread",
    title: "Caramel Swirl Bread",
    thumbnail: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop",
    category: "Sweet Breads",
    variants: [
      { id: "small-loaf", title: "Small Loaf", available: true },
      { id: "standard-loaf", title: "Standard Loaf", available: true },
      { id: "large-loaf", title: "Large Loaf", available: true }
    ]
  },
  {
    id: "strawberry-glaze-pastries",
    title: "Strawberry Glaze Pastries",
    thumbnail: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop",
    category: "Pastries",
    variants: [
      { id: "6-pack", title: "6 Pack", available: true },
      { id: "12-pack", title: "12 Pack", available: true },
      { id: "24-pack", title: "24 Pack", available: true }
    ]
  },
  {
    id: "specialty-herb-bread",
    title: "Specialty Herb Bread",
    thumbnail: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop",
    category: "Artisan Breads",
    variants: [
      { id: "small-loaf", title: "Small Loaf", available: true },
      { id: "standard-loaf", title: "Standard Loaf", available: true },
      { id: "large-loaf", title: "Large Loaf", available: true }
    ]
  },
  {
    id: "decorated-french-baguettes",
    title: "Decorated French Baguettes",
    thumbnail: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop",
    category: "Artisan Breads",
    variants: [
      { id: "single", title: "Single Baguette", available: true },
      { id: "pair", title: "Pair (2 baguettes)", available: true },
      { id: "half-dozen", title: "Half Dozen", available: true }
    ]
  },
  {
    id: "themed-birthday-rolls",
    title: "Themed Birthday Rolls",
    thumbnail: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop",
    category: "Themed Breads",
    variants: [
      { id: "12-pack", title: "12 Pack", available: true },
      { id: "24-pack", title: "24 Pack", available: true },
      { id: "50-pack", title: "50 Pack", available: true }
    ]
  },
  {
    id: "special-occasion-bread",
    title: "Special Occasion Bread",
    thumbnail: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop",
    category: "Themed Breads",
    allowCustomSize: true
  },
  {
    id: "logo-embossed-rolls",
    title: "Logo Embossed Rolls",
    thumbnail: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop",
    category: "Corporate Breads",
    allowCustomSize: true
  },
  {
    id: "seasonal-decorated-bread",
    title: "Seasonal Decorated Bread",
    thumbnail: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop",
    category: "Themed Breads",
    allowCustomSize: true
  }
];

// Helper function to get products for a store
export const getProductsForStore = (store: "bannos" | "flourlane"): Product[] => {
  return store === "bannos" ? BANNOS_PRODUCTS : FLOURLANE_PRODUCTS;
};

// Helper function to find a product by title (fuzzy matching)
export const findProductByTitle = (title: string, store: "bannos" | "flourlane"): Product | null => {
  const products = getProductsForStore(store);
  
  // First try exact match
  let product = products.find(p => p.title.toLowerCase() === title.toLowerCase());
  if (product) return product;
  
  // Then try partial match
  product = products.find(p => p.title.toLowerCase().includes(title.toLowerCase()));
  if (product) return product;
  
  // Then try keywords match
  const titleWords = title.toLowerCase().split(/\s+/);
  product = products.find(p => {
    const productWords = p.title.toLowerCase().split(/\s+/);
    return titleWords.some(word => productWords.some(pWord => pWord.includes(word)));
  });
  
  return product || null;
};

// Helper function to convert legacy size to variant
export const convertLegacySizeToVariant = (size: 'S' | 'M' | 'L', product: Product): string => {
  if (!product.variants) {
    return size; // Return original size for custom products
  }
  
  // Map legacy sizes to variant indices
  const sizeIndex = size === 'S' ? 0 : size === 'M' ? 1 : 2;
  const variant = product.variants[sizeIndex];
  
  return variant ? variant.title : size;
};