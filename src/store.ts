import {getMeter} from "./observability";

export const store: Map<string, string> = new Map();

const storeEntriesTotal = getMeter().createObservableGauge("store.entries.total");

storeEntriesTotal.addCallback((observableResult) => {
    observableResult.observe(store.size);
});