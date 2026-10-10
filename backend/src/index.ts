import "dotenv/config";
import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { clerkWebhookHandler } from "./webhook/clerk";
import { getEnv } from "./lib/env";



const env = getEnv(); 
const app = express();

app.post("/webhook/clerk", express.raw({ type: "application/json" }), (req, res) => {
    clerkWebhookHandler(req, res);
});

app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());



app.listen(env.PORT, () => {
    console.log("Server is running on port:", env.PORT);
})