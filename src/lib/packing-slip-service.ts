/**
 * Packing Slip Service
 * Generates printable packing slips for orders
 * Based on the Shopify Liquid template design
 */

import type { ShippingAddress } from './rpc-client';

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format date as DD/MM/YY
 */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
}

/**
 * Format order number with store prefix (#F or #B)
 */
function formatOrderNumber(orderNumber: string, store: 'bannos' | 'flourlane'): string {
  // If already has a prefix like #F or #B, return as is
  if (orderNumber.startsWith('#F') || orderNumber.startsWith('#B')) {
    return orderNumber;
  }
  // If starts with F or B (without #), add #
  if (orderNumber.startsWith('F') || orderNumber.startsWith('B')) {
    return `#${orderNumber}`;
  }
  // Add store prefix
  const prefix = store === 'bannos' ? '#B' : '#F';
  // Remove any existing #
  const cleanNumber = orderNumber.replace(/^#/, '');
  return `${prefix}${cleanNumber}`;
}

interface AccessoryItem {
  title: string;
  quantity: number;
  price: string;
  variant_title?: string | null;
}

interface PackingSlipData {
  orderNumber: string;
  customerName: string;
  dueDate: string;
  deliveryMethod: 'Delivery' | 'Pickup';
  product: string;
  size: string;
  quantity: number;
  flavor?: string;
  cakeWriting?: string;
  accessories?: AccessoryItem[] | null;
  notes?: string;
  productImage?: string | null;
  shippingAddress?: ShippingAddress | null;
  store: 'bannos' | 'flourlane';
}

/**
 * Format shipping address for display (with HTML escaping)
 * Matches Shopify packing slip format
 */
function formatAddress(address: ShippingAddress | null | undefined): string {
  if (!address) return '';

  const parts: string[] = [];

  if (address.name) parts.push(escapeHtml(address.name));
  if (address.company) parts.push(escapeHtml(address.company));
  if (address.address1) parts.push(escapeHtml(address.address1));
  if (address.address2) parts.push(escapeHtml(address.address2));

  // Format city line with spaces like Shopify: "Gledswood Hills NSW 2557"
  const cityLine = [
    escapeHtml(address.city),
    escapeHtml(address.province_code || address.province),
    escapeHtml(address.zip)
  ].filter(Boolean).join(' ');
  if (cityLine) parts.push(cityLine);

  if (address.country) parts.push(escapeHtml(address.country));
  if (address.phone) parts.push(escapeHtml(address.phone));

  return parts.join('<br/>');
}

/**
 * Sanitize string for Code 39 barcode (A-Z 0-9 - . $ / + % SPACE only)
 */
function sanitizeForBarcode(str: string): string {
  return str.toUpperCase().replace(/[^A-Z0-9\-.\$\/+% ]/g, '');
}

/**
 * Get shop info based on store
 */
function getShopInfo(store: 'bannos' | 'flourlane') {
  if (store === 'bannos') {
    return {
      name: "Bannos Cakes",
      address1: "Shop 4, 82 Reservoir Road",
      city: "Blacktown",
      province: "NSW",
      zip: "2148",
      country: "Australia"
    };
  } else {
    return {
      name: "Flour Lane",
      address1: "177 Parramatta Rd",
      city: "Annandale",
      province: "NSW",
      zip: "2038",
      country: "Australia"
    };
  }
}

/**
 * Generate packing slip HTML
 */
export function generatePackingSlipHTML(data: PackingSlipData): string {
  const shop = getShopInfo(data.store);
  const isDelivery = data.deliveryMethod === 'Delivery';
  const dateLabel = isDelivery ? 'Delivery Date' : 'Pickup Date';

  // Format accessories list (with HTML escaping)
  const accessoriesHTML = data.accessories && data.accessories.length > 0
    ? data.accessories.map(acc => `
        <tr>
          <td class="product-image-cell">
            <span style="font-size: 10px; color: #777;">Accessory</span>
          </td>
          <td style="text-align: left; font-size: 1.2em; font-weight: bold;">${acc.quantity}</td>
          <td style="text-align: left;">
            <strong style="font-size: 1.1em;">${escapeHtml(acc.title)}</strong>
            ${acc.variant_title ? `<br/><small>${escapeHtml(acc.variant_title)}</small>` : ''}
          </td>
        </tr>
      `).join('')
    : '';

  // Build properties list (cake writing, size, flavor) - with HTML escaping
  const propertiesHTML: string[] = [];
  if (data.size && data.size !== 'Unknown') {
    propertiesHTML.push(`<small style="font-size: 1.1em;"><strong>Size:</strong> ${escapeHtml(data.size)}</small>`);
  }
  if (data.flavor) {
    propertiesHTML.push(`<small style="font-size: 1.1em;"><strong>Flavour:</strong> ${escapeHtml(data.flavor)}</small>`);
  }
  if (data.cakeWriting) {
    propertiesHTML.push(`<small style="font-size: 1.1em;"><strong>Writing On Cake:</strong> ${escapeHtml(data.cakeWriting)}</small>`);
  }

  // Format and escape user-provided content
  const formattedOrderNumber = formatOrderNumber(data.orderNumber, data.store);
  const safeOrderNumber = escapeHtml(formattedOrderNumber);
  const safeDueDate = escapeHtml(formatDate(data.dueDate));
  const safeProduct = escapeHtml(data.product);
  const safeNotes = escapeHtml(data.notes);
  const safeCustomerName = escapeHtml(data.customerName);
  // Sanitize for Code 39 barcode (uppercase, valid chars only)
  const barcodeValue = sanitizeForBarcode(formattedOrderNumber.replace('#', ''));

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Packing Slip - ${safeOrderNumber}</title>
  <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap" rel="stylesheet">
  <style type="text/css">
    body { font-family: sans-serif; margin: 0; padding: 0; font-size: 14px; }
    .wrapper { width: 8.5in; margin: 0 auto; padding: 0.5in; box-sizing: border-box; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5em; }
    h1 { font-size: 2em; margin: 0; }
    h2 { font-size: 1.5em; margin: 1.5em 0 0.5em; }
    .order-info { text-align: right; margin-left: auto; }
    .large-order-number { font-size: 2.2em; font-weight: bold; margin-bottom: 5px; }
    .customer-name { font-size: 1.4em; font-weight: bold; color: #333; margin: 5px 0; }
    .delivery-date-highlight { font-size: 1.6em; font-weight: bold; color: red; margin-top: 10px; }
    .address-section { display: flex; justify-content: space-between; margin-top: 1.5em; }
    .address-column { flex: 1; padding-right: 1em; line-height: 1.5; }
    .address-column:last-child { padding-right: 0; }
    .address-column strong { display: block; margin-bottom: 0.3em; font-size: 1.1em; }
    hr.thick-separator { border: none; border-top: 2px solid #444; margin: 1.5em 0; }
    table.product-table { width: 100%; border-collapse: collapse; margin-top: 1em; }
    table.product-table th, table.product-table td { padding: 10px; border-bottom: 2px solid #444; vertical-align: top; }
    table.product-table th { text-align: left; background-color: #f0f0f0; font-weight: bold; }
    table.product-table td small { font-size: 0.9em; color: #555; display: block; margin-top: 3px; }
    td.product-image-cell { width: 10%; text-align: left; padding-right: 10px; vertical-align: top; }
    .notes-section { margin-top: 1.5em; line-height: 1.5; padding: 10px; background-color: #fff8dc; border: 1px solid #ddd; border-radius: 4px; }
    .notes-section strong { display: block; margin-bottom: 0.3em; font-size: 1.1em; }
    .barcode-bottom-left { text-align: left; margin: 2em 0 0 0; }
    .barcode { font-family: 'Libre Barcode 39', monospace; letter-spacing: 2px; margin-top: 20px; }
    .barcode-label { font-weight: bold; margin-top: 8px; }
    .big-barcode { font-size: 64px; }
    .big-label { font-size: 28px; }
    .product-image { width: 58px; height: 58px; object-fit: contain; display: block; border: 1px solid #ccc; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .wrapper { padding: 0.25in; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Packing Slip</h1>
      <div class="order-info">
        <p class="large-order-number">
          Order ${safeOrderNumber}
        </p>
        <p class="customer-name">${safeCustomerName}</p>
        <p class="delivery-date-highlight">
          ${dateLabel}: ${safeDueDate}
        </p>
      </div>
    </div>

    <hr class="thick-separator" />

    <div class="address-section">
      <div class="address-column">
        <strong>From</strong>
        ${shop.name}<br/>
        ${shop.address1}<br/>
        ${shop.city}, ${shop.province} ${shop.zip}<br/>
        ${shop.country}
      </div>
      ${isDelivery && data.shippingAddress ? `
      <div class="address-column">
        <strong>Ship to</strong>
        ${formatAddress(data.shippingAddress)}
      </div>
      <div class="address-column">
        <strong>Bill to</strong>
        ${formatAddress(data.shippingAddress)}
      </div>
      ` : ''}
    </div>

    <hr class="thick-separator" />

    <h2>Order Details</h2>
    <table class="product-table" style="margin: 1em 0 0 0;">
      <thead>
        <tr>
          <th style="width: 10%; text-align: left;">Image</th>
          <th style="width: 10%; text-align: left;">Qty</th>
          <th style="width: 80%; text-align: left;">Item</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="product-image-cell">
            ${data.productImage
              ? `<img src="${escapeHtml(data.productImage)}" alt="${safeProduct}" class="product-image" />`
              : '<span style="font-size: 10px; color: #777;">No image</span>'
            }
          </td>
          <td style="text-align: left; font-size: 1.2em; font-weight: bold;">${data.quantity}</td>
          <td style="text-align: left;">
            <strong style="font-size: 1.1em;">${safeProduct}</strong><br/>
            ${propertiesHTML.join('<br/>')}
          </td>
        </tr>
        ${accessoriesHTML}
      </tbody>
    </table>

    ${safeNotes ? `
    <div class="notes-section">
      <strong>Notes:</strong> ${safeNotes}
    </div>
    ` : ''}

    <!-- Big Barcode -->
    <div class="barcode-bottom-left">
      <div class="barcode big-barcode">*${barcodeValue}*</div>
      <div class="barcode-label big-label">Order #: ${safeOrderNumber}</div>
    </div>
  </div>

  <script>
    // Wait for fonts to load before printing
    window.onload = function() {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function() {
          window.print();
        });
      } else {
        // Fallback for older browsers - wait a bit for font
        setTimeout(function() {
          window.print();
        }, 500);
      }
    };
  </script>
</body>
</html>
  `.trim();
}

/**
 * Print packing slip by opening in new window
 */
export function printPackingSlip(data: PackingSlipData): void {
  const html = generatePackingSlipHTML(data);

  // Open new window and write HTML
  const printWindow = window.open('', '_blank', 'width=850,height=1100');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    throw new Error('Could not open print window. Please check popup blocker settings.');
  }
}
