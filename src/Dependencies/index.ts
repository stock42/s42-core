export class Dependencies {
  private static dependencies = new Map<string, any>();

  public static add<DEP>(name: string, dep: DEP): void {
    if (Dependencies.dependencies.has(name)) {
      throw new Error(`Dependency with name "${name}" already exists.`);
    }
    Dependencies.dependencies.set(name, dep);
  }

  public static get<DEP>(name: string): DEP | null {
    return Dependencies.dependencies.get(name) ?? null;
  }

  public static remove(name: string): boolean {
    return Dependencies.dependencies.delete(name);
  }

  public static clear(): void {
    Dependencies.dependencies.clear();
  }

  public static has(name: string): boolean {
    return Dependencies.dependencies.has(name);
  }
}
