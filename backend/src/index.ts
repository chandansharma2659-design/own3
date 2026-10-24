import "dotenv/config";
import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { clerkWebhookHandler } from "./webhook/clerk";
import { getEnv } from "./lib/env";
import { startHealthCheckCron } from "./lib/cron";


import fs from "node:fs";
import path from "node:path";

import * as Sentry from "@sentry/node"

import producrRouter from "./routes/producrRouter"
import meRouter from "./routes/meRouter"
import streamRouter from "./routes/streamRouter"
import checkoutRouter from "./routes/checkoutRouter"
import adminRouter from "./routes/adminRouter"
import orderRouter from "./routes/orderRouter"

import { polarWebhookHandler } from "./webhook/polar";
import { sentryClerkMiddleware } from "./middleware/sentryClerkUser";

const env = getEnv(); 
const app = express();


app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());
app.use(sentryClerkMiddleware);

app.use("/api/me", meRouter)
app.use("/api/products", producrRouter)
app.use("/api/stream", streamRouter)
app.use("/api/checkout", checkoutRouter);
app.use("/api/admin",adminRouter);
app.use("/api/order",orderRouter);

app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});

app.post("/webhooks/clerk", express.raw({ type: "application/json" }), (req, res) => {
    clerkWebhookHandler(req, res);
});

app.post("/webhooks/polar", (req,res) => {
    polarWebhookHandler(req, res)
});


const publicDir =  path.join(process.cwd(), "public")
if(fs.existsSync(publicDir)){
    app.use(express.static(publicDir))

    app.get("/{*path}", (req,res,next) => {
        if(req.method !== "GET" && req.method !== "HEAD") {
            next();
            return;
        }

        if(req.path.startsWith("/api") || req.path.startsWith("/webhooks")) {
            next();
            return;
        }

        res.sendFile(path.join(publicDir, "index.html"), (err) => next(err))
    })
}

Sentry.setupExpressErrorHandler(app);

app.use((_err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const sentryId = (res as express.Response & {sentry?:String }).sentry;

    res.status(500).json({
        error: "internal server error",
        ...(sentryId !== undefined && {sentryId}),
    });
});

app.listen(env.PORT, () => {
    console.log("Server is running on port:", env.PORT);
    startHealthCheckCron(env.PORT);
})