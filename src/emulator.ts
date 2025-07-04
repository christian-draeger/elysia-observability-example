import {store} from "./store";

const API_URL = "http://localhost:3000/store";

async function insertEvent() {
    const status = "pending";
    const id = Bun.randomUUIDv7();

    const requestBody = {
        key: id,
        value: {id, status, retries: 0},
    };

    return await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
    });
}

function createRampUpData(amount: number) {
    (async () => await Promise.all(Array.from({length: amount}, () => insertEvent())))();
}

function emulateProducer(frequencyInMillis: number) {
    setInterval(async () => insertEvent(), frequencyInMillis);
}

function emulateEventProcessing(frequencyInMillis: number) {
    setInterval(() => {
        const pendingEvents = store.findByStatus("pending");
        const eventToProcess =
            pendingEvents[Math.floor(Math.random() * pendingEvents.length)];

        const isSuccess = Math.random() < 0.6; // 60% success rate

        if (isSuccess) {
            store.set(eventToProcess.id, {
                ...eventToProcess,
                status: "acked",
                fullyProcessedAt: Date.now(),
            });
            console.info(
                `[WORKER] Event succeeded: ID ${eventToProcess.id} -> acked`,
            );
        } else {
            const newRetryCount = eventToProcess.retries + 1;

            if (newRetryCount >= 3) {
                store.set(eventToProcess.id, {
                    ...eventToProcess,
                    status: "dead-letter",
                    retries: newRetryCount,
                });
                console.warn(
                    `[WORKER] Event Error (retry-limit reached): ID ${eventToProcess.id} -> dead-letter`,
                );
            } else {
                store.set(eventToProcess.id, {
                    ...eventToProcess,
                    status: "pending",
                    retries: newRetryCount,
                });
                console.log(
                    `[WORKER] Event Error (try ${newRetryCount}/3): ID ${eventToProcess.id} -> back to queue`,
                );
            }
        }
    }, frequencyInMillis);
}

function cleanupJob(frequencyInMillis: number) {
    setInterval(() => {
        const fullyProcessedEventIds = store.findFullyProcessed()
        const amount = fullyProcessedEventIds.length
        if (amount === 0) return;

        for (const eventId of fullyProcessedEventIds) {
            store.delete(eventId);
        }

        if (amount > 0) {
            console.info(`[JANITOR] ${amount} completely processed Event(s) cleaned up.`);
        }
    }, frequencyInMillis);
}

export function emulateApplicationToBeInUse() {
    createRampUpData(100);
    emulateProducer(1_500);
    emulateEventProcessing(500)
    cleanupJob(30_000)
}