export class Dependencies {
    static dependencies = {};
    static add(name, dep) {
        Dependencies.dependencies[name] = dep;
    }
    static get(name) {
        const dep = Dependencies.dependencies[name];
        if (dep !== undefined) {
            return dep;
        }
        return null;
    }
}
