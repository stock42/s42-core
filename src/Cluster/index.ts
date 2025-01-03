import { spawn } from 'bun';
import { randomUUID } from 'crypto';

import { type TypeConstructor, type TypeCommandToWorkers } from './types.ts';

export class Cluster {
  private cpus = navigator.hardwareConcurrency;
  private buns: Array<ReturnType<typeof spawn>> = [];
  private file: string = '';
  private name: string = 'noname';
  private maxCPU: number = 0;
  private callbackOnWorkerMessage: Array<(message: string) => void> = [];
  private watchMode: boolean = false;

  constructor(props: TypeConstructor & { watchMode?: boolean }) {
    this.name = props.name;
    this.maxCPU = props.maxCPU && props.maxCPU < this.cpus ? props.maxCPU : this.cpus;
    this.buns = new Array(this.maxCPU);
    this.watchMode = props.watchMode ?? false;
  }

  public onWorkerMessage(callback: (message: string) => void): void {
    this.callbackOnWorkerMessage.push(callback);
  }

  public start(file: string, fallback: (err: Error) => void): void {
    if (this.buns.length > 0 && this.buns.some((bun) => bun?.pid)) {
      console.warn('Workers are already running.');
      return;
    }

    try {
      this.file = file;
      console.info(`Spawning ${this.maxCPU} worker(s) for ${this.name}`);

      const cmd = this.watchMode ? ['bun', file, '--watch'] : ['bun', file]; // Agrega `--watch` si corresponde

      for (let i = 0; i < this.maxCPU; i++) {
        this.buns[i] = spawn({
          cmd,
          stdout: 'inherit',
          stderr: 'inherit',
          stdin: 'inherit',
          onExit(code) {
            console.info(`Worker exited with code ${code}`);
          },
          ipc: (message, childProc) => {
            this.handleWorkerMessage(message, childProc);
          },
        });
      }

      process.on('SIGINT', this.killWorkers.bind(this));
      process.on('exit', this.killWorkers.bind(this));

      this.sendCommandToWorkers({ command: 'start', message: this.file });
      this.sendCommandToWorkers({ command: 'setName', message: this.name });
    } catch (unknownError) {
      const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
      fallback(new Error(`Cluster setup failed: ${error.message}`));
    }
  }

  private sendCommandToWorkers(command: TypeCommandToWorkers): void {
    if (!this.buns.length) {
      console.warn('No active workers to send the command.');
      return;
    }

    for (const bun of this.buns) {
      bun.send(
        JSON.stringify({
          ...command,
          ack: randomUUID(),
        }),
      );
    }
  }

  public sendMessageToWorkers(message: string): void {
    if (!this.buns.length) {
      console.warn('No active workers to send the message.');
      return;
    }

    for (const bun of this.buns) {
      bun.send(message);
    }
  }

  public getCurrentFile(): string {
    return this.file;
  }

  public getCurrentWorkers(): Array<ReturnType<typeof spawn>> {
    return this.buns;
  }

  private killWorkers(): void {
    console.info(`Shutting down ${this.name} workers...`);
    for (const bun of this.buns) {
      if (bun?.pid) {
        console.info(`Killing worker ${bun.pid}`);
        bun.kill();
      }
    }
    console.info('All workers have been terminated.');
    process.exit(0);
  }

  private handleWorkerMessage(message: string, childProc: ReturnType<typeof spawn>): void {
    if (message.startsWith('>>.<<|')) {
      this.sendCommandToWorkers({
        command: 'sendMessageToCluster',
        message: message.replace('>>.<<|', ''),
      });
    } else {
      for (const callback of this.callbackOnWorkerMessage) {
        callback(message);
      }
    }
  }
}
