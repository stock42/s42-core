import { $ } from 'bun'
import {
	Controller,
	getControllersStats,
	trackControllerStats,
	type ControllerStatsEndpoint,
} from '../Controller'
import { getModulesStats, type ModuleType } from '../Modules'

export type CoreStatsModule = ModuleType
export type CoreStatsEndpoint = ControllerStatsEndpoint
export type CoreStatsCommand =
	| 'free -m'
	| 'df -h'
	| 'uptime'
	| 'who'
	| 'cpupower frequency-info'

export type CoreStatsCommandResult = {
	command: CoreStatsCommand
	ok: boolean
	output: string
}

export type CoreStatsCommandRunner = (
	command: CoreStatsCommand,
) => Promise<CoreStatsCommandResult>

export type CoreStatsMemory = {
	ok: boolean
	totalMB: number | null
	usedMB: number | null
	freeMB: number | null
	availableMB: number | null
	raw: string
}

export type CoreStatsDisk = {
	ok: boolean
	raw: string
	root: {
		filesystem: string
		size: string
		used: string
		available: string
		usePercentage: string
		mountedOn: string
	} | null
}

export type CoreStatsSystem = {
	memory: CoreStatsMemory
	disk: CoreStatsDisk
	uptime: {
		ok: boolean
		raw: string
	}
	connectedUsers: {
		ok: boolean
		totalUsers: number
		users: string[]
		raw: string
	}
	cpuFrequency: {
		ok: boolean
		raw: string
	}
}

export type CoreStatsPayload = {
	ok: true
	feature: 'core-stats'
	generatedAt: string
	path: string
	enabled: boolean
	summary: {
		totalControllers: number
		totalEndpoints: number
		totalModulesLoaded: number
		totalModulesFull: number
		totalModulesShare: number
		totalModulesMws: number
	}
	endpoints: CoreStatsEndpoint[]
	modules: CoreStatsModule[]
	system: CoreStatsSystem
}

export type CoreStatsConstructor = {
	enabled?: boolean
	path?: string
	commandRunner?: CoreStatsCommandRunner
}

const DEFAULT_STATS_PATH = '/core/stats'
let coreStatsSingleton: CoreStats | null = null

export class CoreStats {
	private readonly enabled: boolean
	private readonly path: string
	private readonly commandRunner: CoreStatsCommandRunner
	private statsController: Controller | null = null

	constructor(properties: CoreStatsConstructor = {}) {
		this.enabled = this.resolveEnabled(properties.enabled)
		this.path = this.normalizePath(properties.path ?? DEFAULT_STATS_PATH)
		this.commandRunner =
			properties.commandRunner ?? (command => this.executeCommand(command))
	}

	public isEnabled(): boolean {
		return this.enabled
	}

	public getPath(): string {
		return this.path
	}

	public getController(): Controller | null {
		if (!this.enabled) {
			return null
		}

		if (this.statsController) {
			return this.statsController
		}

		this.statsController = new Controller('GET', this.path, async (_req, res) => {
			return res.json(await this.getStats())
		})

		return this.statsController
	}

	public async getStats(): Promise<CoreStatsPayload> {
		const [controllersStats, modulesStats, system] = await Promise.all([
			Promise.resolve(getControllersStats()),
			Promise.resolve(getModulesStats()),
			this.getSystemStats(),
		])

		return {
			ok: true,
			feature: 'core-stats',
			generatedAt: new Date().toISOString(),
			path: this.path,
			enabled: this.enabled,
			summary: {
				totalControllers: controllersStats.totalControllers,
				totalEndpoints: controllersStats.totalEndpoints,
				totalModulesLoaded: modulesStats.totalModulesLoaded,
				totalModulesFull: modulesStats.totalModulesFull,
				totalModulesShare: modulesStats.totalModulesShare,
				totalModulesMws: modulesStats.totalModulesMws,
			},
			endpoints: controllersStats.endpoints,
			modules: modulesStats.modules,
			system,
		}
	}

	private async getSystemStats(): Promise<CoreStatsSystem> {
		const [memoryResult, diskResult, uptimeResult, whoResult, cpuResult] =
			await Promise.all([
				this.commandRunner('free -m'),
				this.commandRunner('df -h'),
				this.commandRunner('uptime'),
				this.commandRunner('who'),
				this.commandRunner('cpupower frequency-info'),
			])

		return {
			memory: this.parseMemory(memoryResult),
			disk: this.parseDisk(diskResult),
			uptime: {
				ok: uptimeResult.ok,
				raw: uptimeResult.output,
			},
			connectedUsers: {
				ok: whoResult.ok,
				totalUsers: this.parseWho(whoResult).length,
				users: this.parseWho(whoResult),
				raw: whoResult.output,
			},
			cpuFrequency: {
				ok: cpuResult.ok,
				raw: cpuResult.output,
			},
		}
	}

	private parseMemory(result: CoreStatsCommandResult): CoreStatsMemory {
		const memLine = result.output
			.split('\n')
			.find(line => line.trim().toLowerCase().startsWith('mem:'))

		if (!memLine) {
			return {
				ok: result.ok,
				totalMB: null,
				usedMB: null,
				freeMB: null,
				availableMB: null,
				raw: result.output,
			}
		}

		const values = memLine.trim().split(/\s+/)

		return {
			ok: result.ok,
			totalMB: this.toNumber(values[1]),
			usedMB: this.toNumber(values[2]),
			freeMB: this.toNumber(values[3]),
			availableMB: this.toNumber(values[6]),
			raw: result.output,
		}
	}

	private parseDisk(result: CoreStatsCommandResult): CoreStatsDisk {
		const lines = result.output
			.split('\n')
			.map(line => line.trim())
			.filter(Boolean)
		const rootLine =
			lines.find((line, index) => index > 0 && line.endsWith(' /')) ?? lines[1] ?? null

		if (!rootLine) {
			return {
				ok: result.ok,
				raw: result.output,
				root: null,
			}
		}

		const values = rootLine.split(/\s+/)
		if (values.length < 6) {
			return {
				ok: result.ok,
				raw: result.output,
				root: null,
			}
		}

		return {
			ok: result.ok,
			raw: result.output,
			root: {
				filesystem: values[0],
				size: values[1],
				used: values[2],
				available: values[3],
				usePercentage: values[4],
				mountedOn: values.slice(5).join(' '),
			},
		}
	}

	private parseWho(result: CoreStatsCommandResult): string[] {
		if (!result.ok) {
			return []
		}

		return result.output
			.split('\n')
			.map(line => line.trim())
			.filter(Boolean)
	}

	private toNumber(value?: string): number | null {
		if (!value) {
			return null
		}

		const parsed = Number(value)
		return Number.isFinite(parsed) ? parsed : null
	}

	private async executeCommand(
		command: CoreStatsCommand,
	): Promise<CoreStatsCommandResult> {
		try {
			const output = await this.runShellCommand(command)
			return {
				command,
				ok: true,
				output: output.trim(),
			}
		} catch (error) {
			return {
				command,
				ok: false,
				output: this.getCommandErrorMessage(error),
			}
		}
	}

	private async runShellCommand(command: CoreStatsCommand): Promise<string> {
		switch (command) {
			case 'free -m':
				return $`free -m`.text()
			case 'df -h':
				return $`df -h`.text()
			case 'uptime':
				return $`uptime`.text()
			case 'who':
				return $`who`.text()
			case 'cpupower frequency-info':
				return $`cpupower frequency-info`.text()
		}
	}

	private getCommandErrorMessage(error: unknown): string {
		if (error && typeof error === 'object') {
			const stderr =
				'stderr' in error && error.stderr ?
					Buffer.from(error.stderr as ArrayBufferLike)
						.toString()
						.trim()
				:	''
			if (stderr) {
				return stderr
			}

			const stdout =
				'stdout' in error && error.stdout ?
					Buffer.from(error.stdout as ArrayBufferLike)
						.toString()
						.trim()
				:	''
			if (stdout) {
				return stdout
			}
		}

		return error instanceof Error ? error.message : String(error)
	}

	private normalizePath(path: string): string {
		const normalizedPath = path.trim().replace(/\/+/g, '/')

		if (!normalizedPath) {
			return DEFAULT_STATS_PATH
		}

		const withLeadingSlash =
			normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`
		const withoutTrailingSlash = withLeadingSlash.replace(/\/+$/, '')

		return withoutTrailingSlash || DEFAULT_STATS_PATH
	}

	private resolveEnabled(enabled?: boolean): boolean {
		if (typeof enabled === 'boolean') {
			return enabled
		}

		const envValue = process.env.ENABLE_CORE_STATS?.trim().toLowerCase()
		return envValue === 'true' || envValue === '1'
	}
}

export function getCoreStatsController(): Controller | null {
	if (!isCoreStatsEnabled()) {
		return null
	}

	const controller = getCoreStatsInstance().getController()
	if (!controller) {
		return null
	}

	trackControllerStats(controller)
	return controller
}

export function getCoreStatsPath(): string {
	return DEFAULT_STATS_PATH
}

export function isCoreStatsEnabled(): boolean {
	const envValue = process.env.ENABLE_CORE_STATS?.trim().toLowerCase()
	return envValue === 'true' || envValue === '1'
}

function getCoreStatsInstance(): CoreStats {
	if (!coreStatsSingleton) {
		coreStatsSingleton = new CoreStats()
	}

	return coreStatsSingleton
}
