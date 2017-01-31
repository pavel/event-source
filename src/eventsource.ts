import { EventEmitter } from "events"
import { request as httpRequest, ClientResponse, ClientRequest } from "http"
import { request as httpsRequest } from "https"
import { parse as parseURL } from "url"
import EventStreamParser from "event-stream"

type HTTPHeaders = { [index: string]: string }

interface EventSourceOptions {
	headers?: HTTPHeaders
	reconnectTimeout?: number
}

enum ReadyState {
	CONNECTING = 0,
	OPEN = 1,
	CLOSED = 2
}

function getTransport(protocol): Function {
	switch (protocol) {
		case "http:":
			return httpRequest
		case "https:":
			return httpsRequest
		default:
			throw new Error(`Unknown protocol ${protocol}`)
	}
}

class EventSource extends EventEmitter {
	static get CONNECTING():ReadyState {
		return ReadyState.CONNECTING
	}
	static get OPEN(): ReadyState {
		return ReadyState.OPEN
	}
	static get CLOSED(): ReadyState {
		return ReadyState.CLOSED
	}

	get url(): string {
		return this._url
	}
	get readyState(): ReadyState {
		return this._readyState
	}

	private _reconnectTimeout: number = 500
	private _readyState: ReadyState = ReadyState.CLOSED
	private _url: string
	private _connectionOptions: any
	private _transport: Function
	private _timeouts: any[] = []
	private _req: ClientRequest
	private _lastEventId: string | number

	constructor(url: string, options: EventSourceOptions = {}) {
		super()

		this._url = url.trim()

		const { headers = {}, reconnectTimeout } = options
		if (typeof reconnectTimeout === "number") {
			this._reconnectTimeout = reconnectTimeout
		}

		this._connectionOptions = parseURL(this._url)
		this._transport = getTransport(this._connectionOptions.protocol)
		this._connectionOptions.headers = headers
		if (headers["Last-Event-ID"] != null) {
			this._lastEventId = headers["Last-Event-ID"]
		}
		this._connect()

	}

	private _connect() {
		if (this._readyState === ReadyState.CONNECTING || this._readyState === ReadyState.OPEN) {
			console.log("Already connected, bye")
			return
		}
		if (this._lastEventId != null) {
			this._connectionOptions.headers["Last-Event-ID"] = this._lastEventId
		}
		this._req = this._transport(this._connectionOptions)
		this._readyState = ReadyState.CONNECTING
		this.emit("connecting")
		this._req.on("response", this._handleResponse.bind(this))
		this._req.on("error", (err) => {
			this.emit("error", err)
		})
		this._req.on("close", () => {
			this.emit("error", { reason: "connection lost" })
			this._req.removeAllListeners()
			this._readyState = ReadyState.CLOSED
			this._reconnect()
		})
		this._req.end()
	}

	private _reconnect() {
		const to = setTimeout(this._connect.bind(this), this._reconnectTimeout)
		const ind = this._timeouts.push(to)
		setTimeout(() => {
			clearTimeout(to)
			this._timeouts.splice(ind, 1)
		}, this._reconnectTimeout + 100)
		return
	}

	private _handleResponse(res: ClientResponse) {
		if (res.statusCode > 399) {
			this.emit("error", { status: res.statusCode, reason: res.statusMessage })
			return
		}
		console.log("Connected")
		this._readyState = ReadyState.OPEN
		const parser = new EventStreamParser()
		res.pipe(parser)
		parser.on("data", (event) => {
			if (event.reply) {
				this._reconnectTimeout = event.reply
			}
			if (event.lastEventId != null) {
				this._lastEventId = event.lastEventId
			}
			this.emit(event.type, event)
		})
	}

	close() {
		this._req.abort()
		this._req.removeAllListeners()
		this.removeAllListeners()
		this._readyState = ReadyState.CLOSED
	}

}

export { HTTPHeaders, EventSourceOptions, ReadyState }
export default EventSource
