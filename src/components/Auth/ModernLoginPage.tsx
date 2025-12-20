import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Scan, AlertCircle, Shield, Users, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { OrdakLogo } from "../OrdakLogo";

interface ModernLoginPageProps {
  onSuccess: () => void;
}

export function ModernLoginPage({ onSuccess }: ModernLoginPageProps) {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<'staff' | 'supervisor'>('staff');

  // PIN field is used as password for authentication
  const isFormValid = email.trim().length > 0 && pin.length >= 6;

  const handlePinChange = (value: string) => {
    // Allow any characters for password compatibility
    // Visual shows as PIN but accepts full passwords
    setPin(value);
  };

  const handleSignIn = async () => {
    if (!isFormValid || isLoading) return;

    setIsLoading(true);
    setError("");

    try {
      const { authService } = await import('../../lib/auth');
      // PIN is used as password for authentication
      const result = await authService.signIn(email, pin);

      if (result.success) {
        toast.success("Signed in successfully");
        onSuccess();
      } else {
        setError(result.error || "Sign in failed");
      }
    } catch (error) {
      console.error('Login error:', error);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanBadge = () => {
    toast.info("Badge scanning coming soon!", {
      description: "This feature is under development."
    });
  };

  const handleRoleChange = (newRole: string) => {
    setRole(newRole as 'staff' | 'supervisor');
    // Role toggle is visual only for now - actual role comes from database
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isFormValid) {
      handleSignIn();
    }
  };

  return (
    <div className="min-h-screen bg-[#1E1E1E] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Film grain texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
      }} />

      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left side - Branding */}
        <div className="text-white space-y-6 hidden lg:block">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-[#FF6B00] p-3 rounded-lg">
              <OrdakLogo className="h-8 w-8" variant="light" />
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Ordak</h2>
              <p className="text-gray-500 text-sm">Manufacturing Hub</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Streamlined Production */}
            <div className="bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg p-5">
              <div className="flex items-start gap-4">
                <div className="bg-[#FF6B00]/10 p-2.5 rounded-lg">
                  <ChefHat className="h-5 w-5 text-[#FF6B00]" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Streamlined Production</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">Manage orders, track progress, and optimize your manufacturing workflow with real-time insights.</p>
                </div>
              </div>
            </div>

            {/* Team Collaboration */}
            <div className="bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg p-5">
              <div className="flex items-start gap-4">
                <div className="bg-[#FF6B00]/10 p-2.5 rounded-lg">
                  <Users className="h-5 w-5 text-[#FF6B00]" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Team Collaboration</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">Empower your staff and supervisors with dedicated workspaces and efficient communication tools.</p>
                </div>
              </div>
            </div>

            {/* Quality Control */}
            <div className="bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg p-5">
              <div className="flex items-start gap-4">
                <div className="bg-[#FF6B00]/10 p-2.5 rounded-lg">
                  <Shield className="h-5 w-5 text-[#FF6B00]" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Quality Control</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">Built-in QC checks and issue tracking ensure product quality at every production stage.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login Card */}
        <Card className="p-8 shadow-2xl bg-white border-0 rounded-xl">
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-2xl text-gray-900 font-semibold">
                Welcome Back
              </h1>
              <p className="text-gray-500 text-sm">
                Sign in to access your workspace
              </p>
            </div>

            {/* Role Selection Tabs */}
            <Tabs value={role} onValueChange={handleRoleChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-11 bg-gray-100 p-1 rounded-lg">
                <TabsTrigger
                  value="staff"
                  className="gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <Users className="h-4 w-4" />
                  Staff
                </TabsTrigger>
                <TabsTrigger
                  value="supervisor"
                  className="gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <Shield className="h-4 w-4" />
                  Supervisor
                </TabsTrigger>
              </TabsList>

              <TabsContent value="staff" className="mt-6">
                <LoginForm
                  email={email}
                  setEmail={setEmail}
                  pin={pin}
                  handlePinChange={handlePinChange}
                  handleKeyDown={handleKeyDown}
                  isLoading={isLoading}
                  error={error}
                  isFormValid={isFormValid}
                  handleSignIn={handleSignIn}
                  handleScanBadge={handleScanBadge}
                  roleLabel="Staff"
                />
              </TabsContent>

              <TabsContent value="supervisor" className="mt-6">
                <LoginForm
                  email={email}
                  setEmail={setEmail}
                  pin={pin}
                  handlePinChange={handlePinChange}
                  handleKeyDown={handleKeyDown}
                  isLoading={isLoading}
                  error={error}
                  isFormValid={isFormValid}
                  handleSignIn={handleSignIn}
                  handleScanBadge={handleScanBadge}
                  roleLabel="Supervisor"
                />
              </TabsContent>
            </Tabs>

            <p className="text-center text-sm text-gray-400">
              Need help? Contact your manager
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

interface LoginFormProps {
  email: string;
  setEmail: (value: string) => void;
  pin: string;
  handlePinChange: (value: string) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
  error: string;
  isFormValid: boolean;
  handleSignIn: () => void;
  handleScanBadge: () => void;
  roleLabel: string;
}

function LoginForm({
  email,
  setEmail,
  pin,
  handlePinChange,
  handleKeyDown,
  isLoading,
  error,
  isFormValid,
  handleSignIn,
  handleScanBadge,
  roleLabel,
}: LoginFormProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-4">
        {/* Email / Staff ID */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-700 font-medium">
            Email / Staff ID
          </Label>
          <Input
            id="email"
            type="text"
            placeholder="Enter your email or staff ID"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="h-11 border-gray-200 focus:border-gray-300 focus:ring-0"
          />
        </div>

        {/* PIN (6 digits) - Visual only, accepts full passwords */}
        <div className="space-y-2">
          <Label htmlFor="pin" className="text-gray-700 font-medium">
            PIN (6 digits)
          </Label>
          <Input
            id="pin"
            type="password"
            placeholder="Enter your 6-digit PIN"
            value={pin}
            onChange={(e) => handlePinChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="h-11 text-center tracking-widest border-gray-200 focus:border-gray-300 focus:ring-0"
          />
          {/* PIN dots indicator - shows up to 6 filled */}
          <div className="flex gap-1.5 justify-center pt-1">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i < Math.min(pin.length, 6) ? 'bg-gray-400' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {/* Sign In Button */}
        <Button
          onClick={handleSignIn}
          disabled={!isFormValid || isLoading}
          className="w-full h-11 text-base bg-gray-500 hover:bg-gray-600 text-white"
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-gray-400">Or</span>
          </div>
        </div>

        {/* Scan Badge Button */}
        <Button
          variant="outline"
          onClick={handleScanBadge}
          disabled={isLoading}
          className="w-full h-11 text-base border-gray-200 hover:bg-gray-50"
        >
          <Scan className="mr-2 h-4 w-4" />
          Scan {roleLabel} Badge
        </Button>
      </div>
    </div>
  );
}
