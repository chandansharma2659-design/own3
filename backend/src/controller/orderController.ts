
import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { orders } from "../db/schema";
import { getLocalUser } from "../lib/users";

export async function listOrders(req: Request, res: Response, next: NextFunction) {
	try {
		const { userId, isAuthenticated } = getAuth(req);
		if (!isAuthenticated || !userId) {
			res.status(401).json({ message: "unauthorized" });
			return;
		}

		const user = await getLocalUser(userId);
		if (!user) {
			res.status(403).json({ message: "forbidden" });
			return;
		}

		const rows = await db
			.select()
			.from(orders)
			.where(user.role === "admin" ? undefined : eq(orders.userId, user.id))
			.orderBy(desc(orders.createdAt));

		res.json({ orders: rows });
	} catch (e) {
		next(e);
	}
}

export async function getOrders(req: Request, res: Response, next: NextFunction) {
	try {
		const { userId, isAuthenticated } = getAuth(req);
		if (!isAuthenticated || !userId) {
			res.status(401).json({ message: "unauthorized" });
			return;
		}

		const user = await getLocalUser(userId);
		if (!user) {
			res.status(403).json({ message: "forbidden" });
			return;
		}

		const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
		if (!orderId) {
			res.status(404).json({ message: "order not found" });
			return;
		}

		const order = await db
			.select()
			.from(orders)
			.where(eq(orders.id, orderId))
			.limit(1);

		if (!order.length) {
			res.status(404).json({ message: "order not found" });
			return;
		}

		res.json({ order: order[0] });
	} catch (e) {
		next(e);
	}
}