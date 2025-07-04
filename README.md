# Elysia Observability Example
This project showcases an observability stack.

```mermaid
flowchart LR
    subgraph app [Elysia App];
    otel(Opentelemetry Exporter);
    end;
    subgraph collector [Collector];
    telegraf[Telegraf];
    end
    subgraph tsdb [Time-Series Database];
    db1[(Influx-v1)];
    db2[(Influx-v2)];
    end
    subgraph ui [Visualization];
    grafana[Grafana];
    end
    otel --> telegraf;
    telegraf --> db1;
    telegraf --> db2;
    db1 --> grafana;
    db2 --> grafana;
```

## Development
To start the development server run:
```bash
docker compose up -d
bun run dev
```

## How to use
Elysia app: http://localhost:3000/swagger
Grafana: http://localhost:8282/dashboards

## Screenshots
![dashboard-top.png](docs/dashboard-top.png)

![dashboard-bottom.png](docs/dashboard-bottom.png)
