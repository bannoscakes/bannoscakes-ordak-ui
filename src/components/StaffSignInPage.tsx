import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Scan, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface StaffSignInPageProps {
  onSignIn: (email: string, pin: string) => void;
}

export function StaffSignInPage({ onSignIn }: StaffSignInPageProps) {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isFormValid = email.trim().length > 0 && pin.length === 6;

  const handleSignIn = async () => {
    if (!isFormValid) return;
    
    setIsLoading(true);
    setError("");
    
    // Simulate authentication
    setTimeout(() => {
      // Mock unapproved user check
      if (email.toLowerCase() === "pending@example.com") {
        setError("Your account is pending approval. Please contact your supervisor.");
        setIsLoading(false);
        return;
      }
      
      // Mock invalid credentials
      if (pin !== "123456") {
        setError("Invalid email or PIN. Please try again.");
        setIsLoading(false);
        return;
      }
      
      setIsLoading(false);
      onSignIn(email, pin);
    }, 1000);
  };

  const handleScanBadge = () => {
    toast.info("Scanning staff badge...");
    // Simulate badge scan
    setTimeout(() => {
      setEmail("john.doe@bakery.com");
      setPin("123456");
      toast.success("Badge scanned successfully");
    }, 1500);
  };

  const handlePinChange = (value: string) => {
    // Only allow numbers and limit to 6 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setPin(numericValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isFormValid) {
      handleSignIn();
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-medium text-foreground">
              Staff Sign In
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to access your workspace
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email / Staff ID</Label>
              <Input
                id="email"
                type="text"
                placeholder="Enter your email or staff ID"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pin">PIN (6 digits)</Label>
              <Input
                id="pin"
                type="password"
                placeholder="Enter your 6-digit PIN"
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="h-11 text-center tracking-widest"
                maxLength={6}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleSignIn}
              disabled={!isFormValid || isLoading}
              className="w-full h-11"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleScanBadge}
              disabled={isLoading}
              className="w-full h-11"
            >
              <Scan className="mr-2 h-4 w-4" />
              Scan Staff Badge
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}