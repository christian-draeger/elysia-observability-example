import {MeterProvider, PeriodicExportingMetricReader} from "@opentelemetry/sdk-metrics";
import {OTLPMetricExporter} from "@opentelemetry/exporter-metrics-otlp-grpc";
import {BatchSpanProcessor} from "@opentelemetry/sdk-trace-node";
import {OTLPTraceExporter} from "@opentelemetry/exporter-trace-otlp-grpc";
import {diag, DiagConsoleLogger, DiagLogLevel, metrics} from "@opentelemetry/api";
import {HostMetrics} from "@opentelemetry/host-metrics";
import {Elysia} from "elysia";
import {envDetector, processDetector} from "@opentelemetry/resources";
import {opentelemetry} from "@elysiajs/opentelemetry";
import {appConfig} from "./appConfig";

const appName = appConfig.name;

function setupOpentelemetry() {
	const { enabled, exportIntervalMillis, telegrafUrl } = appConfig.observability;

	const observabilityPlugin = new Elysia({ name: "elysia-observability" }).as("global");

	if (!enabled) {
		console.info("ℹ️ Observability is disabled.");
		return observabilityPlugin;
	}

	console.info("✅ Observability is enabled. Initializing OpenTelemetry...");
	diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);

	const metricExporter = new OTLPMetricExporter({
		url: telegrafUrl,
		// url: `${telegrafUrl}/v1/metrics`,
	});

	const metricReader = new PeriodicExportingMetricReader({
		exporter: metricExporter,
		exportIntervalMillis,
	});

	const meterProvider = new MeterProvider({
		readers: [metricReader],
	});
	metrics.setGlobalMeterProvider(meterProvider);

	const hostMetrics = new HostMetrics({ meterProvider });
	hostMetrics.start();

	const traceExporter = new OTLPTraceExporter({
		url: telegrafUrl,
	});
	const spanProcessor = new BatchSpanProcessor(traceExporter, {
		// The maximum queue size. After the size is reached spans are dropped.
		// maxQueueSize: 100,
		// The maximum batch size of every export. It must be smaller or equal to maxQueueSize.
		// maxExportBatchSize: 10,
		// The interval between two consecutive exports
		// scheduledDelayMillis: 500,
		// How long the export can run before it is cancelled
		// exportTimeoutMillis: 30000,
	});

	createHeartBeatMetric();

	return observabilityPlugin.use(opentelemetry({
		serviceName: appName,
		spanProcessors: [spanProcessor],
		resourceDetectors: [envDetector, processDetector],
	}));
}

export const observability = setupOpentelemetry();

export function getMeter() {
	return metrics.getMeter(`${appName}-meter`);
}

function createHeartBeatMetric(name = "app.heartbeat") {
	const meter = getMeter();
	const heartbeat = meter.createObservableGauge(name, {
		description: "Shows App liveness (1 for Up).",
	});
	heartbeat.addCallback((observableResult) => {
		observableResult.observe(1);
	});
}
