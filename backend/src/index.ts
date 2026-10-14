import "dotenv/config";
import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { clerkWebhookHandler } from "./webhook/clerk";
import { getEnv } from "./lib/env";
import { startHealthCheckCron } from "./lib/cron";


import fs from "node:fs";
import path from "node:path";

import producrRouter from "./routes/producrRouter";
import meRouter from "./routes/meRouter"

const env = getEnv(); 
const app = express();


app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());

app.use("/api/me", meRouter)
app.use("/api/products", producrRouter)

app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});



app.post("/webhooks/clerk", express.raw({ type: "application/json" }), (req, res) => {
    clerkWebhookHandler(req, res);
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