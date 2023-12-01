import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import {
    Instrumentation,
    registerInstrumentations,
} from '@opentelemetry/instrumentation';

import {
    HttpPlusInstrumentationConfig,
    HttpPlusInstrumentation,
} from '../src/index';
import { Span } from '@opentelemetry/api';
import { ClientRequest, IncomingMessage, ServerResponse } from 'http';

const sdk: NodeSDK = new NodeSDK({
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'my-service',
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0',
    }),
    traceExporter: new ConsoleSpanExporter(),
});
const instrumentations: Instrumentation[] = [
    new HttpPlusInstrumentation({
        captureRequestBody: true, // Enable capturing request body
        maxRequestBodySize: 16 * 1024, // Set max size for the request body to be capture to 16 KB
        captureResponseBody: true, // Enable capturing response body
        maxResponseBodySize: 16 * 1024, // Set max size for the response body to be capture to 16 KB
        traceNetworkOperations: true, // Enable tracing network timings by creating spans for traced network operations
        requestBodyMaskHook: (
            // Mask request body with your custom logic
            request: ClientRequest,
            requestBody: string
        ): any => {
            const requestBodyObj: any = JSON.parse(requestBody);
            delete requestBodyObj.email; // Mask email
            return requestBodyObj;
        },
        responseBodyMaskHook: (
            // Mask response body with your custom logic
            response: IncomingMessage,
            responseBody: string
        ): any => {
            const responseBodyObj: any = JSON.parse(responseBody);
            delete responseBodyObj.email; // Mask email
            return responseBodyObj;
        },
        requestHook: (
            span: Span,
            request: ClientRequest | IncomingMessage
        ): void => {
            // Put your custom request hook logic here if needed
        },
        responseHook: (
            span: Span,
            response: IncomingMessage | ServerResponse
        ): void => {
            // Put your custom response hook logic here if needed
        },
    } as HttpPlusInstrumentationConfig),
];
registerInstrumentations({
    instrumentations,
});

console.log('Starting OTEL SDK ...');
sdk.start();

process.once('beforeExit', async (code: number): Promise<void> => {
    console.log('Shutting down OTEL SDK ...');
    await sdk.shutdown();
});
