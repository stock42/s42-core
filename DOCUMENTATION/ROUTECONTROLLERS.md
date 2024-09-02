
# ROUTE CONTROLLERS

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

## Overview

The `RouteControllers` class/module in `s42-core` is designed to manage routes and controllers, providing a robust and flexible alternative to frameworks like Express. It allows you to define and handle HTTP requests efficiently while maintaining the flexibility to integrate with any framework.

## Purpose

The primary goal of the `RouteControllers` class is to manage HTTP routes and their associated controllers. This class processes all controllers, maps routes to their corresponding handlers, and provides a mechanism to handle HTTP requests and responses.

## Key Features

### Route and Controller Management

`RouteControllers` efficiently maps routes to their respective controllers and methods, ensuring that HTTP requests are properly routed and handled.

### Header Management

The class includes methods to dynamically set, update, and clear HTTP headers for responses, such as cache control, CORS, and content security policies.

### JSON Body Parsing

It provides a mechanism to parse JSON bodies from incoming requests, making it easy to handle and process request data.

### Query Parameter Parsing

The `RouteControllers` class includes functionality to parse query parameters from the URL, converting them into a key-value object for easy access and manipulation.

### Middleware Support

`RouteControllers` supports global middleware that can be executed for every route, providing a mechanism for pre-processing requests or adding common functionality across all routes.

### Flexible Integration

While `RouteControllers` offers a comprehensive routing solution, using it is entirely optional. `s42-core` remains agnostic to any framework, allowing you to integrate `RouteControllers` or use another routing framework as per your preference.

## Methods

### `processAllControllers()`

Processes all controllers provided during the initialization, mapping their methods and paths to the internal route cache.

### `setServer(server: Server)`

Sets the HTTP server instance for the `RouteControllers` to use.

- **server**: The HTTP server instance.

### `listen(port: number)`

Starts the HTTP server and begins listening on the specified port.

- **port**: The port number to listen on.

### `checkRoute(route: string): RouteCheckResult`

Checks if a route exists in the internal route cache, ignoring any query parameters.

- **route**: The HTTP method and URL of the route to check.
- **returns**: An object indicating whether the route exists and any route parameters.

### `addHeader(header: string, value: string)`

Adds or updates an HTTP header in the internal headers object.

- **header**: The name of the HTTP header.
- **value**: The value of the HTTP header.

### `setHeaders()`

Sets the default HTTP headers by calling `addHeader` internally for each header.

### `getHeadersToSend(): { [key: string]: string }`

Returns the current set of headers that will be sent with the response.

- **returns**: An object containing all HTTP headers set for the response.

### `setResponseHeaders()`

Applies all headers stored in the internal headers object to the current HTTP response.

### `clearAllHeaders()`

Clears all headers stored in the internal headers object.

### `getQueryParams(url: string): { [key: string]: string }`

Parses the query parameters from a URL and returns them as a key-value object.

- **url**: The URL to parse.
- **returns**: An object containing the query parameters.

### `getRequestObject(req: IncomingMessage): Promise<TypeRequestInternalObject>`

Constructs and returns a request object with relevant information, including headers, IP address, parameters, body, query parameters, URL, and method.

- **req**: The HTTP request object.
- **returns**: A promise that resolves to the constructed request object.

### `getResponseObject(res: ServerResponse): TypeResponseInternalObject`

Constructs and returns a response object with methods for sending various types of responses.

- **res**: The HTTP response object.

### `notFound(res: ServerResponse, message?: string)`

Sends a 404 Not Found response with the specified message.

- **res**: The HTTP response object.
- **message**: The message to send (optional).

### `serverError(res: ServerResponse, message?: string)`

Sends a 500 Internal Server Error response with the specified message.

- **res**: The HTTP response object.
- **message**: The message to send (optional).

### `addGlobal(callback: (req: TypeRequest, res: ServerResponse, next?: (req: TypeRequest, res: ServerResponse) => void) => void)`

Adds a global middleware callback that will be executed for every incoming request.

- **callback**: A function that receives the request and response objects, and optionally a `next` function for chaining middleware.

### `getCallback(): TypeReturnCallback`

Returns a callback function that processes incoming requests, checks routes, and invokes the appropriate controller methods. It also sets the response headers using the `setResponseHeaders` method.

### `getInstance(controllers: Controller[])`

Returns the singleton instance of `RouteControllers`. If an instance does not already exist, it creates a new one.

- **controllers**: An array of controller instances.

## Controller Parameters

When a controller is called, it receives the following parameters:

### `req: TypeRequestInternalObject`

- **headers**: An object containing the request headers.
- **realIp**: A string representing the real IP address of the client.
- **url**: The URL of the request.
- **method**: The HTTP method of the request (e.g., GET, POST).
- **query**: An object containing the query parameters as key-value pairs.
- **body**: An object containing the parsed JSON body of the request.
- **on**: A function to register event listeners.

### `res: TypeResponseInternalObject`

- **end**: A function to end the response with a given body.
- **json**: A function to send a JSON response.
- **_404**: A function to send a 404 Not Found response with a given body.
- **_500**: A function to send a 500 Internal Server Error response with a given body.

## Use Cases

### Example 1: Managing Routes and Controllers

You can define multiple controllers, each handling different routes and HTTP methods, and manage them using `RouteControllers`.

```typescript
import { createServer } from 'node:http'

import {
  Shutdown,
  Cluster,
  Dependencies,
  MongoClient,
  RedisClient,
  EventsDomain,
  RouteControllers,
} from 's42-core'

import { userController, healthController } from './controllers'

const port = process.env.PORT ?? 3000

Cluster(
  1,
  async (pid, uuid) => {
    console.info('initializing: ', pid, uuid)
    const mongoClient = MongoClient.getInstance({
      connectionString: String(process.env?.MONGO_URI),
      database: String(process.env?.MONGO_DB),
    })

    await mongoClient.connect()
    const redisClient = RedisClient.getInstance('localhost')

    const eventsDomain = EventsDomain.getInstance(redisClient, uuid)

    Dependencies.add<MongoClient>('db', mongoClient)
    Dependencies.add<RedisClient>('redis', redisClient)
    Dependencies.add<EventsDomain>('eventsDomain', eventsDomain)

    const routerControllers = RouteControllers.getInstance([
      userController,
      healthController,
    ])
    const server = createServer(routerControllers.getCallback())

    server.listen(port, () => {
      console.info(`ready on *:${port}`)
    })
    Shutdown([mongoClient.close, redisClient.close, eventsDomain.close])
  },
  () => {
    console.info('Error trying to start servers')
  },
)
```

By leveraging the `RouteControllers` class, you can efficiently manage your HTTP routes and controllers, creating a flexible and robust routing solution that integrates seamlessly with `s42-core` and other frameworks.
