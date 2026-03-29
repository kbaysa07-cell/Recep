import { useState, useEffect } from 'react';

export function useAppLayout() {
  const [isMobile, setIsMobile] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatPosition, setChatPosition] = useState<'left' | 'right'>('left');
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(true);
  const [isFilesPanelOpen, setIsFilesPanelOpen] = useState(true);
  const [isTerminalPanelOpen, setIsTerminalPanelOpen] = useState(true);

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
    setChatPosition,
    isChatPanelOpen,
    setIsChatPanelOpen,
    isFilesPanelOpen,
    setIsFilesPanelOpen,
    isTerminalPanelOpen,
    setIsTerminalPanelOpen
  };
}
