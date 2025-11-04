import { useEffect } from 'react';
import organicGif from '/organic.gif';

interface LoadingAnimationProps {
  isVisible: boolean;
  duration?: number;
}

const LoadingAnimation = ({ isVisible, duration = 1000 }: LoadingAnimationProps) => {
  useEffect(() => {
    if (isVisible) {
      console.log('🎬 Loading animation is now visible');
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm transition-opacity duration-200"
      style={{ animation: 'fadeIn 0.2s ease-in' }}
    >
      <div 
        className="bg-white rounded-2xl p-8 shadow-2xl"
        style={{ animation: 'zoomIn 0.3s ease-out' }}
      >
        <img 
          src={organicGif}
          alt="Loading..." 
          className="w-32 h-32 object-contain mx-auto"
        />
        <p className="text-center mt-4 text-sm font-medium text-gray-700">
          Refreshing data...
        </p>
      </div>
    </div>
  );
};

export default LoadingAnimation;
