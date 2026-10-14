
import type { Request as ExpressRequest, Response } from "express";
import { verifyWebhook } from "@clerk/backend/webhooks";
// Local fallback for parseRole to avoid missing-module errors.
function parseRole(input: any): string | null {
    if (!input) return null;
    // if metadata already provides role as string
    if (typeof input === "string") return input;
    // if metadata is an object with role property   
    if (typeof input === "object" && typeof input.role === "string") return input.role;
    return null;
}
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";


export async function clerkWebhookHandler(req: ExpressRequest, res: Response) {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    
    try{
        if (!webhookSecret){
            res.status(503).send("webhook secret key is not provided");
            return;
        }

        const playload = req.body instanceof Buffer ? req.body.toString("utf8") : String(req.body)

        const request = new Request("http://internal/webhooks/clerk", {
            method: "POST",
            headers: new Headers(req.headers as HeadersInit),
            body: playload,
        }); 
         
        const evt = await verifyWebhook(request, { signingSecret: webhookSecret });

            if(evt.type === "user.created" || evt.type === "user.updated") {
                const u = evt.data;

                const email = 
                u.email_addresses?.find((e) => e.id == u.primary_email_address_id)?. email_address ??
                u.email_addresses?.[0] ?.email_address;

                const displayName = 
                [u.first_name, u.last_name] . filter(Boolean). join(" ") || u.username || "";

                const role = parseRole(u.public_metadata?.role);

                // Cast to any to satisfy Drizzle typings for dynamic webhook data
                await db.insert(users).values({
                        clerkUserId: u.id,
                        name: displayName || email || "",
                        email: email || "",
                        displayName,
                        role: role || undefined
                    } as any).onConflictDoUpdate({
                        target: users.clerkUserId,
                        set: {
                            name: displayName || email || "",
                            email: email || "",
                            displayName,
                            role: role || undefined,
                            updatedAt: new Date()
                        } as any,
                    });
            }

            if(evt.type === "user.deleted") {
                const id = evt.data.id;
                if(id) {
                    await db.delete(users).where(eq(users.clerkUserId, id));
                }
            }

            res.json({ok:true});
            

    } catch (error) {
        console.error("clerk webhook error:", error);
        res.status(500).json({ ok: false });
    }
}