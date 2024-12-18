export class Dependencies {
  private static dependencies = new Map<string, any>();

  /**
   * Adds a dependency to the registry.
   * @param name - The unique name of the dependency.
   * @param dep - The dependency to store.
   */
  public static add<DEP>(name: string, dep: DEP): void {
    if (Dependencies.dependencies.has(name)) {
      throw new Error(`Dependency with name "${name}" already exists.`);
    }
    Dependencies.dependencies.set(name, dep);
  }

  /**
   * Retrieves a dependency by its name.
   * @param name - The name of the dependency to retrieve.
   * @returns The dependency if found, or null if not found.
   */
  public static get<DEP>(name: string): DEP | null {
    return Dependencies.dependencies.get(name) ?? null;
  }

  /**
   * Removes a dependency from the registry.
   * @param name - The name of the dependency to remove.
   * @returns True if the dependency was removed, false if it didn't exist.
   */
  public static remove(name: string): boolean {
    return Dependencies.dependencies.delete(name);
  }

  /**
   * Clears all dependencies from the registry.
   */
  public static clear(): void {
    Dependencies.dependencies.clear();
  }

  /**
   * Checks if a dependency exists in the registry.
   * @param name - The name of the dependency to check.
   * @returns True if the dependency exists, false otherwise.
   */
  public static has(name: string): boolean {
    return Dependencies.dependencies.has(name);
  }
}
