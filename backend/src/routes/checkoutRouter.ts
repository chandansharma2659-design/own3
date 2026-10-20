import {Router } from "express"
import { createCheckout } from "../controller/checkoutController"

const router = Router()

router.post("/",createCheckout)

export default router