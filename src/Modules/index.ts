import { Glob } from "bun";
import { z } from "zod";
import { Controller } from "../Controller";

export const Module = z.object({
  name: z.string(),
  version: z.string(),
})

export const Model = z.object({
  name: z.string(),
  version: z.string(),
  handler: z.function(),
})

export const Service = z.object({
  name: z.string(),
  version: z.string(),
  handler: z.function(),
})

export const Controllers = z.array(z.object({
  name: z.string(),
  version: z.string(),
  handler: z.function(),
	handleError: z.function().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  path: z.string(),
	enabled: z.boolean().optional(),
}))

export const Types = z.object(z.record(z.string(), z.any())).optional()

export type ModelType = z.infer<typeof Model>
export type ServiceType = z.infer<typeof Service>
export type ControllerType = z.infer<typeof Controllers>[number]
export type TypesType = z.infer<typeof Types>
export type ModuleType = z.infer<typeof Module>



export class Modules {
	private readonly controllers: Controller[] = [];
	private readonly services: ServiceType[] = [];
	private readonly models: ModelType[] = [];
	private readonly types: TypesType;

	private readonly path: string = './'
  constructor(path: string) {
    this.path = path;
  }

	async load() {

		console.log('scanning for modules in', this.path);
		const glob = new Glob("**/__module__.ts");

		for await (const file of glob.scan(this.path)) {
  		console.log(file);
			if (file.endsWith('__module__.ts')) {
				console.log('loading module:', file);
				const completedPath = `file://${process.cwd()}/${this.path}${file}`;
				console.log('completed path:', completedPath);
				const module = await import(completedPath);
				await this.loadControllers(module.default, file);
			}
		}
	}

	async loadControllers(module: ModuleType, path: string) {
		console.log(`loading all controllers for ${module.name}@${module.version} - ${path}`);
		const glob = new Glob("**/*.ts");

		const pathFixed = `${this.path}${path.replace('__module__.ts', 'controllers/')}`;
		for await (const file of glob.scan(pathFixed)) {
				console.log('loading controller:', file);
				const completedPath = `file://${process.cwd()}/${pathFixed}${file}`;
				console.log('completed path:', completedPath);
				const controller = await import(completedPath);

				this.controllers.push(new Controller(
					controller.default.method,
					controller.default.path,
					async (req, res) => {
						return controller.default.handler(req, res).catch((err) => {
							if (controller.default.handleError) {
								return controller.default.handleError(req, res, err);
							}
							throw err
						});
					},
				));
		}
	}
	getControllers(): Controller[] {
		return this.controllers;
	}

	getServices(): ServiceType[] {
		return this.services;
	}

	getModels(): ModelType[] {
		return this.models;
	}

	getTypes(): TypesType {
		return this.types;
	}
}
