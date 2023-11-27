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

process.on('beforeExit', async (code: number): Promise<void> => {
    console.log('Shutting down OTEL SDK ...');
    await sdk.shutdown();
});
