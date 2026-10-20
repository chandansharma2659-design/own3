import { clerkClient, getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

import { getEnv } from "../lib/env";
import {
    getStreamChatServer,
    streamChatDisplayName,
    streamUserId,
} from "../lib/stream";
import { getLocalUser } from "../lib/users";

export async function createStreamToken(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const env = getEnv()
        const { userId, isAuthenticated } = getAuth(req);
        if (!isAuthenticated || !userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

       const localUser = await getLocalUser(userId);
       if(!localUser){
        res.status(501).json({error:"account not synced yet"});
        return;
       }

       const server = getStreamChatServer(env);
       
       const clerkUser = await clerkClient.users.getUser(userId);

       const combined = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;

       const name = streamChatDisplayName(
        localUser.role,
        localUser.displayName ?? combined ?? clerkUser.username,
        localUser.email,
       );

       const image = clerkUser.imageUrl || undefined;
       const sid = streamUserId(userId);

       await server.upsertUser({id: sid, name, image});

       const token = server .createToken(sid);

       res.json({ token, apiKey: env.STREAM_API_KEY, userId:sid});
    } catch (e) {
         next(e);
    }
}