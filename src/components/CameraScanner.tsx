import { useRef, useEffect, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { Button } from './ui/button';
import { AlertCircle, Camera, CameraOff } from 'lucide-react';

interface CameraScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  isActive: boolean;
  className?: string;
}

export function CameraScanner({ onScan, isActive, className = '' }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>();

  // Initialize the barcode reader
  useEffect(() => {
    if (!readerRef.current) {
      readerRef.current = new BrowserMultiFormatReader();
    }

    return () => {
      stopScanning();
    };
  }, []);

  // Get available cameras
  useEffect(() => {
    if (isActive && readerRef.current) {
      getAvailableDevices();
    }
  }, [isActive]);

  const getAvailableDevices = async () => {
    try {
      const videoInputDevices = await readerRef.current!.listVideoInputDevices();
      setDevices(videoInputDevices);
      
      // Prefer back camera if available (usually last in the list)
      if (videoInputDevices.length > 0) {
        const backCamera = videoInputDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear')
        );
        setSelectedDeviceId(backCamera?.deviceId || videoInputDevices[videoInputDevices.length - 1].deviceId);
      }
    } catch (err) {
      console.error('Error getting camera devices:', err);
      setError('Could not access camera devices');
    }
  };

  const startScanning = async () => {
    if (!readerRef.current || !videoRef.current || !selectedDeviceId) {
      setError('Camera not available');
      return;
    }

    try {
      setError(null);
      setIsScanning(true);

      await readerRef.current.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            const text = result.getText();
            console.log('Barcode detected:', text);
            onScan(text);
            stopScanning();
          }
          
          if (error && !(error instanceof NotFoundException)) {
            console.error('Scanning error:', error);
            setError('Scanning error: ' + error.message);
          }
        }
      );
    } catch (err) {
      console.error('Error starting camera:', err);
      setError('Could not start camera. Please check permissions.');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    setIsScanning(false);
  };

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (isScanning) {
      stopScanning();
      // Let the useEffect handle restarting when device changes
    }
  };

  // Auto-start scanning when component becomes active
  useEffect(() => {
    if (isActive && selectedDeviceId && !isScanning) {
      startScanning();
    } else if (!isActive && isScanning) {
      stopScanning();
    }
  }, [isActive, selectedDeviceId, isScanning]);

  if (!isActive) {
    return null;
  }

  return (
    <div className={`camera-scanner ${className}`}>
      {/* Camera Selection */}
      {devices.length > 1 && (
        <div className="mb-4">
          <select
            value={selectedDeviceId || ''}
            onChange={(e) => handleDeviceChange(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md bg-white text-black"
            disabled={isScanning}
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Video Element */}
      <div className="relative">
        <video
          ref={videoRef}
          className="w-full h-auto rounded-lg"
          playsInline
          muted
        />
        
        {/* Scanning Overlay */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-32 border-2 border-green-500 rounded-lg relative">
              <div className="absolute -top-1 -left-1 w-8 h-8 border-l-2 border-t-2 border-green-500"></div>
              <div className="absolute -top-1 -right-1 w-8 h-8 border-r-2 border-t-2 border-green-500"></div>
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-l-2 border-b-2 border-green-500"></div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-r-2 border-b-2 border-green-500"></div>
              
              {/* Scanning line animation */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-0.5 bg-green-500 animate-pulse"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 flex gap-2 justify-center">
        {!isScanning ? (
          <Button
            onClick={startScanning}
            disabled={!selectedDeviceId}
            className="flex items-center gap-2"
          >
            <Camera className="h-4 w-4" />
            Start Camera
          </Button>
        ) : (
          <Button
            onClick={stopScanning}
            variant="outline"
            className="flex items-center gap-2"
          >
            <CameraOff className="h-4 w-4" />
            Stop Camera
          </Button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 text-center text-sm text-gray-600">
        <p>Position the barcode within the green frame</p>
        <p className="text-xs text-gray-500 mt-1">
          Make sure the barcode is well-lit and clearly visible
        </p>
      </div>
    </div>
  );
}

export default CameraScanner;
