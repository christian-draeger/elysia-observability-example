import "./observability";
import {Elysia} from "elysia";
import {observability} from "./observability";
import swagger from "@elysiajs/swagger";
import {appConfig} from "./appConfig";
import {controller} from "./controller";

const app = new Elysia()
    .use(observability)
    .use(swagger())
    .use(controller)
    .listen(appConfig.port);

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
