import JsBarcode from 'jsbarcode';
import { getSupabase } from './supabase';

export interface BarcodeData {
  orderId: string;
  productTitle: string;
  dueDate: string;
  store: 'bannos' | 'flourlane';
}

export interface PrintBarcodeParams {
  orderId: string;
  barcode: string;
  performedBy: string;
  context?: Record<string, any>;
}

/**
 * Generate a Code 128 barcode as a data URL
 */
export function generateBarcodeDataUrl(
  orderId: string,
  options: {
    width?: number;
    height?: number;
    fontSize?: number;
  } = {}
): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  try {
    JsBarcode(canvas, orderId, {
      format: "CODE128",
      width: options.width || 2,
      height: options.height || 80,
      displayValue: true,
      fontSize: options.fontSize || 12,
      margin: 10,
      background: "#ffffff",
      lineColor: "#000000"
    });
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error generating barcode:', error);
    throw new Error('Failed to generate barcode');
  }
}

/**
 * Generate a printable HTML document with barcode
 */
export function generatePrintableHTML(data: BarcodeData): string {
  const barcodeDataUrl = generateBarcodeDataUrl(data.orderId);
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Barcode - ${data.orderId}</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
          
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            text-align: center;
            background: white;
          }
          
          .barcode-container {
            border: 1px solid #ccc;
            padding: 20px;
            margin: 20px auto;
            max-width: 400px;
            background: white;
          }
          
          .barcode-image {
            margin-bottom: 15px;
          }
          
          .order-info {
            font-size: 14px;
            line-height: 1.4;
          }
          
          .order-id { 
            font-weight: bold; 
            font-size: 18px; 
            margin-bottom: 8px;
            color: #1f2937;
          }
          
          .product { 
            color: #6b7280; 
            margin-bottom: 4px;
            font-size: 14px;
          }
          
          .due-date { 
            color: #6b7280; 
            font-size: 12px;
          }
          
          .store-badge {
            display: inline-block;
            background: ${data.store === 'bannos' ? '#3b82f6' : '#ec4899'};
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="barcode-container">
          <div class="barcode-image">
            <img src="${barcodeDataUrl}" alt="Barcode ${data.orderId}" />
          </div>
          <div class="order-info">
            <div class="order-id">${data.orderId}</div>
            <div class="product">${data.productTitle}</div>
            <div class="due-date">Due: ${new Date(data.dueDate).toLocaleDateString()}</div>
            <div class="store-badge">${data.store.toUpperCase()}</div>
          </div>
        </div>
        
        <div class="no-print" style="margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Print Barcode
          </button>
        </div>
      </body>
    </html>
  `;
}

/**
 * Print barcode using browser print dialog
 */
export function printBarcode(data: BarcodeData): void {
  const html = generatePrintableHTML(data);
  const printWindow = window.open('', '_blank');
  
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for image to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  } else {
    throw new Error('Could not open print window. Please check popup blockers.');
  }
}

/**
 * Download barcode as PNG image
 */
export function downloadBarcode(data: BarcodeData): void {
  const barcodeDataUrl = generateBarcodeDataUrl(data.orderId);
  const link = document.createElement('a');
  link.download = `barcode-${data.orderId}.png`;
  link.href = barcodeDataUrl;
  link.click();
}

/**
 * Call the handle_print_barcode RPC
 */
export async function handlePrintBarcode(params: PrintBarcodeParams): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('handle_print_barcode', {
      p_barcode: params.barcode,
      p_order_id: params.orderId,
      p_performed_by: params.performedBy,
      p_context: params.context || {}
    });
    
    if (error) {
      console.error('Error calling handle_print_barcode:', error);
      throw error;
    }
    
    return data === true;
  } catch (error) {
    console.error('Failed to handle print barcode:', error);
    throw error;
  }
}

/**
 * Complete barcode printing workflow
 */
export async function printBarcodeWorkflow(
  data: BarcodeData,
  performedBy: string
): Promise<void> {
  try {
    // 1. Call the RPC to record the print action
    await handlePrintBarcode({
      orderId: data.orderId,
      barcode: data.orderId, // Using orderId as barcode
      performedBy,
      context: {
        product_title: data.productTitle,
        due_date: data.dueDate,
        store: data.store
      }
    });
    
    // 2. Generate and print the barcode
    printBarcode(data);
    
  } catch (error) {
    console.error('Barcode printing workflow failed:', error);
    throw error;
  }
}
