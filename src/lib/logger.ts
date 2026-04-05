type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  action: string;
  message: string;
  userId?: string;
  meta?: Record<string, unknown>;
  timestamp: string;
}

function log(level: LogLevel, action: string, message: string, meta?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    action,
    message,
    timestamp: new Date().toISOString(),
    ...(meta && { meta }),
  };

  const output = JSON.stringify(entry);

  switch (level) {
    case "error":
      console.error(output);
      break;
    case "warn":
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

export const logger = {
  info: (action: string, message: string, meta?: Record<string, unknown>) =>
    log("info", action, message, meta),
  warn: (action: string, message: string, meta?: Record<string, unknown>) =>
    log("warn", action, message, meta),
  error: (action: string, message: string, meta?: Record<string, unknown>) =>
    log("error", action, message, meta),
};
