import { Router } from "express";
import { getCategories, getProductBySlug, listProducts } from "../controller/productsController";

const router = Router()

router.get("/", listProducts);
router.get("/categories", getCategories);
router.get("/:slug", getProductBySlug);

export default router;