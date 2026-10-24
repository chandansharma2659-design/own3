import { Router } from "express";
import {
	createAdminProducts,
	deleteAdminProducts,
	getImageKitAuth,
	getListProducts,
	requireAdmin,
	updateAdminProducts,
} from "../controller/adminController";

const router = Router();

router.use(requireAdmin);

router.get("/imagekit/auth", getImageKitAuth); 
router.get("/products", getListProducts);
router.post("/products", createAdminProducts);
router.patch("/products/:id", updateAdminProducts);
router.delete("/products/:id", deleteAdminProducts);

export default router;
