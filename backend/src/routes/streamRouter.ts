import { Router } from "express";
import { createStreamToken } from "../controller/streamController";

const router = Router()

router.post("/token",createStreamToken)

export default router