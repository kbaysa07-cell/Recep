import { useState } from 'react';

export type Activity = {type: 'thought' | 'file' | 'terminal' | 'web', message: string, timestamp?: number};

export function useActivity() {
  const [activity, setActivity] = useState<Activity[]>([]);

  const addActivity = (type: Activity['type'], message: string) => {
    setActivity(prev => [...prev, { type, message, timestamp: Date.now() }]);
  };

  const clearActivity = () => setActivity([]);

  return { activity, setActivity, addActivity, clearActivity };
}
