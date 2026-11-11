/**
 * Structured JSON logger. One line per event so logs are machine-parseable
 * in production (Cloud Run) and readable in development.
 * Levels are controlled by LOG_LEVEL (default: info).
 */

export type LogLevel = "debug" | "info" | "warn" | "error"

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

export type LogContext = Record<string, unknown>

function currentLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") return raw
  return "info"
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[currentLevel()]) return
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(context ? { context } : {}),
  }
  const line = JSON.stringify(entry)
  if (level === "error") console.error(line)
  else if (level === "warn") console.warn(line)
  else console.log(line)
}

export interface Logger {
  debug(message: string, context?: LogContext): void
  info(message: string, context?: LogContext): void
  warn(message: string, context?: LogContext): void
  error(message: string, context?: LogContext): void
  /** Returns a logger that merges `bindings` into every entry. */
  child(bindings: LogContext): Logger
}

function createLogger(bindings: LogContext = {}): Logger {
  return {
    debug: (message, context) => emit("debug", message, { ...bindings, ...context }),
    info: (message, context) => emit("info", message, { ...bindings, ...context }),
    warn: (message, context) => emit("warn", message, { ...bindings, ...context }),
    error: (message, context) => emit("error", message, { ...bindings, ...context }),
    child: (childBindings) => createLogger({ ...bindings, ...childBindings }),
  }
}

export const logger = createLogger()
