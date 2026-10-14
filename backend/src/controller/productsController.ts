
import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { products } from "../db/schema";
import { eq } from "drizzle-orm";

export async function listProducts(req:Request, res:Response, next:NextFunction) {
    try {
        const cat = typeof req.query.category === "string" ? req.query.category.trim() : "";
         const rows = await db
         .select()
         .from(products)
         .where (cat ? eq (products.category, cat) : undefined)
         res.json({products:rows})
    } catch (e) {
        next(e);
    }
}

export async function getCategories(_req: Request, res: Response, next: NextFunction) {
    try {
        const rows = await db
        .select()
        .from(products)
        .orderBy(products.category)
        res.json({categories: rows.map(row => row.category)})
    } catch (e) {
        next(e)
    }
}

export async function getProductBySlug(req:Request, res:Response, next: NextFunction) {
    try {

         const category = Array.isArray(req.params.category)
            ? req.params.category[0]
            : req.params.category;
        const [rows] = await db
        .select()
        .from(products)
        .where(eq(products.category, category))
        res.json({products: rows})
    } catch (e) {
        next(e);
    }
}