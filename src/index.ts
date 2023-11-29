import { ClientRequest, IncomingMessage, ServerResponse } from 'http';
import {
    context,
    trace,
    Span,
    SpanKind,
    Tracer,
    Attributes,
} from '@opentelemetry/api';
import {
    HttpInstrumentation,
    HttpInstrumentationConfig,
    HttpRequestCustomAttributeFunction,
    HttpResponseCustomAttributeFunction,
} from '@opentelemetry/instrumentation-http';
import { Socket } from 'net';
import { ReadableSpan } from '@opentelemetry/sdk-trace-node';
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';

const { name, version } = require('../package.json');
const tracer: Tracer = trace.getTracer(name, version);

const DEFAULT_MAX_REQUEST_BODY_SIZE: number = 4 * 1024; // 4 KB
const DEFAULT_MAX_RESPONSE_BODY_SIZE: number = 4 * 1024; // 4 KB
const NETWORK_TIMINGS_PROP_NAME: string = '__networkTimings';

export const HttpPlusSemanticAttributes = {
    HTTP_REQUEST_BODY: 'http.request.body',
    HTTP_RESPONSE_BODY: 'http.response.body',
    NETWORK_DNS_LOOKUP_DURATION: 'net.dns.lookup.duration',
    NETWORK_TCP_CONNECT_DURATION: 'net.tcp.connect.duration',
    NETWORK_TLS_HANDSHAKE_DURATION: 'net.tls.handshake.duration',
    NETWORK_TTFB_DURATION: 'net.ttfb.duration',
    NETWORK_CONTENT_TRANSFER_DURATION: 'net.content.transfer.duration',
};

export interface HttpPlusInstrumentationConfig
    extends HttpInstrumentationConfig {
    captureRequestBody?: boolean;
    maxRequestBodySize?: number;
    captureResponseBody?: boolean;
    maxResponseBodySize?: number;
    traceNetworkOperations?: boolean;
}

type NetworkTimings = {
    startAt?: number;
    dnsLookupAt?: number;
    tcpConnectionAt?: number;
    tlsHandshakeAt?: number;
    firstByteAt?: number;
    endAt?: number;
};

export class HttpPlusInstrumentation extends HttpInstrumentation {
    constructor(config?: HttpPlusInstrumentationConfig) {
        super(config);
        this._config = this._createConfig(config);
    }

    private _createConfig(
        config?: HttpPlusInstrumentationConfig
    ): HttpPlusInstrumentationConfig {
        return {
            ...config,
            requestHook: this._createRequestHook(config?.requestHook, config),
            responseHook: this._createResponseHook(
                config?.responseHook,
                config
            ),
        };
    }

    private _createRequestHook(
        originalRequestHook?: HttpRequestCustomAttributeFunction,
        config?: HttpPlusInstrumentationConfig
    ): HttpRequestCustomAttributeFunction {
        return (span: Span, request: ClientRequest | IncomingMessage): void => {
            const instrumentation = this;

            if (request instanceof ClientRequest) {
                const networkTimings: NetworkTimings = {};
                Object.defineProperty(span, NETWORK_TIMINGS_PROP_NAME, {
                    enumerable: false,
                    configurable: true,
                    writable: false,
                    value: networkTimings,
                });
                networkTimings.startAt = Date.now();

                const originalWrite = request.write.bind(request);
                const originalEnd = request.end.bind(request);

                if (config?.captureRequestBody) {
                    const maxRequestBodySize: number =
                        config?.maxRequestBodySize ||
                        DEFAULT_MAX_REQUEST_BODY_SIZE;

                    request.write = (data: any): boolean => {
                        if (
                            typeof data === 'string' ||
                            data instanceof Buffer
                        ) {
                            const requestData: string | Buffer = data;
                            if (
                                requestData.length &&
                                requestData.length <= maxRequestBodySize
                            ) {
                                try {
                                    const requestBody: string =
                                        requestData.toString('utf-8');
                                    span.setAttribute(
                                        HttpPlusSemanticAttributes.HTTP_REQUEST_BODY,
                                        requestBody
                                    );
                                } catch (e) {
                                    instrumentation._diag.error(
                                        'Error occurred while capturing request body:',
                                        e
                                    );
                                }
                            }
                        }
                        return originalWrite(data);
                    };
                    request.end = (data: any): ClientRequest => {
                        if (
                            typeof data === 'string' ||
                            data instanceof Buffer
                        ) {
                            const requestData: string | Buffer = data;
                            if (
                                requestData.length &&
                                requestData.length <= maxRequestBodySize
                            ) {
                                try {
                                    const requestBody: string =
                                        requestData.toString('utf-8');
                                    span.setAttribute(
                                        HttpPlusSemanticAttributes.HTTP_REQUEST_BODY,
                                        requestBody
                                    );
                                } catch (e) {
                                    instrumentation._diag.error(
                                        'Error occurred while capturing request body:',
                                        e
                                    );
                                }
                            }
                        }
                        return originalEnd(data);
                    };
                }

                request.on('socket', (socket: Socket) => {
                    socket.on('lookup', (): void => {
                        networkTimings.dnsLookupAt = Date.now();
                    });
                    socket.on('connect', (): void => {
                        networkTimings.tcpConnectionAt = Date.now();
                    });
                    socket.on('secureConnect', (): void => {
                        networkTimings.tlsHandshakeAt = Date.now();
                    });
                    socket.on('close', (): void => {});
                });
            }

            if (originalRequestHook) {
                originalRequestHook(span, request);
            }
        };
    }

    private _processNetworkTimings(
        span: Span,
        networkTimings: NetworkTimings,
        config?: HttpPlusInstrumentationConfig
    ): void {
        const currentSpanAttributes: Attributes = (span as any as ReadableSpan)
            .attributes;
        const networkAttributes: Attributes = {};
        if (config?.traceNetworkOperations) {
            if (currentSpanAttributes[SemanticAttributes.NET_PEER_NAME]) {
                networkAttributes[SemanticAttributes.NET_PEER_NAME] =
                    currentSpanAttributes[SemanticAttributes.NET_PEER_NAME];
            }
            if (currentSpanAttributes[SemanticAttributes.NET_PEER_IP]) {
                networkAttributes[SemanticAttributes.NET_PEER_IP] =
                    currentSpanAttributes[SemanticAttributes.NET_PEER_IP];
            }
            if (currentSpanAttributes[SemanticAttributes.NET_PEER_PORT]) {
                networkAttributes[SemanticAttributes.NET_PEER_PORT] =
                    currentSpanAttributes[SemanticAttributes.NET_PEER_PORT];
            }
        }

        if (networkTimings.startAt && networkTimings.dnsLookupAt) {
            span.setAttribute(
                HttpPlusSemanticAttributes.NETWORK_DNS_LOOKUP_DURATION,
                networkTimings.dnsLookupAt - networkTimings.startAt
            );
            if (config?.traceNetworkOperations) {
                const dnsSpan: Span = tracer.startSpan(
                    'DNS Lookup',
                    {
                        startTime: networkTimings.startAt,
                        kind: SpanKind.CLIENT,
                    },
                    context.active()
                );
                dnsSpan.setAttributes(networkAttributes);
                dnsSpan.end(networkTimings.dnsLookupAt);
            }
        }
        if (networkTimings.dnsLookupAt && networkTimings.tcpConnectionAt) {
            span.setAttribute(
                HttpPlusSemanticAttributes.NETWORK_TCP_CONNECT_DURATION,
                networkTimings.tcpConnectionAt - networkTimings.dnsLookupAt
            );
            if (config?.traceNetworkOperations) {
                const tcpConnectSpan: Span = tracer.startSpan(
                    'TCP Connect',
                    {
                        startTime: networkTimings.dnsLookupAt,
                        kind: SpanKind.CLIENT,
                    },
                    context.active()
                );
                tcpConnectSpan.setAttributes(networkAttributes);
                tcpConnectSpan.end(networkTimings.tcpConnectionAt);
            }
        }
        if (networkTimings.tcpConnectionAt && networkTimings.tlsHandshakeAt) {
            span.setAttribute(
                HttpPlusSemanticAttributes.NETWORK_TLS_HANDSHAKE_DURATION,
                networkTimings.tlsHandshakeAt - networkTimings.tcpConnectionAt
            );
            if (config?.traceNetworkOperations) {
                const tlsHandshakeSpan: Span = tracer.startSpan(
                    'TLS Handshake',
                    {
                        startTime: networkTimings.tcpConnectionAt,
                        kind: SpanKind.CLIENT,
                    },
                    context.active()
                );
                tlsHandshakeSpan.setAttributes(networkAttributes);
                tlsHandshakeSpan.end(networkTimings.tlsHandshakeAt);
            }
        }
        const startTTFB: number | undefined =
            networkTimings.tlsHandshakeAt || networkTimings.tcpConnectionAt;
        if (networkTimings.firstByteAt && startTTFB) {
            span.setAttribute(
                HttpPlusSemanticAttributes.NETWORK_TTFB_DURATION,
                networkTimings.firstByteAt - startTTFB
            );
        }
        if (networkTimings.firstByteAt && networkTimings.endAt) {
            span.setAttribute(
                HttpPlusSemanticAttributes.NETWORK_CONTENT_TRANSFER_DURATION,
                networkTimings.endAt - networkTimings.firstByteAt
            );
            if (config?.traceNetworkOperations) {
                const contentTransferSpan: Span = tracer.startSpan(
                    'Content Transfer',
                    {
                        startTime: networkTimings.firstByteAt,
                        kind: SpanKind.CLIENT,
                    },
                    context.active()
                );
                contentTransferSpan.setAttributes(networkAttributes);
                contentTransferSpan.end(networkTimings.endAt);
            }
        }
    }

    private _createResponseHook(
        originalResponseHook?: HttpResponseCustomAttributeFunction,
        config?: HttpPlusInstrumentationConfig
    ): HttpResponseCustomAttributeFunction {
        return (
            span: Span,
            response: IncomingMessage | ServerResponse
        ): void => {
            const instrumentation = this;

            if (response instanceof IncomingMessage) {
                const networkTimings: NetworkTimings = (span as any)[
                    NETWORK_TIMINGS_PROP_NAME
                ];

                const maxResponseBodySize: number =
                    config?.maxResponseBodySize ||
                    DEFAULT_MAX_RESPONSE_BODY_SIZE;

                let chunks: Buffer[] | null = [];
                let totalSize: number = 0;

                response.prependListener('data', (chunk: any): void => {
                    if (config?.captureResponseBody) {
                        if (!chunk) {
                            return;
                        }
                        if (
                            typeof chunk === 'string' ||
                            chunk instanceof Buffer
                        ) {
                            totalSize += chunk.length;
                            if (chunks && totalSize <= maxResponseBodySize) {
                                chunks.push(
                                    typeof chunk === 'string'
                                        ? Buffer.from(chunk)
                                        : chunk
                                );
                            } else {
                                // No need to capture partial response body
                                chunks = null;
                            }
                        }
                    }
                });

                response.prependOnceListener('end', (): void => {
                    if (networkTimings) {
                        networkTimings.endAt = Date.now();

                        instrumentation._processNetworkTimings(
                            span,
                            networkTimings,
                            config
                        );
                    }

                    try {
                        if (chunks && chunks.length) {
                            const concatedChunks: Buffer =
                                Buffer.concat(chunks);
                            const responseBody: string =
                                concatedChunks.toString('utf8');
                            span.setAttribute(
                                HttpPlusSemanticAttributes.HTTP_RESPONSE_BODY,
                                responseBody
                            );
                        }
                    } catch (e) {
                        instrumentation._diag.error(
                            'Error occurred while capturing response body:',
                            e
                        );
                    }
                });

                if (networkTimings) {
                    response.once('readable', (): void => {
                        networkTimings.firstByteAt = Date.now();
                    });
                }
            }

            if (originalResponseHook) {
                originalResponseHook(span, response);
            }
        };
    }
}
