import "dotenv/config";
import { clerkClient } from "@clerk/express";
import { db } from "../db";
import { users } from "../db/schema";
import { parseRole } from "../lib/roles";
import { getEnv } from "../lib/env";

async function syncClerkUsers() {
    getEnv();

    let offset = 0;
    let synced = 0;
    let skipped = 0;
    const limit = 100;

    while (true) {
        const page = await clerkClient.users.getUserList({ limit, offset });
        if (page.data.length === 0) break;

        for (const clerkUser of page.data) {
            const email = clerkUser.emailAddresses.find(
                (address) => address.id === clerkUser.primaryEmailAddressId,
            )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

            if (!email) {
                skipped += 1;
                console.warn(`Skipped Clerk user ${clerkUser.id}: no email address`);
                continue;
            }

            const displayName = [clerkUser.firstName, clerkUser.lastName]
                .filter(Boolean)
                .join(" ") || clerkUser.username || email;

            await db.insert(users).values({
                clerkUserId: clerkUser.id,
                email,
                displayName,
                role: parseRole(clerkUser.publicMetadata.role),
            }).onConflictDoUpdate({
                target: users.clerkUserId,
                set: {
                    email,
                    displayName,
                    role: parseRole(clerkUser.publicMetadata.role),
                    updatedAt: new Date(),
                },
            });
            synced += 1;
        }

        offset += page.data.length;
        if (offset >= page.totalCount) break;
    }

    console.log(`Clerk user sync complete: ${synced} synced, ${skipped} skipped.`);
}

syncClerkUsers().catch((error: unknown) => {
    console.error("Clerk user sync failed:", error);
    process.exitCode = 1;
});