

- [ROUTE CONTROLLERS](#route-controllers)
	- [Overview](#overview)
	- [Purpose](#purpose)
	- [Key Features](#key-features)
		- [Route and Controller Management](#route-and-controller-management)
		- [Header Management](#header-management)
		- [JSON Body Parsing](#json-body-parsing)
		- [Query Parameter Parsing](#query-parameter-parsing)
		- [Middleware Support](#middleware-support)
		- [Flexible Integration](#flexible-integration)
	- [Methods](#methods)
		- [`processAllControllers()`](#processallcontrollers)
		- [`setServer(server: Server)`](#setserverserver-server)
		- [`listen(port: number)`](#listenport-number)
		- [`checkRoute(route: string): RouteCheckResult`](#checkrouteroute-string-routecheckresult)
		- [`addHeader(header: string, value: string)`](#addheaderheader-string-value-string)
		- [`setHeaders()`](#setheaders)
		- [`getHeadersToSend(): { [key: string]: string }`](#getheaderstosend--key-string-string-)
		- [`setResponseHeaders()`](#setresponseheaders)
		- [`clearAllHeaders()`](#clearallheaders)
		- [`getQueryParams(url: string): { [key: string]: string }`](#getqueryparamsurl-string--key-string-string-)
		- [`getRequestObject(req: IncomingMessage): Promise<TypeRequestInternalObject>`](#getrequestobjectreq-incomingmessage-promisetyperequestinternalobject)
		- [`getResponseObject(res: ServerResponse): TypeResponseInternalObject`](#getresponseobjectres-serverresponse-typeresponseinternalobject)
		- [`notFound(res: ServerResponse, message?: string)`](#notfoundres-serverresponse-message-string)
		- [`serverError(res: ServerResponse, message?: string)`](#servererrorres-serverresponse-message-string)
		- [`addGlobal(callback: (req: TypeRequest, res: ServerResponse, next?: (req: TypeRequest, res: ServerResponse) => void) => void)`](#addglobalcallback-req-typerequest-res-serverresponse-next-req-typerequest-res-serverresponse--void--void)
		- [`getCallback(): TypeReturnCallback`](#getcallback-typereturncallback)
		- [`getInstance(controllers: Controller[])`](#getinstancecontrollers-controller)
	- [Controller Parameters](#controller-parameters)
		- [`req: TypeRequestInternalObject`](#req-typerequestinternalobject)
		- [`res: TypeResponseInternalObject`](#res-typeresponseinternalobject)
	- [Use Cases](#use-cases)
		- [Example 1: Managing Routes and Controllers](#example-1-managing-routes-and-controllers)

# RouteControllers Documentation

The `RouteControllers` class is part of the `s42-core` package and is designed to manage and route HTTP requests efficiently. It works seamlessly with the `Controller` class to handle routes, middlewares, and HTTP methods dynamically.

Using `RouteControllers` without the `Controller` class does not make sense, as it relies entirely on `Controller` instances to define and manage the routing logic.

---

## Purpose

The `RouteControllers` class processes a collection of `Controller` instances and maps their paths and methods to appropriate callbacks. It evaluates whether an incoming request matches a defined route, enabling dynamic routing with support for:

- **Wildcard paths** (e.g., `*` for any path).
- **Dynamic parameters** (e.g., `/users/:userId`).
- **Wildcard HTTP methods** (e.g., `'*'` for any method).

---

## Installation

Install the `s42-core` package to use `RouteControllers`:

```bash
npm install s42-core
```

---

## Usage

### Importing and Defining Controllers
To use `RouteControllers`, you must define routes using the `Controller` class.

```typescript
import { Controller, RouteControllers, Server } from 's42-core';

async function main() {
  const server = new Server();

  // Define controllers
  const controllerTest = new Controller('GET', '/test', async (req, res) => {
    console.info('URL:', req.url);
    return res.json({ message: 'Hello World!' });
  });

  const controllerWithParams = new Controller('GET', '/users/:userId', async (req, res) => {
    console.info('Params:', req.params);
    return res.json({ userId: req.params.userId });
  });

  const wildcardController = new Controller('*', '*', async (req, res) => {
    console.info('All paths and methods');
    return res.text('Resource not found');
  });

  // Add middleware to a controller
  controllerTest.use(async (req) => {
    req.extraInfo = 'middleware data';
  });

  // Create RouteControllers with controllers
  const routeControllers = new RouteControllers([
    controllerTest,
    controllerWithParams,
    wildcardController,
  ]);

  // Start the server
  await server.start({
    port: 3000,
    RouteControllers: routeControllers,
  });

  console.info('Server is running on:', server.getURL());
}

main();
```

---

## Key Methods

### `constructor(controllers: Controller[])`
Initializes the `RouteControllers` instance with an array of `Controller` instances.

**Parameters:**
- `controllers`: An array of `Controller` instances defining the routes.

### `getCallback(): (req: Request) => Promise<Response>`
Returns a callback function to handle incoming requests. This callback determines if a route exists and invokes the appropriate middleware chain.

### `checkRoute(route: string): RouteCheckResult`
Evaluates if a given route exists in the registered controllers. It supports:
- Wildcard methods (`'*'`).
- Wildcard paths (`'*'`).
- Dynamic parameters (e.g., `:userId`).

**Example Result:**
```typescript
{
  exists: true,
  params: { userId: '123' },
  key: 'GET:/users/:userId'
}
```

---

## Features

1. **Dynamic Routing:** Handles static paths, dynamic parameters, and wildcard routes with ease.
2. **Middleware Support:** Integrates middleware into `Controller` instances for pre-processing requests.
3. **Efficient Mapping:** Builds an internal cache for quick lookup of routes and callbacks.
4. **Error Handling:** Returns appropriate `404` or `500` responses for unmatched routes or internal errors.
5. **Flexible Integration:** Works seamlessly with the `Server` class from `s42-core`.

---

## FormData Support

Controllers receive a request object with a `formData()` helper for `multipart/form-data` and
`application/x-www-form-urlencoded` payloads. For other content types, it returns an empty `FormData`.

```typescript
const form = req.formData();
const fields = Object.fromEntries(form.entries());
```

---

## Example Output

### 1. **Defined Routes**
- **Route:** `GET /test`
  - **Response:** `{ "message": "Hello World!" }`

- **Route:** `GET /users/123`
  - **Response:** `{ "userId": "123" }`

- **Route:** `POST /unknown`
  - **Response:** `"Resource not found"`

---

## Advantages

- **Simplifies Routing:** Automatically maps controllers to routes.
- **Supports Wildcards:** Flexible routing with `'*'` for methods and paths.
- **Error Resilience:** Ensures proper handling of unmatched routes and exceptions.
- **Middleware Integration:** Allows layered logic for requests.

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.
