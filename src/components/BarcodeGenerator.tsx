import React, { useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import { Button } from './ui/button';
import { Printer, Download } from 'lucide-react';

interface BarcodeGeneratorProps {
  orderId: string;
  productTitle: string;
  dueDate: string;
  store: 'bannos' | 'flourlane';
  onPrint?: () => void;
  onDownload?: () => void;
  className?: string;
}

export function BarcodeGenerator({
  orderId,
  productTitle,
  dueDate,
  store,
  onPrint,
  onDownload,
  className = ''
}: BarcodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate barcode when component mounts or props change
  useEffect(() => {
    if (canvasRef.current && orderId) {
      try {
        // Clear canvas first
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        // Generate Code 128 barcode
        JsBarcode(canvas, orderId, {
          format: "CODE128",
          width: 2,
          height: 80,
          displayValue: true,
          fontSize: 12,
          margin: 10,
          background: "#ffffff",
          lineColor: "#000000"
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
        // Show error on canvas
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ff0000';
            ctx.font = '14px Arial';
            ctx.fillText('Barcode Error', 10, 40);
          }
        }
      }
    }
  }, [orderId, productTitle, dueDate, store]);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      // Default print behavior
      const canvas = canvasRef.current;
      if (canvas) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          const barcodeDataUrl = canvas.toDataURL();
          
          printWindow.document.write(`
            <html>
              <head>
                <title>Barcode - ${orderId}</title>
                <style>
                  body { 
                    font-family: Arial, sans-serif; 
                    margin: 20px; 
                    text-align: center;
                  }
                  .barcode-container {
                    border: 1px solid #ccc;
                    padding: 20px;
                    margin: 20px auto;
                    max-width: 400px;
                  }
                  .order-info {
                    margin-top: 15px;
                    font-size: 14px;
                    line-height: 1.4;
                  }
                  .order-id { font-weight: bold; font-size: 16px; }
                  .product { color: #666; }
                  .due-date { color: #666; }
                </style>
              </head>
              <body>
                <div class="barcode-container">
                  <img src="${barcodeDataUrl}" alt="Barcode" />
                  <div class="order-info">
                    <div class="order-id">${orderId}</div>
                    <div class="product">${productTitle}</div>
                    <div class="due-date">Due: ${new Date(dueDate).toLocaleDateString()}</div>
                  </div>
                </div>
                <script>
                  // Track print state to prevent duplicate calls
                  let hasPrinted = false;
                  
                  function triggerPrint() {
                    if (hasPrinted) return;
                    hasPrinted = true;
                    window.print();
                  }
                  
                  // Wait for the image to load before printing
                  const img = document.querySelector('img');
                  if (img) {
                    if (img.complete && img.naturalHeight !== 0) {
                      // Image already loaded
                      triggerPrint();
                    } else {
                      // Wait for image to load
                      img.addEventListener('load', triggerPrint);
                      img.addEventListener('error', function() {
                        console.warn('Image failed to load, printing anyway');
                        triggerPrint();
                      });
                    }
                  } else {
                    // No image found, print immediately
                    triggerPrint();
                  }
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
        } else {
          console.error('Could not open print window - popup blocked?');
        }
      } else {
        console.error('Canvas not found');
      }
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      // Default download behavior
      const canvas = canvasRef.current;
      if (canvas) {
        const link = document.createElement('a');
        link.download = `barcode-${orderId}.png`;
        link.href = canvas.toDataURL();
        link.click();
      } else {
        console.error('Canvas not found for download');
      }
    }
  };

  return (
    <div className={`barcode-generator ${className}`}>
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        
        {/* Barcode Canvas */}
        <div className="flex flex-col items-center mb-4">
          <canvas 
            ref={canvasRef} 
            className="border border-gray-300"
            width={300}
            height={100}
            style={{ backgroundColor: '#f0f0f0' }}
          />
        </div>
        
        {/* Order Information */}
        <div className="text-center mb-4">
          <div className="font-bold text-lg text-gray-900">{orderId}</div>
          <div className="text-sm text-gray-600 mt-1">{productTitle}</div>
          <div className="text-xs text-gray-500 mt-1">
            Due: {new Date(dueDate).toLocaleDateString()}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2 justify-center">
          <Button
            onClick={handlePrint}
            size="sm"
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>
    </div>
  );
}

export default BarcodeGenerator;
