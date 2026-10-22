import "dotenv/config";
import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { clerkWebhookHandler } from "./webhook/clerk";
import { getEnv } from "./lib/env";
import { startHealthCheckCron } from "./lib/cron";


import fs from "node:fs";
import path from "node:path";

import producrRouter from "./routes/producrRouter"
import meRouter from "./routes/meRouter"
import streamRouter from "./routes/streamRouter"
import checkoutRouter from "./routes/checkoutRouter"
import { polarWebhookHandler } from "./webhook/polar";

const env = getEnv(); 
const app = express();


app.post("/webhooks/clerk", express.raw({ type: "application/json" }), (req, res) => {
    clerkWebhookHandler(req, res);
});

app.post("/webhooks/polar", (req,res) => {
    polarWebhookHandler(req, res)
});

app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());

app.use("/api/me", meRouter)
app.use("/api/products", producrRouter)
app.use("/api/stream", streamRouter)
app.use("/api/checkout", checkoutRouter);

app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
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



app.listen(env.PORT, () => {
    console.log("Server is running on port:", env.PORT);
    startHealthCheckCron(env.PORT);
})