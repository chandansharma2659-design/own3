import { Router }  from "express";
import { getOrders, listOrders } from "../controller/orderController";

const router = Router();

router.get("/", listOrders);
router.get("/:id",getOrders);

export default router;