
- [Test Utility Documentation](#test-utility-documentation)
	- [Purpose](#purpose)
	- [Functions](#functions)
		- [1. `Init(message: string): void`](#1-initmessage-string-void)
		- [2. `Ok(message: string): void`](#2-okmessage-string-void)
		- [3. `Error(message: string, error?: Error): void`](#3-errormessage-string-error-error-void)
		- [4. `Request(method: string, url: string): void`](#4-requestmethod-string-url-string-void)
		- [5. `Finish(): void`](#5-finish-void)
	- [Installation](#installation)
	- [Usage Example](#usage-example)
	- [Advantages](#advantages)
	- [License](#license)

# Test Utility Documentation

The `Test` utility is part of the `s42-core` package and is designed to standardize and enhance logging during application development and testing. It provides a set of pre-defined functions for outputting clear, color-coded messages in the console, making it easier to track the progress and status of operations.

## Purpose

The purpose of the `Test` utility is to simplify and improve the readability of console messages. It is particularly useful for:

- Debugging and testing applications.
- Providing structured logs for operations.
- Displaying the status of HTTP requests, initialization, and error handling in a consistent format.

---

## Functions

### 1. `Init(message: string): void`
Logs an initialization message.

**Example:**
```typescript
Test.Init("Starting the process...");
```
**Output:**
```
INIT> Starting the process...
```

---

### 2. `Ok(message: string): void`
Logs a success message with a checkmark.

**Example:**
```typescript
Test.Ok("Operation completed successfully!");
```
**Output:**
```
✅ OK> Operation completed successfully!
```

---

### 3. `Error(message: string, error?: Error): void`
Logs an error message with an optional error stack.

**Example:**
```typescript
Test.Error("An error occurred.", new Error("Sample error"));
```
**Output:**
```
📛 > An error occurred.
Error stack (if provided)
```

---

### 4. `Request(method: string, url: string): void`
Logs an HTTP request with the method and URL.

**Example:**
```typescript
Test.Request("POST", "https://api.example.com/data");
```
**Output:**
```
+ Request> POST https://api.example.com/data
```

---

### 5. `Finish(): void`
Logs a message indicating that all tests or processes have been completed.

**Example:**
```typescript
Test.Finish();
```
**Output:**
```
😃 > All tests completed
```

---

## Installation

To use the `Test` utility, install the `s42-core` package:

```bash
npm install s42-core
```

---

## Usage Example

```typescript
import { Test } from 's42-core';

Test.Init("Storage files");
Test.Ok("Operation successful!");
Test.Error("An error occurred.", new Error("Sample error stack"));
Test.Request("GET", "https://example.com/api");
Test.Finish();
```

**Output:**
```
INIT> Storage files
✅ OK> Operation successful!
📛 > An error occurred.
Error stack (if provided)
+ Request> GET https://example.com/api
😃 > All tests completed
```

---

## Advantages

- **Consistency:** Ensures uniform log formatting across the application.
- **Readability:** Uses color-coded messages for better visibility.
- **Ease of Use:** Provides simple, pre-defined methods for common log types.
- **Debugging:** Helps quickly identify initialization, success, errors, and HTTP requests.

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.


