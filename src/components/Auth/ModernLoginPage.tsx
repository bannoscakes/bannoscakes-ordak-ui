import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Scan, AlertCircle, Shield, Users, ChefHat, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { OrdakLogo } from "../OrdakLogo";

interface ModernLoginPageProps {
  onSuccess: () => void;
}

export function ModernLoginPage({ onSuccess }: ModernLoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<'staff' | 'supervisor'>('staff');

  const isFormValid = email.trim().length > 0 && password.length >= 6;

  const handleSignIn = async () => {
    if (!isFormValid || isLoading) return;

    setIsLoading(true);
    setError("");

    try {
      const { authService } = await import('../../lib/auth');
      const result = await authService.signIn(email, password);

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
    toast.info(`${newRole === 'staff' ? 'Staff' : 'Supervisor'} mode selected`, {
      description: "Your actual role is determined by your account settings."
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isFormValid) {
      handleSignIn();
    }
  };

  return (
    <div className="min-h-screen bg-[#1E1E1E] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Film grain texture */}
      <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
      }} />

      {/* Subtle background accent */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#FF6B00]/5 rounded-full blur-3xl" />

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left side - Branding */}
        <div className="text-white space-y-6 hidden lg:block" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="bg-[#FF6B00] p-3 rounded-md">
              <OrdakLogo className="h-10 w-10" variant="light" />
            </div>
            <div>
              <h2 className="text-4xl font-semibold">Ordak</h2>
              <p className="text-gray-400">Manufacturing Hub</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="bg-[#FF6B00]/10 p-3 rounded-lg border border-[#FF6B00]/20">
                  <ChefHat className="h-6 w-6 text-[#FF6B00]" />
                </div>
                <div>
                  <h3 className="text-lg mb-2 font-semibold">Streamlined Production</h3>
                  <p className="text-gray-400 text-sm">Manage orders, track progress, and optimize your manufacturing workflow with real-time insights.</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="bg-[#FF6B00]/10 p-3 rounded-lg border border-[#FF6B00]/20">
                  <Users className="h-6 w-6 text-[#FF6B00]" />
                </div>
                <div>
                  <h3 className="text-lg mb-2 font-semibold">Team Collaboration</h3>
                  <p className="text-gray-400 text-sm">Empower your staff and supervisors with dedicated workspaces and efficient communication tools.</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="bg-[#FF6B00]/10 p-3 rounded-lg border border-[#FF6B00]/20">
                  <Shield className="h-6 w-6 text-[#FF6B00]" />
                </div>
                <div>
                  <h3 className="text-lg mb-2 font-semibold">Quality Control</h3>
                  <p className="text-gray-400 text-sm">Built-in QC checks and issue tracking ensure product quality at every production stage.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login */}
        <Card className="p-8 shadow-2xl bg-white/95 backdrop-blur-sm border border-gray-200">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl text-foreground font-semibold" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
                Welcome Back
              </h1>
              <p className="text-muted-foreground">
                Sign in to access your workspace
              </p>
            </div>

            {/* Role Selection - Visual only for now */}
            <Tabs value={role} onValueChange={handleRoleChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger value="staff" className="gap-2">
                  <Users className="h-4 w-4" />
                  Staff
                </TabsTrigger>
                <TabsTrigger value="supervisor" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Supervisor
                </TabsTrigger>
              </TabsList>

              <TabsContent value="staff" className="space-y-4 mt-6">
                <LoginForm
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  handleKeyDown={handleKeyDown}
                  isLoading={isLoading}
                  error={error}
                  isFormValid={isFormValid}
                  handleSignIn={handleSignIn}
                  handleScanBadge={handleScanBadge}
                  roleLabel="Staff"
                />
              </TabsContent>

              <TabsContent value="supervisor" className="space-y-4 mt-6">
                <LoginForm
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
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

            <p className="text-center text-sm text-muted-foreground">
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
  password: string;
  setPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
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
  password,
  setPassword,
  showPassword,
  setShowPassword,
  handleKeyDown,
  isLoading,
  error,
  isFormValid,
  handleSignIn,
  handleScanBadge,
  roleLabel,
}: LoginFormProps) {
  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="h-12 pr-12"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Button
          onClick={handleSignIn}
          disabled={!isFormValid || isLoading}
          className="w-full h-12 text-base"
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleScanBadge}
          disabled={isLoading}
          className="w-full h-12 text-base"
        >
          <Scan className="mr-2 h-5 w-5" />
          Scan {roleLabel} Badge
        </Button>
      </div>
    </>
  );
}
