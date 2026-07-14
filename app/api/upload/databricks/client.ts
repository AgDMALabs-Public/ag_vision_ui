console.log("HOST:", process.env.DATABRICKS_HOST);
console.log("TOKEN set:", !!process.env.DATABRICKS_TOKEN);

export function getDatabricksConfig(): { host: string; token: string } {
    const host = process.env.DATABRICKS_HOST;
    const token = process.env.DATABRICKS_TOKEN;

    if (!host || !token) {
        throw new Error(
            "DATABRICKS_HOST and DATABRICKS_TOKEN must be set. " +
            "These are injected automatically by Databricks Apps at runtime."
        );
    }

    // Ensure no trailing slash
    return { host: host.replace(/\/$/, ""), token };
}