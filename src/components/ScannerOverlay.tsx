import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { X, AlertCircle, CheckCircle, CameraOff } from "lucide-react";
import { toast } from "sonner";
import { CameraScanner } from "./CameraScanner";
import { getOrderForScan } from "../lib/rpc-client";
import { useStageMutations } from "../hooks/useQueueMutations";
import { formatOrderNumber } from "../lib/format-utils";
import type { QueueItem } from "../types/queue";

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
  const [cameraFailed, setCameraFailed] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [isScanLookupPending, setIsScanLookupPending] = useState(false);

  // Use centralized mutation hooks for cache invalidation
  const stageMutations = useStageMutations();
  const isProcessing = stageMutations.isPending || isScanLookupPending;

  if (!isOpen || !order) return null;

  // Get formatted order number for display
  const displayOrderNumber = order.shopifyOrderNumber
    ? formatOrderNumber(order.shopifyOrderNumber, order.store, order.id)
    : order.orderNumber;

  // Determine if this scan will START or COMPLETE the stage
  const isStartAction = (): boolean => {
    if (order.stage === 'Covering' && !order.covering_start_ts) return true;
    if (order.stage === 'Decorating' && !order.decorating_start_ts) return true;
    return false;
  };

  const actionVerb = isStartAction() ? 'start' : 'complete';
  const actionVerbPast = isStartAction() ? 'started' : 'completed';
  const actionVerbCapitalized = isStartAction() ? 'Start' : 'Completion';

  const handleScan = async (scannedCode: string) => {
    setIsScanLookupPending(true);
    setErrorMessage("");

    try {
      // Use RPC to normalize barcode and lookup order
      // Handles: #B18617, #F18617, bannos-18617, flourlane-18617, plain 18617
      const scannedOrder = await getOrderForScan(scannedCode);

      setIsScanLookupPending(false);

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
        const scannedDisplayNumber = formatOrderNumber(scannedOrder.shopify_order_number, scannedOrder.store, scannedOrder.id);
        setErrorMessage(`Wrong order scanned. Expected ${displayOrderNumber}, got ${scannedDisplayNumber}.`);
      }
    } catch (error) {
      console.error('Scan failed:', error);
      setIsScanLookupPending(false);
      setScanState('error');
      setErrorMessage('Scan failed. Please try again.');
    }
  };

  const handleCameraScan = (result: string) => {
    if (isScanLookupPending) return;
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
    if (isScanLookupPending) return;
    if (manualInput.trim()) {
      handleScan(manualInput.trim());
    }
  };

  const handleConfirm = () => {
    if (!order) return;

    // Call appropriate stage RPC based on current stage
    // Covering and Decorating use first-scan-starts / second-scan-completes pattern
    const store = order.store || 'bannos'; // Default to bannos if store not found
    let actionMessage = '';

    const onSuccess = () => {
      setScanState('success');

      setTimeout(() => {
        toast.success(`${actionMessage} for ${displayOrderNumber}`);
        onOrderCompleted(order.id);
        handleClose();
      }, 1500);
    };

    const onError = (error: unknown) => {
      console.error('Error processing stage:', error);
      setScanState('error');
      setErrorMessage(`Failed to process ${order.stage} stage. Please try again.`);
    };

    switch (order.stage) {
      case 'Filling':
        actionMessage = `${order.stage} stage completed`;
        stageMutations.completeFilling.mutate(
          { orderId: order.id, store },
          { onSuccess, onError }
        );
        break;
      case 'Covering':
        if (!order.covering_start_ts) {
          // First scan - START the stage
          actionMessage = `${order.stage} stage started`;
          stageMutations.startCovering.mutate(
            { orderId: order.id, store },
            { onSuccess, onError }
          );
        } else {
          // Second scan - COMPLETE the stage
          actionMessage = `${order.stage} stage completed`;
          stageMutations.completeCovering.mutate(
            { orderId: order.id, store },
            { onSuccess, onError }
          );
        }
        break;
      case 'Decorating':
        if (!order.decorating_start_ts) {
          // First scan - START the stage
          actionMessage = `${order.stage} stage started`;
          stageMutations.startDecorating.mutate(
            { orderId: order.id, store },
            { onSuccess, onError }
          );
        } else {
          // Second scan - COMPLETE the stage
          actionMessage = `${order.stage} stage completed`;
          stageMutations.completeDecorating.mutate(
            { orderId: order.id, store },
            { onSuccess, onError }
          );
        }
        break;
      case 'Packing':
        // Packing only needs one scan to complete (no start scan required)
        actionMessage = `${order.stage} stage completed`;
        stageMutations.completePacking.mutate(
          { orderId: order.id, store },
          { onSuccess, onError }
        );
        break;
      default:
        setScanState('error');
        setErrorMessage(`Unknown stage: ${order.stage}`);
    }
  };

  const handleClose = () => {
    setScanState('scanning');
    setErrorMessage("");
    setCameraFailed(false);
    setManualInput("");
    setIsScanLookupPending(false);
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
            <CheckCircle className="h-12 w-12 text-success mx-auto" />
            <h3 className="text-lg font-medium">Confirm {actionVerbCapitalized}</h3>
            <p className="text-sm text-muted-foreground">
              {isStartAction() ? 'Start' : 'Mark'} <span className="font-medium">{displayOrderNumber}</span> <span className="font-medium">{order.stage}</span> stage {actionVerb}?
            </p>
          </div>
          <div className="flex gap-4">
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
            <CheckCircle className="h-16 w-16 text-success mx-auto" />
            <h3 className="text-lg font-medium">Stage {isStartAction() ? 'Started' : 'Completed'}!</h3>
            <p className="text-sm text-muted-foreground">
              {displayOrderNumber} - {order.stage} stage has been {actionVerbPast}
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
              Scan order to {actionVerb} {order.stage}
            </h2>
            <p className="text-sm text-white/80">
              Order: {displayOrderNumber}
            </p>
          </div>
          <Button
            variant="ghost"
            size="default"
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
            <div className="flex items-center gap-2 text-warning">
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