import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InstallPromptProps {}

const InstallPrompt: React.FC<InstallPromptProps> = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('✅ PWA: App is already installed');
      return;
    }

    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show the install prompt
      setShowPrompt(true);
      console.log('📱 PWA: Install prompt ready');
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`📱 PWA: User response to install prompt: ${outcome}`);

    if (outcome === 'accepted') {
      console.log('✅ PWA: User accepted the install prompt');
    } else {
      console.log('❌ PWA: User dismissed the install prompt');
    }

    // Clear the deferredPrompt for next time
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Save dismissal to localStorage
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Check if user dismissed recently (within 7 days)
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      
      if (now - dismissedTime < sevenDays) {
        setShowPrompt(false);
      }
    }
  }, []);

  if (!showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[200] md:left-auto md:right-4 md:w-96">
      <div className="bg-gradient-to-r from-[#88B04B] to-[#6a8f3a] text-white rounded-2xl shadow-2xl p-6 relative animate-in slide-in-from-bottom duration-300">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-white/80 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-4">
          <img src="/organic.gif" alt="App Icon" className="w-16 h-16 rounded-xl flex-shrink-0" />
          
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">Install Farm Monitor</h3>
            <p className="text-sm text-white/90 mb-4">
              Install this app on your phone for quick access to your farm monitoring dashboard anytime!
            </p>
            
            <div className="flex gap-2">
              <Button
                onClick={handleInstallClick}
                className="bg-white text-[#88B04B] hover:bg-gray-100 font-semibold flex-1"
                size="sm"
              >
                Install App
              </Button>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                className="text-white hover:bg-white/20"
                size="sm"
              >
                Not Now
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-white/20">
          <p className="text-xs text-white/75">
            ✓ Works offline • ✓ Fast loading • ✓ Push notifications
          </p>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
