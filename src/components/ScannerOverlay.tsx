import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { X, Camera, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner@2.0.3";

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
  const [manualInput, setManualInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !order) return null;

  const handleScan = (scannedCode: string) => {
    setIsProcessing(true);
    
    // Simulate scan processing
    setTimeout(() => {
      setIsProcessing(false);
      
      // Check if scanned code matches the order
      if (scannedCode === order.orderNumber || scannedCode === order.id) {
        setScanState('confirming');
        setErrorMessage("");
      } else {
        setScanState('error');
        setErrorMessage("Invalid barcode. This doesn't match the expected order.");
      }
    }, 1000);
  };

  const handleManualScan = () => {
    if (!manualInput.trim()) return;
    handleScan(manualInput.trim());
  };

  const handleConfirm = () => {
    setIsProcessing(true);
    
    // Simulate completion processing
    setTimeout(() => {
      setScanState('success');
      setIsProcessing(false);
      
      setTimeout(() => {
        toast.success(`${order.stage} stage completed for ${order.orderNumber}`);
        onOrderCompleted(order.id);
        handleClose();
      }, 1500);
    }, 1000);
  };

  const handleClose = () => {
    setScanState('scanning');
    setManualInput("");
    setErrorMessage("");
    setIsProcessing(false);
    onClose();
  };

  const handleContinueScanning = () => {
    setScanState('scanning');
    setErrorMessage("");
    setManualInput("");
  };

  const simulatedScan = () => {
    // Simulate a successful scan for demo purposes
    handleScan(order.orderNumber);
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

      {/* Camera View Simulation */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center space-y-8">
          <Camera className="h-24 w-24 text-white/60 mx-auto" />
          <div className="text-white/80">
            <p className="text-lg mb-2">Position the barcode in the camera view</p>
            <p className="text-sm">Or use manual entry below</p>
          </div>
          
          {/* Demo Scan Button */}
          <Button 
            onClick={simulatedScan}
            disabled={isProcessing}
            className="bg-white/20 hover:bg-white/30 text-white"
          >
            {isProcessing ? "Scanning..." : "Simulate Scan (Demo)"}
          </Button>
        </div>

        {/* Scan Target Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-64 h-32 border-2 border-white/50 rounded-lg relative">
            <div className="absolute -top-1 -left-1 w-8 h-8 border-l-2 border-t-2 border-white"></div>
            <div className="absolute -top-1 -right-1 w-8 h-8 border-r-2 border-t-2 border-white"></div>
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-l-2 border-b-2 border-white"></div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-r-2 border-b-2 border-white"></div>
          </div>
        </div>
      </div>

      {/* Manual Input Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-black/80 backdrop-blur-sm">
        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manual-input" className="text-sm">
              Manual Entry
            </Label>
            <div className="flex gap-2">
              <Input
                id="manual-input"
                placeholder="Enter barcode or order number..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualScan()}
                disabled={isProcessing}
              />
              <Button 
                onClick={handleManualScan}
                disabled={!manualInput.trim() || isProcessing}
              >
                {isProcessing ? "Scanning..." : "Scan"}
              </Button>
            </div>
          </div>

          {scanState === 'error' && errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{errorMessage}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}