import { getAuth } from "@clerk/express";
import { Router } from "express";
import { users } from "../db/schema";

const router = Router();

router.get("/", (req, res, next) => {
  try {
	const { userId, isAuthenticated } = getAuth(req);
	if(!isAuthenticated || !userId) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	res.json({ users});
  } catch (e) {
	next(e);
  }
});

export default router;
