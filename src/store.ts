import {getMeter} from "./observability";
import {t} from "elysia";

// just a dummy in-memory store observed to show-case custom metrics

const STATUSES = [
    "pending",
    "acked",
    "failed",
    "dead-letter",
] as const;

export const StatusSchema = t.Union(
    STATUSES.map((status) => t.Literal(status)),
);

export const EventSchema = t.Object({
    id: t.String({
        format: "uuid",
    }),
    retries: t.Number(),
    status: StatusSchema,
    fullyProcessedAt: t.Optional(t.Number()),
});

export type Status = typeof StatusSchema.static;
export type Event = typeof EventSchema.static;

class Store extends Map<string, Event> {
    findByStatus(status: Status): Event[] {
        return Array.from(this.values()).filter(
            (event) => event.status === status,
        );
    }

    findFullyProcessed(): string[] {
        const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
        return this.findByStatus("acked")
            .filter(({fullyProcessedAt}) => fullyProcessedAt && fullyProcessedAt < twoMinutesAgo)
            .map(event => event.id);
    }
}

export const store = new Store();

const storeEventsByStatus = getMeter().createObservableGauge(
    "store.events.by_status.total",
    {
        description: "Current number of events in the store, by status.",
    },
);

storeEventsByStatus.addCallback((observableResult) => {
    for (const status of STATUSES) {
        const count = store.findByStatus(status).length;
        observableResult.observe(count, { status });
    }
});

export const eventStatusChangeCounter = getMeter().createCounter(
    "store.events.status_change.total",
    {
        description: "Counts the total number of event status changes.",
    },
);

export const eventRetryCounter = getMeter().createCounter("store.events.retry.total", {
    description: "Counts the total number of retry attempts.",
});
