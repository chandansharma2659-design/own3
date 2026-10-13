import type { Request, Response } from "express";
import { getEnv } from "../lib/env";
import { verifyWebhook} from "@clerk/backend/webhooks";
import { parseRole } from "../lib/roles";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export async function clerkWebhookHandler(req: Request, res: Response) {
    const env = getEnv();
    try {
        if(!env.CLERK_WEBHOOK_SECRET) {
            return res.status(500).send("CLERK_WEBHOOK_SECRET is not set");
        }

        const payload = req.body instanceof Buffer ? req.body.toString("utf8") : String(req.body);
        const request = new Request("https://internal/webhooks/clerk", {
            method: "POST",
            headers: new Headers(req.headers as HeadersInit),
            body: payload
        });

        const evt = await verifyWebhook(request, { signingSecret: env.CLERK_WEBHOOK_SECRET });
         
        if(evt.type === "user.created" || evt.type === "user.updated"){
            const u = evt.data;

            const email = u.email_addresses.find((e: any) => e.id === u.primary_email_address_id)?.email_address ??
            u.email_addresses[0]?.email_address;

            if (!email) {
                return res.status(400).send("Clerk user has no email address");
            }

            const displayName = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || email;
            
            const role = parseRole(u.public_metadata?.role);

           await db.insert(users).values({
                clerkUserId: u.id,
                email,
                displayName,
                role,
           })
           .onConflictDoUpdate({
            target: users.clerkUserId,
            set: {email: email ?? undefined, displayName, role, updatedAt: new Date()},
            
           });

            
        }

          if(evt.type === "user.deleted") {
            const id = evt.data.id;
            if(id) {
                await db.delete(users).where(eq(users.clerkUserId, id))
              
            }
        } 
         res.json({ok: true});
    } catch (err) {
        console.error("Clerk webhook error:",err);
        res.status(400).json({error: "Webhook error"});
    }
}
