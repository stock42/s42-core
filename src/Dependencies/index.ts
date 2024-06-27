export class Dependencies {
	private static dependencies: { [key: string]: any } = {}

	public static add<DEP>(name: string, dep: DEP): void {
		Dependencies.dependencies[name] = dep
	}

	public static get<DEP>(name: string): DEP | null {
		const dep = Dependencies.dependencies[name]
		if (dep !== undefined) {
			return dep as DEP
		}
		return null
	}
}
