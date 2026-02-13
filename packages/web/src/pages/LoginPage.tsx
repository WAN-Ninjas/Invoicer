import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function LoginPage() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoggingIn, loginError, isAuthenticated, passwordRequired, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const autoLoginAttempted = useRef(false);
  const hasNavigated = useRef(false);

  useEffect(() => {
    // Only redirect if authenticated and we haven't already navigated
    if (isAuthenticated && !hasNavigated.current && location.pathname === '/login') {
      hasNavigated.current = true;
      navigate('/', { replace: true });
    } else if (!isLoading && !passwordRequired && !autoLoginAttempted.current && !isAuthenticated) {
      // No password set, auto-login (only attempt once)
      autoLoginAttempted.current = true;
      login('').catch(() => {
        // Reset if auto-login fails so user can try manually
        autoLoginAttempted.current = false;
      });
    }
  }, [isAuthenticated, passwordRequired, isLoading, navigate, login, location.pathname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(password);
      // Navigation will happen via the useEffect when isAuthenticated becomes true
    } catch {
      // Error handled by hook
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md animate-fade-in">
        <CardContent>
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Invoicer
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Enter your password to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {loginError && (
              <p className="text-sm text-red-500 text-center">
                Invalid password. Please try again.
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isLoggingIn}
            >
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
