import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface LoginFormProps {
  onSuccess: () => void;
  userType?: 'staff' | 'supervisor';
}

export function LoginForm({ onSuccess, userType = 'staff' }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isFormValid = email.trim().length > 0 && password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isLoading) return;

    setIsLoading(true);
    setError("");

    try {
      // Import auth service dynamically to avoid circular imports
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

  const handleDemoLogin = async () => {
    const demoCredentials = userType === 'supervisor' 
      ? { email: "supervisor@bannos.com", password: "demo123" }
      : { email: "staff@bannos.com", password: "demo123" };

    setEmail(demoCredentials.email);
    setPassword(demoCredentials.password);
    
    setIsLoading(true);
    setError("");

    try {
      const { authService } = await import('../../lib/auth');
      
      const result = await authService.signIn(demoCredentials.email, demoCredentials.password);
      
      if (result.success) {
        toast.success("Demo account signed in successfully");
        onSuccess();
      } else {
        setError("Demo login failed. Please check if demo accounts are set up.");
      }
    } catch (error) {
      console.error('Demo login error:', error);
      setError("Demo login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">
          {userType === 'supervisor' ? 'Supervisor' : 'Staff'} Sign In
        </CardTitle>
        <CardDescription>
          Enter your credentials to access the {userType === 'supervisor' ? 'supervisor' : 'staff'} workspace
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
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
                disabled={isLoading}
                required
                minLength={6}
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
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleDemoLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                `Try Demo ${userType === 'supervisor' ? 'Supervisor' : 'Staff'} Account`
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
