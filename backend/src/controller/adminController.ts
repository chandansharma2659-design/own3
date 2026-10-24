import { getAuth } from "@clerk/express";
import ImageKit from "@imagekit/nodejs";
import { Request, Response, NextFunction } from "express";
import { products } from "../db/schema";
import { db } from "../db";
import { desc, eq } from "drizzle-orm";
import { getLocalUser } from "../lib/users";
import { z } from "zod";

const productInputSchema = z.object({
    name: z.string().trim().min(1),
    slug: z.string().trim().min(1).optional(),
    category: z.string().trim().min(1).optional(),
    priceCents: z.number().int().nonnegative(),
    currency: z.string().trim().min(1).optional(),
    metadata: z.unknown().optional(),
    description: z.string().optional(),
    imagekitFileId: z.string().trim().min(1).nullable().optional(),
    active: z.boolean().optional(),
});

const productUpdateSchema = productInputSchema
    .partial()
    .refine((input) => Object.keys(input).length > 0, {
        message: "at least one product field is required",
    });

function createSlug(name: string) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    try {
        const { userId, isAuthenticated } = getAuth(req);
        if (!userId || !isAuthenticated) {
            res.status(401).json({ message: "unauthorized" });
            return;
        }

        const user = await getLocalUser(userId);
        if (!user || user.role !== "admin") {
            res.status(403).json({ message: "forbidden" });
            return;
        }

        next();
    } catch (e) {
        next(e);
    }
}

export async function getImageKitAuth(_req: Request, res: Response, next: NextFunction) {
    try {
        const client = new ImageKit({
            privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
        });
        const auth = client.helper.getAuthenticationParameters();
    res.json({
        ...auth,
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    });
    } catch (e) {
        next(e);
    }
}

export async function getListProducts(_req: Request, res: Response, next: NextFunction) {
    try {
       const rows = await db
       .select()
       .from(products) 
       .orderBy(desc(products.createdAt));
       res.json({ products: rows})
    } catch (e) {
        next(e);
    }
}

export async function createAdminProducts(req: Request, res: Response, next: NextFunction) {
    try {
        const parsed = productInputSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ message: "invalid product data", issues: parsed.error.issues });
            return;
        }

        const input = parsed.data;
        const [product] = await db
            .insert(products)
            .values({
                name: input.name,
                slug: input.slug ?? createSlug(input.name),
                description: input.description ?? "",
                price: input.priceCents,
                ...(input.category !== undefined && { category: input.category }),
                ...(input.currency !== undefined && { currency: input.currency }),
                ...(input.metadata !== undefined && { metadata: input.metadata }),
                ...(input.imagekitFileId !== undefined && { imageKitField: input.imagekitFileId }),
                ...(input.active !== undefined && { active: input.active }),
            })
            .returning();

        res.status(201).json({ product });
    } catch (e) {
        next(e);
    }
}

export async function updateAdminProducts(req: Request, res: Response, next: NextFunction) {
    try {
        const productId = z.string().uuid().safeParse(req.params.id);
        if (!productId.success) {
            res.status(400).json({ message: "invalid product id" });
            return;
        }

        const parsed = productUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ message: "invalid product data", issues: parsed.error.issues });
            return;
        }

        const input = parsed.data;
        const [product] = await db
            .update(products)
            .set({
                ...input,
                updatedAt: new Date(),
            })
            .where(eq(products.id, productId.data))
            .returning();

        if (!product) {
            res.status(404).json({ message: "product not found" });
            return;
        }

        res.json({ product });
    } catch (e) {
        next(e);
    }
}

export async function deleteAdminProducts(req: Request, res: Response, next: NextFunction) {
    try {
        const productId = z.string().uuid().safeParse(req.params.id);
        if (!productId.success) {
            res.status(400).json({ message: "invalid product id" });
            return;
        }

        const [product] = await db
            .delete(products)
            .where(eq(products.id, productId.data))
            .returning();

        if (!product) {
            res.status(404).json({ message: "product not found" });
            return;
        }

        res.json({ product });
    } catch (e) {
        next(e);
    }
}

