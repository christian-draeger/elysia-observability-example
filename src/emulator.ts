import {eventRetryCounter, eventStatusChangeCounter, store} from "./store";

async function randomApiUsage() {
    const API_URL = "http://localhost:3000/store";
    const actions = ["get_health", "get_all", "post_event", "delete_event"];
    const randomAction = actions[Math.floor(Math.random() * actions.length)];

    try {
        switch (randomAction) {
            case "get_health":
                console.log("[RANDOM_API] Calling GET /health");
                await fetch("http://localhost:3000/health");
                break;

            case "get_all":
                console.log("[RANDOM_API] Calling GET /store");
                await fetch(API_URL);
                break;

            case "post_event":
                console.log("[RANDOM_API] Calling POST /store via insertEvent");
                const status = "pending";
                const id = Bun.randomUUIDv7();

                const requestBody = {
                    key: id,
                    value: {id, status, retries: 0},
                };

                await fetch(API_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestBody),
                });
                break;

            case "delete_event":
                const keys = store.findFullyProcessed();
                if (keys.length > 0) {
                    const keyToDelete = keys[Math.floor(Math.random() * keys.length)];
                    console.log(`[RANDOM_API] Calling DELETE /store/${keyToDelete}`);
                    await fetch(`${API_URL}/${keyToDelete}`, { method: "DELETE" });
                } else {
                    console.log("[RANDOM_API] Skipped DELETE, store is empty.");
                }
                break;
        }
    } catch (error) {
        console.error(`[RANDOM_API] Error during ${randomAction}:`, error);
    }
}

function emulateRandomApiUsage(frequencyInMillis: number) {
    setInterval(randomApiUsage, frequencyInMillis);
}

async function createEvent() {
    const status = "pending";
    const id = Bun.randomUUIDv7();
    store.set(id, {id, status, retries: 0});
}

function createRampUpData(amount: number) {
    (async () => await Promise.all(Array.from({length: amount}, () => createEvent())))();
}

function emulateProducer(frequencyInMillis: number) {
    setInterval(async () => createEvent(), frequencyInMillis);
}

function emulateEventProcessing(frequencyInMillis: number) {
    setInterval(() => {
        const pendingEvents = store.findByStatus("pending");
        const failedEvents = store.findByStatus("failed");
        const eventsToProcess = [...pendingEvents, ...failedEvents];

        if (eventsToProcess.length === 0) return;

        const event =
            eventsToProcess[Math.floor(Math.random() * eventsToProcess.length)];

        const isSuccess = Math.random() < 0.6; // 60% success rate

        if (isSuccess) {
            store.set(event.id, {
                ...event,
                status: "acked",
                fullyProcessedAt: Date.now(),
            });
            eventStatusChangeCounter.add(1, { status: "acked" });
            console.info(
                `[WORKER] Event succeeded: ID ${event.id} -> acked`,
            );
        } else {
            const newRetryCount = event.retries + 1;

            if (newRetryCount >= 3) {
                store.set(event.id, {
                    ...event,
                    status: "dead-letter",
                    retries: newRetryCount,
                });

                eventStatusChangeCounter.add(1, { status: "dead-letter" });

                console.warn(
                    `[WORKER] Event Error (retry-limit reached): ID ${event.id} -> dead-letter`,
                );
            } else {
                store.set(event.id, {
                    ...event,
                    status: "failed",
                    retries: newRetryCount,
                });

                eventStatusChangeCounter.add(1, { status: "failed" });

                console.log(
                    `[WORKER] Event Error (try ${newRetryCount}/3): ID ${event.id} -> back to queue`,
                );
            }
            eventRetryCounter.add(1);
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
    emulateRandomApiUsage(2_000)
}
