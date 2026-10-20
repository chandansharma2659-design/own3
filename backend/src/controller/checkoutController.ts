import {Request,Response, NextFunction } from "express";
import { getEnv } from "../lib/env";
import {z} from "zod"
import { getAuth } from "@clerk/express";
import { getLocalUser } from "../lib/users";
import {  checkoutSessions, checkoutSessionsLine, products } from "../db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { polarCreateCheckout } from "../lib/polar";



const env = getEnv()

const cartSchema = z.object({
    items: z
    .array (
        z.object({
            productId: z.string(). uuid(),
            quantity: z.number(). int().positive(),
        }),
    ) 
    .min(1)
})

export async function createCheckout(req:Request, res:Response, next: NextFunction) {
    try {
        const {userId, isAuthenticated} = getAuth(req)
        if(!isAuthenticated || !userId){
            res.status(401).json({error: "unauthorized"});
            return;
        }

        const parsed = cartSchema.safeParse(req.body);
        if(!parsed.success){
            res.status(400).json({error: "Invalid cart", details: parsed.error.flatten()});
            return;
        }

        if(!env.POLAR_ACCESS_TOKEN ) {
            res.status(503).json({ error:"payments are not configured"});
            return;
        }

        const localUser = await getLocalUser(userId);
        if(!getLocalUser){
            res.status(503).json({error: "Account is not synced"})
        }

        
        const ids = parsed.data.items.map((i) => i.productId);

        const prodRows = await db
        .select()
        .from(products)
        .where(and(inArray(products.id, ids), eq(products.active, true)));

        if(prodRows.length !== ids.length){
            res.status(400).json({error: "one or more products is invalid"})
        }

        const byId = new Map(prodRows.map((p) => [p.id, p]));
        let totalcents = 0;
        const lines: checkoutSessionsLine[] =[];

        for (const line of parsed.data.items) {
            const p = byId.get(line.productId)!;
            totalcents += p.price * line.quantity ;

            lines.push({
                productId: p.id,
                quantity: line.quantity,
                unitPriceCents: p.price,
            });
        } 

        if(totalcents <10){
            res.status(400).json({error:"total below polar minimum", });

            return; 
        }

        const [sessions] = await db
        .insert(checkoutSessions)
        .values({
            userId: localUser.id,
            polarCheckoutId: "pending",
            lines,
            totalcents,
            currency: "usd",
        })

        .returning();

        const successUrl = `${env.FRONTEND_URL}/ checkout/return?checkout_id={CHECKOUT_ID}`;
        const returnUrl = `${env.FRONTEND_URL}/cart`;
        
        const checkout = await polarCreateCheckout(env, {
            products: [env.POLAR_CHECKOUT_PRODUCT_ID],
            prices: {
                [env.POLAR_CHECKOUT_PRODUCT_ID]:[
                    {
                        amount_type:"fixed",
                        price_currency:"usd",
                        price_amount: "number",

                    },
                ],
            },

            success_Url:successUrl,
            return_Url:returnUrl,
            external_customer_id:userId,
            metadata:{checkout_session_id:sessions.id}
        }) as unknown as { id: string; url: string };
       

       

        await db
        .update(checkoutSessions)
        .set({polarCheckoutId: checkout.id})
        .where(eq(checkoutSessions.id, sessions.id));

        res.json({ checkoutUrl: checkout.url});
    } catch (e) {
        next(e)
        
    }
}