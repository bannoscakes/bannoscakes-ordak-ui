import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { X, AlertCircle, CheckCircle, CameraOff } from "lucide-react";
import { toast } from "sonner";
import { CameraScanner } from "./CameraScanner";
import { completeFilling, completeCovering, completeDecorating, completePacking, startCovering, startDecorating, getOrderForScan } from "../lib/rpc-client";

interface QueueItem {
  id: string;
  orderNumber: string;
  customerName: string;
  product: string;
  size: 'S' | 'M' | 'L';
  quantity: number;
  deliveryTime: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'In Production' | 'Pending' | 'Quality Check' | 'Completed' | 'Scheduled';
  flavor: string;
  dueTime: string;
  method?: 'Delivery' | 'Pickup';
  storage?: string;
  store: 'bannos' | 'flourlane';
  stage: string;
  // Timestamps for stage tracking
  covering_start_ts?: string | null;
  decorating_start_ts?: string | null;
}

interface ScannerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  order: QueueItem | null;
  onOrderCompleted: (orderId: string) => void;
}

type ScanState = 'scanning' | 'confirming' | 'success' | 'error';

export function ScannerOverlay({ isOpen, onClose, order, onOrderCompleted }: ScannerOverlayProps) {
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [manualInput, setManualInput] = useState("");

  if (!isOpen || !order) return null;

  const handleScan = async (scannedCode: string) => {
    setIsProcessing(true);
    setErrorMessage("");

    try {
      // Use RPC to normalize barcode and lookup order
      // Handles: #B18617, #F18617, bannos-18617, flourlane-18617, plain 18617
      const scannedOrder = await getOrderForScan(scannedCode);

      setIsProcessing(false);

      if (!scannedOrder) {
        setScanState('error');
        setErrorMessage("Order not found. Check the barcode and try again.");
        return;
      }

      // Check if scanned order matches the expected order
      if (scannedOrder.id === order.id) {
        setScanState('confirming');
        setErrorMessage("");
      } else {
        setScanState('error');
        setErrorMessage(`Wrong order scanned. Expected ${order.orderNumber}, got ${scannedOrder.id}.`);
      }
    } catch (error) {
      setIsProcessing(false);
      setScanState('error');
      setErrorMessage(`Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCameraScan = (result: string) => {
    console.log('Camera scan result:', result);
    handleScan(result);
  };

  const handleCameraError = (error: string) => {
    console.error('Camera error:', error);
    setErrorMessage(error);
    setScanState('error');
  };

  const handleCameraFailed = () => {
    setCameraFailed(true);
  };

  const handleManualScan = () => {
    if (manualInput.trim()) {
      handleScan(manualInput.trim());
    }
  };

  const handleConfirm = async () => {
    if (!order) return;

    setIsProcessing(true);

    try {
      // Call appropriate stage RPC based on current stage
      // Covering and Decorating use first-scan-starts / second-scan-completes pattern
      const store = order.store || 'bannos'; // Default to bannos if store not found
      let actionMessage = '';

      switch (order.stage) {
        case 'Filling':
          await completeFilling(order.id, store);
          actionMessage = `${order.stage} stage completed`;
          break;
        case 'Covering':
          if (!order.covering_start_ts) {
            // First scan - START the stage
            await startCovering(order.id, store);
            actionMessage = `${order.stage} stage started`;
          } else {
            // Second scan - COMPLETE the stage
            await completeCovering(order.id, store);
            actionMessage = `${order.stage} stage completed`;
          }
          break;
        case 'Decorating':
          if (!order.decorating_start_ts) {
            // First scan - START the stage
            await startDecorating(order.id, store);
            actionMessage = `${order.stage} stage started`;
          } else {
            // Second scan - COMPLETE the stage
            await completeDecorating(order.id, store);
            actionMessage = `${order.stage} stage completed`;
          }
          break;
        case 'Packing':
          // Packing only needs one scan to complete (no start scan required)
          await completePacking(order.id, store);
          actionMessage = `${order.stage} stage completed`;
          break;
        default:
          throw new Error(`Unknown stage: ${order.stage}`);
      }

      setScanState('success');
      setIsProcessing(false);

      setTimeout(() => {
        toast.success(`${actionMessage} for ${order.orderNumber}`);
        onOrderCompleted(order.id);
        handleClose();
      }, 1500);

    } catch (error) {
      console.error('Error processing stage:', error);
      setIsProcessing(false);
      setScanState('error');
      setErrorMessage(`Failed to process ${order.stage} stage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleClose = () => {
    setScanState('scanning');
    setErrorMessage("");
    setIsProcessing(false);
    setCameraFailed(false);
    setManualInput("");
    onClose();
  };

  const handleContinueScanning = () => {
    setScanState('scanning');
    setErrorMessage("");
  };

  if (scanState === 'confirming') {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-6 space-y-6">
          <div className="text-center space-y-2">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <h3 className="text-lg font-medium">Confirm Completion</h3>
            <p className="text-sm text-muted-foreground">
              Mark <span className="font-medium">{order.orderNumber}</span> <span className="font-medium">{order.stage}</span> stage complete?
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? "Processing..." : "Confirm"}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleContinueScanning}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (scanState === 'success') {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-6 space-y-6">
          <div className="text-center space-y-2">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h3 className="text-lg font-medium">Stage Completed!</h3>
            <p className="text-sm text-muted-foreground">
              {order.orderNumber} - {order.stage} stage has been marked complete
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 bg-black/50 backdrop-blur-sm z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-white">
              Scan order to complete {order.stage}
            </h2>
            <p className="text-sm text-white/80">
              Order: {order.orderNumber}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Camera View */}
      <div className="absolute inset-0 bg-black flex items-center justify-center">
        <div className="w-full h-full flex items-center justify-center p-4">
          <CameraScanner
            onScan={handleCameraScan}
            onError={handleCameraError}
            onCameraFailed={handleCameraFailed}
            isActive={isOpen && scanState === 'scanning'}
            className="w-full max-w-2xl"
          />
        </div>
      </div>

      {/* Manual Entry Fallback - only shown when camera fails */}
      {cameraFailed && scanState === 'scanning' && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-black/90 backdrop-blur-sm">
          <Card className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <CameraOff className="h-5 w-5" />
              <span className="text-sm font-medium">Camera unavailable - enter barcode manually</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-barcode" className="text-sm">Order Number</Label>
              <div className="flex gap-2">
                <Input
                  id="manual-barcode"
                  type="text"
                  placeholder="Enter order number..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualScan()}
                  disabled={isProcessing}
                  className="flex-1"
                />
                <Button
                  onClick={handleManualScan}
                  disabled={isProcessing || !manualInput.trim()}
                >
                  {isProcessing ? "Processing..." : "Submit"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Error Display */}
      {scanState === 'error' && errorMessage && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-black/80 backdrop-blur-sm">
          <Card className="p-4">
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{errorMessage}</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}