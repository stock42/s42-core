# CLUSTER
- [CLUSTER](#cluster)
	- [Overview](#overview)
	- [Important Note](#important-note)
	- [Usage](#usage)
		- [Basic Example](#basic-example)
	- [Methods](#methods)
		- [`Cluster(workers: number, workerCallback: Function, errorCallback: Function)`](#clusterworkers-number-workercallback-function-errorcallback-function)
	- [Additional Details](#additional-details)

## Overview

The `CLUSTER` class/module in `s42-core` is designed to facilitate the creation and management of Node.js clusters, allowing applications to take full advantage of multi-core systems by spawning multiple processes.

## Important Note

The first argument to the `Cluster` function is the number of workers. The `Cluster` module detects the number of cores on the server and can spawn one worker per available core.

- If the first argument is zero, it will spawn one worker per available core.
- If the first argument is a number other than zero, it will spawn the specified number of workers.


## Usage

### Basic Example

```typescript
import { Cluster } from 's42-core';

Cluster(
  1,  // Number of cluster workers. 0 for use all cores
  async (pid, uuid) => {
    console.info('Initializing: ', pid, uuid);
    // Worker initialization code here
  },
  () => {
    console.error('Error trying to start servers');
  },
);
```

## Methods

### `Cluster(workers: number, workerCallback: Function, errorCallback: Function)`

- **workers**: The number of worker processes to spawn.
- **workerCallback**: A callback function that is called for each worker process. This callback receives the `processId` and a `UUID` that uniquely identifies the process.
- **errorCallback**: A callback function that is called if there is an error starting the cluster.


## Additional Details
This module uses the built-in cluster module of Node.js to manage worker processes. It provides a simple interface to create clusters and handle worker-specific initialization and error management.