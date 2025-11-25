import { config } from '../config/index.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private level: number;

  constructor(logLevel: LogLevel = 'info') {
    this.level = levels[logLevel];
  }

  private log(level: LogLevel, message: string, meta?: unknown) {
    if (levels[level] >= this.level) {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        message,
        ...(meta && { meta }),
      };
      console.log(JSON.stringify(logEntry));
    }
  }

  debug(message: string, meta?: unknown) {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: unknown) {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: unknown) {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: unknown) {
    this.log('error', message, meta);
  }
}

export const logger = new Logger(config.LOG_LEVEL);
