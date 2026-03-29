import { useState, useEffect } from 'react';

export function useAppLayout() {
  const [isMobile, setIsMobile] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatPosition, setChatPosition] = useState<'left' | 'right'>('left');

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return {
    isMobile,
    isChatOpen,
    setIsChatOpen,
    chatPosition,
    setChatPosition
  };
}
