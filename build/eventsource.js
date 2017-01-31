"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var events_1 = require("events");
var http_1 = require("http");
var https_1 = require("https");
var url_1 = require("url");
var event_stream_1 = require("event-stream");
var ReadyState;
(function (ReadyState) {
    ReadyState[ReadyState["CONNECTING"] = 0] = "CONNECTING";
    ReadyState[ReadyState["OPEN"] = 1] = "OPEN";
    ReadyState[ReadyState["CLOSED"] = 2] = "CLOSED";
})(ReadyState || (ReadyState = {}));
exports.ReadyState = ReadyState;
function getTransport(protocol) {
    switch (protocol) {
        case "http:":
            return http_1.request;
        case "https:":
            return https_1.request;
        default:
            throw new Error("Unknown protocol " + protocol);
    }
}
var EventSource = (function (_super) {
    __extends(EventSource, _super);
    function EventSource(url, options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this) || this;
        _this._reconnectTimeout = 500;
        _this._readyState = ReadyState.CLOSED;
        _this._timeouts = [];
        _this._url = url.trim();
        var _a = options.headers, headers = _a === void 0 ? {} : _a, reconnectTimeout = options.reconnectTimeout;
        if (typeof reconnectTimeout === "number") {
            _this._reconnectTimeout = reconnectTimeout;
        }
        _this._connectionOptions = url_1.parse(_this._url);
        _this._transport = getTransport(_this._connectionOptions.protocol);
        _this._connectionOptions.headers = headers;
        if (headers["Last-Event-ID"] != null) {
            _this._lastEventId = headers["Last-Event-ID"];
        }
        _this._connect();
        return _this;
    }
    Object.defineProperty(EventSource, "CONNECTING", {
        get: function () {
            return ReadyState.CONNECTING;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EventSource, "OPEN", {
        get: function () {
            return ReadyState.OPEN;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EventSource, "CLOSED", {
        get: function () {
            return ReadyState.CLOSED;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EventSource.prototype, "url", {
        get: function () {
            return this._url;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EventSource.prototype, "readyState", {
        get: function () {
            return this._readyState;
        },
        enumerable: true,
        configurable: true
    });
    EventSource.prototype._connect = function () {
        var _this = this;
        if (this._readyState === ReadyState.CONNECTING || this._readyState === ReadyState.OPEN) {
            console.log("Already connected, bye");
            return;
        }
        if (this._lastEventId != null) {
            this._connectionOptions.headers["Last-Event-ID"] = this._lastEventId;
        }
        this._req = this._transport(this._connectionOptions);
        this._readyState = ReadyState.CONNECTING;
        this.emit("connecting");
        this._req.on("response", this._handleResponse.bind(this));
        this._req.on("error", function (err) {
            _this.emit("error", err);
        });
        this._req.on("close", function () {
            _this.emit("error", { msg: "connection lost" });
            _this._req.removeAllListeners();
            _this._readyState = ReadyState.CLOSED;
            _this._reconnect();
        });
        this._req.end();
    };
    EventSource.prototype._reconnect = function () {
        var _this = this;
        var to = setTimeout(this._connect.bind(this), this._reconnectTimeout);
        var ind = this._timeouts.push(to);
        setTimeout(function () {
            clearTimeout(to);
            _this._timeouts.splice(ind, 1);
        }, this._reconnectTimeout + 100);
        return;
    };
    EventSource.prototype._handleResponse = function (res) {
        var _this = this;
        if (res.statusCode > 399) {
            this.emit("error", { status: res.statusCode });
            this._reconnect();
            return;
        }
        console.log("Connected");
        this._readyState = ReadyState.OPEN;
        /*
        res.on("close", () => {
            this.emit("error", { msg: "connection lost" })
            this._readyState = ReadyState.CLOSED
            this._reconnect()
        })
        */
        var parser = new event_stream_1.default();
        res.pipe(parser);
        parser.on("data", function (event) {
            if (event.reply) {
                _this._reconnectTimeout = event.reply;
            }
            if (event.lastEventId != null) {
                _this._lastEventId = event.lastEventId;
            }
            _this.emit(event.type, event);
        });
    };
    EventSource.prototype.close = function () {
        this._req.abort();
        this._req.removeAllListeners();
        this.removeAllListeners();
        this._readyState = ReadyState.CLOSED;
    };
    return EventSource;
}(events_1.EventEmitter));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EventSource;
//# sourceMappingURL=eventsource.js.map