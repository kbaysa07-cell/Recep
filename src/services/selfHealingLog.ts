interface HealingLog {
  filePath: string;
  error: string;
  attempt: number;
  timestamp: number;
}

const logs: HealingLog[] = [];

export const logHealingAttempt = (filePath: string, error: string, attempt: number) => {
  logs.push({ filePath, error, attempt, timestamp: Date.now() });
};

export const getHealingLogsForFile = (filePath: string) => {
  return logs.filter(log => log.filePath === filePath);
};
