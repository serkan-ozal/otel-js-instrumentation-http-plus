import { ClientRequest, IncomingMessage, ServerResponse } from 'http';
import { Span } from '@opentelemetry/api';
import {
    HttpInstrumentation,
    HttpInstrumentationConfig,
    HttpRequestCustomAttributeFunction,
    HttpResponseCustomAttributeFunction,
} from '@opentelemetry/instrumentation-http';

const DEFAULT_MAX_REQUEST_BODY_SIZE: number = 4 * 1024; // 4 KB

export const HttpPlusSemanticAttributes = {
    HTTP_REQUEST_BODY: 'http.request.body',
};

export interface HttpPlusInstrumentationConfig
    extends HttpInstrumentationConfig {
    captureRequestBody?: boolean;
    maxRequestBodySize?: number;
}

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
                const originalWrite = request.write.bind(request);
                const originalEnd = request.end.bind(request);

                const maxRequestBodySize: number =
                    config?.maxRequestBodySize || DEFAULT_MAX_REQUEST_BODY_SIZE;

                if (config && config.captureRequestBody) {
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

                if (originalRequestHook) {
                    originalRequestHook(span, request);
                }
            }
        };
    }
    private _createResponseHook(
        originalResponseHook?: HttpResponseCustomAttributeFunction,
        config?: HttpPlusInstrumentationConfig
    ): HttpResponseCustomAttributeFunction {
        return (
            span: Span,
            response: IncomingMessage | ServerResponse
        ): void => {
            if (originalResponseHook) {
                originalResponseHook(span, response);
            }
        };
    }
}
