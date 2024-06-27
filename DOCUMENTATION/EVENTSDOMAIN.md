# EVENTSDOMAIN

- [EVENTSDOMAIN](#eventsdomain)
	- [Overview](#overview)
	- [Purpose](#purpose)
	- [Key Features](#key-features)
		- [Round-Robin Event Emission](#round-robin-event-emission)
		- [Event Registration and Notification](#event-registration-and-notification)
		- [Dependency on Redis](#dependency-on-redis)
		- [Graceful Shutdown](#graceful-shutdown)
	- [Best Practices](#best-practices)
	- [Usage Scenario](#usage-scenario)

## Overview

The `EventsDomain` class/module in `s42-core` is designed to emit domain events from our microservices, cells, or software components. It relies on an instance of Redis from `s42-core` to function.

## Purpose

The primary goal of `EventsDomain` is to provide a robust and efficient way to manage and emit domain events across different parts of an application. It ensures that events are handled in a round-robin manner, distributing events evenly across all instances that are listening to a particular event.

## Key Features

### Round-Robin Event Emission

One of the main features of `EventsDomain` is its use of a round-robin system to emit events to instances that are listening to a particular event. This ensures that the load is balanced across all listening instances.

### Event Registration and Notification

Every time an event is listened to, it is notified to an internal channel. All instances are aware of who is listening to which event, ensuring proper event distribution and handling.

### Dependency on Redis

`EventsDomain` depends on an instance of Redis from `s42-core` to function. It uses Redis for publishing and subscribing to events, making sure that all instances can communicate effectively.

### Graceful Shutdown

It is recommended to use the `Shutdown` class to call the `close` method of `EventsDomain`. This ensures that the instance announces that it is no longer available to process the events it was listening to, allowing for a clean and graceful shutdown.

## Best Practices

- **Event Naming Convention**: It is a good practice to use an event naming format like `$domain.$subdomain.$action`. For example, "users.created" or "cart.products.add".
- **Graceful Shutdown**: Always ensure that `EventsDomain` instances call the `close` method during shutdown to notify other instances that they are no longer available.

## Usage Scenario

Consider a scenario where you have a microservice with an endpoint to create users. On the other hand, you have a software cell that listens to the "users.created" event and sends a welcome email.

This setup ensures that every time a user is created, an event is emitted and the corresponding action (sending a welcome email) is triggered in a different part of the system.

---

By following these practices and utilizing the `EventsDomain` class, you can effectively manage and emit domain events across your microservices, cells, or software components.
