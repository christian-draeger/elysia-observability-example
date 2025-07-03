import {name, version} from "../package.json";

export const appConfig = {
	version: version,
	name: name,
	port: process.env.PORT ?? 3000,
	observability: {
		enabled: true,
		exportIntervalMillis: 5_000,
		telegrafUrl: "http://localhost:4317",
	},
};
