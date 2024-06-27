# SHUTDOWN

- [SHUTDOWN](#shutdown)
	- [Overview](#overview)
	- [Usage](#usage)
		- [Basic Example](#basic-example)
	- [Methods](#methods)

## Overview

The `SHUTDOWN` module in `s42-core` is used to specify an array of processes (functions) that you want to execute when the process is about to terminate. This is typically used to close database connections, event domains (very important), etc.

## Usage

### Basic Example

```typescript
import { Shutdown } from 's42-core';

Shutdown([
  () => {
    console.log('Cleaning up...');
    // Clean up resources, close connections, etc.
  },
  () => {
    console.log('Closing database connections...');
    // Close database connections
  }
]);
```

## Methods
```typescript
Shutdown(cleanupFunctions: Function[])
```
- cleanupFunctions: An array of functions to call during shutdown. These functions should NOT be asynchronous.



