import * as https from 'https';
import { ClientRequest } from 'http';

async function doPostRequest(): Promise<void> {
    const requestData = {
        name: 'John Doe',
        username: 'john.doe',
        email: 'john.doe@opentelemetry.io',
        website: 'opentelemetry.io',
        company: {
            name: 'OpenTelemetry',
        },
    };

    const options = {
        host: 'jsonplaceholder.typicode.com',
        path: '/users',
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json; charset=UTF-8',
        },
    };

    return new Promise((resolve, reject): void => {
        const request: ClientRequest = https.request(options);
        request.on('finish', (): void => resolve());
        request.on('error', (err: Error): void => reject(err));
        request.write(JSON.stringify(requestData));
        request.end();
    });
}

doPostRequest();
