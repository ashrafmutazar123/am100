import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Welcome Back!",
          description: "Successfully logged in",
        });
        navigate('/dashboard');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header Section with Logo */}
          <div className="bg-slate-900 text-white px-8 py-6 relative">
            <div className="flex items-center justify-between">
              {/* REDtone Logo */}
              <div className="flex-1">
                <img 
                  src="/am100/redtone-logo.png" 
                  alt="REDtone" 
                  className="h-8 w-auto"
                />
              </div>
              {/* Organic GIF Logo */}
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden">
                <img 
                  src="/am100/organic.gif" 
                  alt="Logo" 
                  className="w-12 h-12 object-contain"
                />
              </div>
            </div>
          </div>

          {/* Login Form */}
          <div className="px-8 py-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Login</h2>
            
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Field */}
              <div>
                <Label htmlFor="email" className="text-slate-600 text-sm font-medium mb-2 block">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all"
                />
              </div>

              {/* Password Field */}
              <div>
                <Label htmlFor="password" className="text-slate-600 text-sm font-medium mb-2 block">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all"
                />
              </div>

              {/* Footer Links */}
              <div className="flex items-center justify-between text-sm pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  className="text-slate-900 font-medium hover:text-slate-700 transition-colors"
                >
                  Create an account
                </button>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-lg font-semibold transition-all mt-6"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
