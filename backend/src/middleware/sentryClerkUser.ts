import { getAuth } from "@clerk/express";
import * as Sentry from "@sentry/node";
import { RequestHandler } from "express";



export const sentryClerkMiddleware: RequestHandler = (req, _res, next) => {
    const {userId} =  getAuth(req);
    Sentry.getIsolationScope().setUser(userId ? {id: userId} : null);
    next();
};