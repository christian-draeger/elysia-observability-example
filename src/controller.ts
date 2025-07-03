import {sleep} from "bun";
import {status, t, Elysia} from "elysia";
import {store} from "./store";

export const controller = new Elysia().get("/", () => {
    return "GET /";
})
    .get("/health", () => ({
        status: "OK",
    }))
    .get("/delay", () => {
        sleep(1000);
        return "GET /delay";
    })
    .get("/error/:code", ({ params }) => {
        return status(Number.parseInt(params.code));
    })

    .group("/store", (app) =>
        app
            .get("/", () => Object.fromEntries(store))
            .post(
                "/",
                ({ body }) => {
                    store.set(body.key, body.value);
                    return status(201);
                },
                {
                    body: t.Object({
                        key: t.String(),
                        value: t.String(),
                    }),
                }
            )
            .delete("/:key", ({ params: { key } }) => {
                store.delete(key);
                return status(204);
            })
    )