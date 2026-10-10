import type { UserRole as UserRole } from "../db/schema";

const VALID = ["customer", "admin"] as const;

export function parseRole(value:unknown){
    if (typeof value ==="string" && (VALID as readonly string[]). includes(value)) {
        return value as UserRole;
    }
    return "customer";
}

export function isAdmin(role:UserRole) {
    return role === "admin";
}

export function isStaff(role: UserRole | "support") {
    return role === "support" || role === "admin";
}