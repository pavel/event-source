EventSource implementation for Node.js
===

This library implements [EventSource (Server-Sent Events client)](https://www.w3.org/TR/eventsource/) for Node.js.

**There're no tests for this library**

Usage
-----

```javascript
import EventSource from "../src/eventsource"

// HTTP and HTTPS URLs are supported
const es = new EventSource("http://localhost/sse", {
  // Reconnect timeout in milliseconds
  reconnectTimeout: 1000,
  // Custom headers
  headers: {
    "X-API-Token": "1a414f28633194f1450af2661001df8f"
  }
})

es.on("message", (event) => {
	console.log("Got event", event)
})

es.on("error", (err) => {
	console.log("Error:", err)
})

es.on("connecting", () => {
	console.log("Connecting")
})

// Use `es.close()` to close EventSource
```
