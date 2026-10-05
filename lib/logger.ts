/**
 * Simple logging utility
 * In production, this can be extended to integrate with Sentry, LogRocket, or similar services
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  timestamp: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
    }

    // In development, log to console
    if (this.isDevelopment) {
      const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
      consoleMethod(`[${entry.timestamp}] [${level.toUpperCase()}]`, message, context || '')
    }

    // In production, you would send this to your logging service
    // Example: Sentry.captureException(new Error(message), { extra: context })
    // Or: analytics.track('log', entry)
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context)
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context)
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log('error', message, context)
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context)
  }

  // Helper for logging API errors
  logApiError(endpoint: string, error: unknown, context?: Record<string, unknown>) {
    this.error(`API Error: ${endpoint}`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...context,
    })
  }

  // Helper for logging database errors
  logDbError(operation: string, error: unknown, context?: Record<string, unknown>) {
    this.error(`Database Error: ${operation}`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...context,
    })
  }
}

export const logger = new Logger()
