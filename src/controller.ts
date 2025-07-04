import {Elysia, status, t} from "elysia";
import {EventSchema, store} from "./store";

export const controller = new Elysia()
    .get('/', ({redirect}) => {
        return redirect('http://localhost:8282/dashboards');
    })
    .get("/health", () => ({
        status: "OK",
    }))
    .group("/store", (app) =>
        app
            .get("/", () => Object.fromEntries(store))
            .post(
                "/",
                ({body}) => {
                    store.set(body.key, body.value);
                    return status(201);
                },
                {
                    body: t.Object({
                        key: t.String(),
                        value: EventSchema,
                    }),
                }
            )
            .delete("/:key", ({params: {key}}) => {
                store.delete(key);
                return status(204);
            })
    )