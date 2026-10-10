import { z } from "zod";



const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().url(),

    CLERK_PUBLISHABLE_KEY: z.string().min(1),
    CLERK_SECRET_KEY: z.string().min(1),
    CLERK_WEBHOOK_SECRET: z.string().min(1),

    FRONTEND_URL: z.string().url(),

    POLAR_ACCESS_TOKEN: z.string().min(1),
    POLAR_WEBHOOK_SECRET: z.string().min(1),
    POLAR_API_BASE: z.string().url().default("https://api.polar.sh"),
    POLAR_CHECKOUT_PRODUCT_ID: z.string(),


    IMAGEKIT_PUBLIC_KEY: z.string().min(1),
    IMAGEKIT_PRIVATE_KEY: z.string().min(1),
    IMAGEKIT_URL_ENDPOINT: z.string().url(),

});

export type Env = z.infer<typeof envSchema>;

export function loadEnv() {
    const parsed = envSchema.safeParse(process.env);

    if(!parsed.success) {
        console.error(parsed.error.flatten().fieldErrors);
        throw new Error("Invalid environment variables");
    }

    return parsed.data;
}

let cachedEnv: Env | null = null;

export function getEnv(){
    if(!cachedEnv) {
        cachedEnv = loadEnv();
    }
    return cachedEnv;
}


 

