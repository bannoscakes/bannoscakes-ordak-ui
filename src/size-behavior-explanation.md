# Size Field Behavior - Order Detail vs Edit Order

## Current Correct Behavior

### 1. Order Detail Drawer (View Mode)
- **Path**: Click "Open Order" from 3-dot menu
- **Size Display**: Shows realistic text like "Medium Tall", "8-inch Round", "Standard", etc.
- **Behavior**: Read-only, no dropdown

### 2. Edit Order Drawer (Edit Mode)  
- **Path**: Click "Edit Order" from 3-dot menu
- **Size Display**: Shows dropdown with S, M, L options for selection
- **Behavior**: Editable dropdown for changing the size

## Expected Transformations in Order Detail Drawer

### Bannos Store (Cake & Desserts):
- **Cupcakes**: S=Mini, M=Standard, L=Jumbo
- **Wedding Cakes**: S=6-inch Round, M=8-inch Round, L=10-inch Round  
- **Birthday/Regular Cakes**: S=Small, M=Medium Tall, L=8-inch Round
- **Default**: S=Small, M=Medium, L=Large

### Flourlane Store (Bakery Items):
- **All Products**: S=Small Loaf, M=Standard, L=Large Batch

## How to Test

1. Go to Bannos Production page
2. Click any order's 3-dot menu → "Open Order" (NOT "Edit Order")
3. Check the Size field - should show realistic text
4. Try with different product types (cupcakes vs cakes vs wedding cakes)

## If You See Dropdown

If you see a dropdown with S/M/L options, you're in the **Edit Order drawer**, which is correct behavior for editing mode.