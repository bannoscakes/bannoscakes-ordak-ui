import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { Scan, AlertCircle, Shield, Users, ChefHat, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { OrdakLogo } from "../OrdakLogo";
import { authService } from "../../lib/auth";

interface ModernLoginPageProps {
  onSuccess: () => void;
}

export function ModernLoginPage({ onSuccess }: ModernLoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isFormValid = email.trim().length > 0 && password.length >= 6;

  const handleSignIn = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isFormValid || isLoading) return;

    setIsLoading(true);
    setError("");

    try {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isFormValid) {
      handleSignIn();
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-6 sm:px-6 sm:py-12 md:p-12"
      style={{ backgroundColor: '#1E1E1E' }}
    >
      {/* Film grain texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.15,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Subtle background accent */}
      <div
        className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl"
        style={{ backgroundColor: 'rgba(255, 107, 0, 0.05)' }}
      />

      <div
        className="w-full grid grid-cols-1 md:grid-cols-2 items-center relative z-10"
        style={{ maxWidth: '1100px', margin: '0 auto', gap: '48px' }}
      >
        {/* Left side - Branding */}
        <div className="text-white hidden md:block" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="p-3 rounded-md" style={{ backgroundColor: '#FF6B00' }}>
              <OrdakLogo className="h-10 w-10" variant="light" />
            </div>
            <div>
              <h2 className="text-4xl font-semibold">Ordak</h2>
              <p className="text-gray-400">Manufacturing Hub</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="backdrop-blur-sm rounded-lg p-6" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 107, 0, 0.1)', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
                  <ChefHat className="h-6 w-6" style={{ color: '#FF6B00' }} />
                </div>
                <div>
                  <h3 className="text-lg mb-2 font-semibold">Streamlined Production</h3>
                  <p className="text-gray-400 text-sm">Manage orders, track progress, and optimize your manufacturing workflow with real-time insights.</p>
                </div>
              </div>
            </div>

            <div className="backdrop-blur-sm rounded-lg p-6" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 107, 0, 0.1)', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
                  <Users className="h-6 w-6" style={{ color: '#FF6B00' }} />
                </div>
                <div>
                  <h3 className="text-lg mb-2 font-semibold">Team Collaboration</h3>
                  <p className="text-gray-400 text-sm">Empower your staff and supervisors with dedicated workspaces and efficient communication tools.</p>
                </div>
              </div>
            </div>

            <div className="backdrop-blur-sm rounded-lg p-6" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 107, 0, 0.1)', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
                  <Shield className="h-6 w-6" style={{ color: '#FF6B00' }} />
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
        <div className="w-full max-w-md">
          {/* Mobile branding header - visible only on mobile */}
          <div className="md:hidden text-center mb-6">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="p-2 rounded-md" style={{ backgroundColor: '#FF6B00' }}>
                <OrdakLogo className="h-6 w-6" variant="light" />
              </div>
              <span className="text-white text-xl font-semibold" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
                Ordak
              </span>
            </div>
            <p className="text-gray-400 text-sm">Manufacturing Hub</p>
          </div>

          <Card className="force-light p-6 sm:p-8 shadow-2xl backdrop-blur-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb' }}>
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl sm:text-3xl text-gray-900 font-semibold" style={{ fontFamily: '"IBM Plex Sans", sans-serif' }}>
                  Welcome Back
                </h1>
                <p className="text-gray-500 text-sm sm:text-base">
                  Sign in to access your workspace
                </p>
              </div>

            <LoginFormFields
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
            />

            <p className="text-center text-sm text-gray-500">
              Need help? Contact your manager
            </p>
          </div>
        </Card>
        </div>
      </div>
    </div>
  );
}

// Reusable Login Form Fields Component
interface LoginFormFieldsProps {
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
  handleSignIn: (e?: React.FormEvent) => void;
}

function LoginFormFields({
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
}: LoginFormFieldsProps) {
  return (
    <form onSubmit={handleSignIn} className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
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
          <Label htmlFor="login-password">Password</Label>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="h-12 pr-10"
              minLength={6}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-12 w-12 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-500" />
              ) : (
                <Eye className="h-5 w-5 text-gray-500" />
              )}
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Button
          type="submit"
          disabled={!isFormValid || isLoading}
          className="w-full h-12 text-base"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">Or</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled
          className="w-full h-12 text-base"
          title="Badge scanning coming soon"
        >
          <Scan className="mr-2 h-5 w-5" />
          Scan Badge (Coming Soon)
        </Button>
      </div>
    </form>
  );
}
