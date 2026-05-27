/**
 * Minimal leveled logger for the framework's internal output.
 *
 * Goals:
 * - Zero behavior change by default: the level defaults to `debug` (everything
 *   on) and each method forwards to the matching `console` method with the same
 *   arguments, so existing output is byte-identical out of the box.
 * - Controllable in production: set the `S42_LOG_LEVEL` (or `LOG_LEVEL`) env var
 *   to `debug` | `info` | `warn` | `error` | `silent` to raise the threshold.
 * - Injectable: consumers can call `setLogLevel(...)` at runtime, or swap the
 *   underlying sink with `setLogSink(...)` (e.g. to ship structured logs).
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

export type LogSink = {
	debug: (...args: unknown[]) => void
	info: (...args: unknown[]) => void
	warn: (...args: unknown[]) => void
	error: (...args: unknown[]) => void
}

const LEVEL_ORDER: Record<LogLevel, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
	silent: 100,
}

const DEFAULT_LEVEL: LogLevel = 'debug'

function isLogLevel(value: string): value is LogLevel {
	return value in LEVEL_ORDER
}

function resolveLevelFromEnv(): LogLevel {
	const raw = (process.env.S42_LOG_LEVEL ?? process.env.LOG_LEVEL ?? '')
		.trim()
		.toLowerCase()
	return isLogLevel(raw) ? raw : DEFAULT_LEVEL
}

// `console.log` is used as the debug sink so the noisiest output (module/route
// discovery, lifecycle messages) can be silenced by raising the level.
const consoleSink: LogSink = {
	debug: (...args) => console.log(...args),
	info: (...args) => console.info(...args),
	warn: (...args) => console.warn(...args),
	error: (...args) => console.error(...args),
}

class Logger {
	private level: LogLevel = resolveLevelFromEnv()
	private sink: LogSink = consoleSink

	public setLevel(level: LogLevel): void {
		this.level = level
	}

	public getLevel(): LogLevel {
		return this.level
	}

	public setSink(sink: LogSink): void {
		this.sink = sink
	}

	private enabled(messageLevel: LogLevel): boolean {
		return LEVEL_ORDER[messageLevel] >= LEVEL_ORDER[this.level]
	}

	public debug(...args: unknown[]): void {
		if (this.enabled('debug')) {
			this.sink.debug(...args)
		}
	}

	public info(...args: unknown[]): void {
		if (this.enabled('info')) {
			this.sink.info(...args)
		}
	}

	public warn(...args: unknown[]): void {
		if (this.enabled('warn')) {
			this.sink.warn(...args)
		}
	}

	public error(...args: unknown[]): void {
		if (this.enabled('error')) {
			this.sink.error(...args)
		}
	}
}

export const logger = new Logger()

export function setLogLevel(level: LogLevel): void {
	logger.setLevel(level)
}

export function getLogLevel(): LogLevel {
	return logger.getLevel()
}

export function setLogSink(sink: LogSink): void {
	logger.setSink(sink)
}
