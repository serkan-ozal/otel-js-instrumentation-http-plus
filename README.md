# OpenTelemetry HTTP Instrumentation Plus (Javascript/Node.js)

![Build Status](https://github.com/serkan-ozal/otel-js-instrumentation-http-plus/actions/workflows/build.yml/badge.svg)
![NPM Version](https://badge.fury.io/js/otel-instrumentation-http-plus.svg)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

NPM package which provides advanced automatic instrumentation for 
Node.js [`http`](https://nodejs.org/api/http.html) and [`https`](https://nodejs.org/api/https.html) modules
on top of **OpenTelemetry** `@opentelemetry/instrumentation-http` instrumentation module.


## Installation

To install the package, you can use NPM (or Yarn):

```bash
npm install --save otel-instrumentation-http-plus
```

**Note:** Requires `@opentelemetry/api` version `1.0.0`+ and `@opentelemetry/instrumentation-http` version `0.30.0`+ installed.


## Usage

You need to import/require `HttpPlusInstrumentation` first 
and then register `HttpPlusInstrumentation` instance through `registerInstrumentations` method
provided by the instrumentation API (`'@opentelemetry/instrumentation'`) as shown below:

```js
const { HttpPlusInstrumentation } = require('otel-instrumentation-http-plus');
const {
  ConsoleSpanExporter,
  NodeTracerProvider,
  SimpleSpanProcessor,
} = require('@opentelemetry/sdk-trace-node');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');

const provider = new NodeTracerProvider();

provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
provider.register();

registerInstrumentations({
  instrumentations: [new HttpPlusInstrumentation({
      // Put options here. See "Configuration" section below for more details
  })],
});
```


### Configuration

**In addition** to base OpenTelemetry HTTP instrumentation options [here](https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-instrumentation-http/README.md#http-instrumentation-options),
**OpenTelemetry HTTP Instrumentation Plus** also provides the following options to configure:
| Options                  | Type      | Default Value   | Description                                                   |
|--------------------------|-----------|-----------------|---------------------------------------------------------------|
| `captureRequestBody`     | `boolean` | `false`         | Enables capturing HTTP request body                           |
| `maxRequestBodySize`     | `number`  | `4096` (`4 KB`) | Sets maximum size limit for HTTP request body to be captured  |
| `captureResponseBody`    | `boolean` | `false`         | Enables capturing HTTP response body                          |
| `maxResponseBodySize`    | `number`  | `4096` (`4 KB`) | Sets maximum size limit for HTTP response body to be captured |
| `maxResponseBodySize`    | `number`  | `4096` (`4 KB`) | Sets maximum size limit for HTTP response body to be captured |
| `traceNetworkOperations` | `boolean` | `false`         | Enables tracing network timings by creating spans for the following traced network operations <br/> - **DNS Lookup** <br/> - **TCP Connect** <br/> - **TLS Handshake** <br/> - **TTFB (Time To First Byte)** <br/> - **Content Transfer** |

## Examples

You can find examples under `examples` directory.
To be able to run the example, you can run the following command:
```bash
npm run example
```


## Roadmap

- Support custom masking for captured HTTP request and/or response bodies


## Issues and Feedback

[![Issues](https://img.shields.io/github/issues/serkan-ozal/otel-js-instrumentation-http-plus.svg)](https://github.com/serkan-ozal/otel-js-instrumentation-http-plus/issues?q=is%3Aopen+is%3Aissue)
[![Closed issues](https://img.shields.io/github/issues-closed/serkan-ozal/otel-js-instrumentation-http-plus.svg)](https://github.com/serkan-ozal/otel-js-instrumentation-http-plus/issues?q=is%3Aissue+is%3Aclosed)

Please use [GitHub Issues](https://github.com/serkan-ozal/otel-js-instrumentation-http-plus/issues) for any bug report, feature request and support.


## Contribution

[![Pull requests](https://img.shields.io/github/issues-pr/serkan-ozal/otel-js-instrumentation-http-plus.svg)](https://github.com/serkan-ozal/otel-js-instrumentation-http-plus/pulls?q=is%3Aopen+is%3Apr)
[![Closed pull requests](https://img.shields.io/github/issues-pr-closed/serkan-ozal/otel-js-instrumentation-http-plus.svg)](https://github.com/serkan-ozal/otel-js-instrumentation-http-plus/pulls?q=is%3Apr+is%3Aclosed)
[![Contributors](https://img.shields.io/github/contributors/serkan-ozal/otel-js-instrumentation-http-plus.svg)]()

If you would like to contribute, please
- Fork the repository on GitHub and clone your fork.
- Create a branch for your changes and make your changes on it.
- Send a pull request by explaining clearly what is your contribution.

> Tip:
> Please check the existing pull requests for similar contributions and
> consider submit an issue to discuss the proposed feature before writing code.


## License

Licensed under [MIT License](LICENSE).
