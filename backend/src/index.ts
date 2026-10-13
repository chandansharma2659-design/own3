import "dotenv/config";
import express from "express";
import cors from "cors";
import { clerkClient, clerkMiddleware, getAuth } from "@clerk/express";
import { clerkWebhookHandler } from "./webhook/clerk";
import { getEnv } from "./lib/env";
import { startHealthCheckCron } from "./lib/cron";
import { db } from "./db";
import { users } from "./db/schema";
import { parseRole } from "./lib/roles";

import fs from "node:fs";
import path from "node:path";


const env = getEnv(); 
const app = express();

app.post("/webhooks/clerk", express.raw({ type: "application/json" }), (req, res) => {
    clerkWebhookHandler(req, res);
});

app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());

app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});

app.get("/api/users/me", async (req, res) => {
    try {
        const { userId } = getAuth(req);
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const clerkUser = await clerkClient.users.getUser(userId);
        const email = clerkUser.emailAddresses.find(
            (address) => address.id === clerkUser.primaryEmailAddressId,
        )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

        if (!email) {
            return res.status(400).json({ error: "Clerk user has no email address" });
        }

        const displayName = [clerkUser.firstName, clerkUser.lastName]
            .filter(Boolean)
            .join(" ") || clerkUser.username || email;
        const role = parseRole(clerkUser.publicMetadata.role);

        const [user] = await db.insert(users).values({
            clerkUserId: clerkUser.id,
            email,
            displayName,
            role,
        }).onConflictDoUpdate({
            target: users.clerkUserId,
            set: { email, displayName, role, updatedAt: new Date() },
        }).returning({
            id: users.id,
            clerkUserId: users.clerkUserId,
            email: users.email,
            displayName: users.displayName,
            role: users.role,
        });

        return res.json({ user });
    } catch (error) {
        console.error("User sync error:", error);
        return res.status(500).json({ error: "Unable to sync user" });
    }
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