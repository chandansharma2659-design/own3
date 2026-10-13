import { CronJob } from "cron";

export function startHealthCheckCron(port: number): CronJob {
    const healthUrl = `http://127.0.0.1:${port}/health`;
    const job = new CronJob("*/14 * * * *", async () => {
        try {
            const response = await fetch(healthUrl);
            if (!response.ok) {
                console.error(`Health check failed with status ${response.status}`);
                return;
            }

            console.log("Health check succeeded");
        } catch (error) {
            console.error("Health check request failed:", error);
        }
    });

    job.start();
    return job;
}
