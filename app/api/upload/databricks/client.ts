async function getOAuthToken(host: string, clientId: string, clientSecret: string): Promise<string> {
    const response = await fetch(`${host}/oidc/v1/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: clientId,
            client_secret: clientSecret,
            scope: "all-apis",
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to obtain OAuth token: ${await response.text()}`);
    }

    const data = await response.json();
    return data.access_token;
}

export async function getDatabricksConfig(): Promise<{ host: string; token: string }> {
    const host = process.env["DATABRICKS_HOST"];

    if (!host) {
        throw new Error("DATABRICKS_HOST is not set.");
    }

    // Ensure scheme is present and no trailing slash
    const cleanHost = host.startsWith("http")
        ? host.replace(/\/$/, "")
        : `https://${host.replace(/\/$/, "")}`;

    // Local dev: use a personal access token from .env.local
    const pat = process.env["DATABRICKS_TOKEN"];
    if (pat) {
        return { host: cleanHost, token: pat };
    }

    // Databricks Apps runtime: use injected OAuth credentials
    const clientId = process.env["DATABRICKS_CLIENT_ID"];
    const clientSecret = process.env["DATABRICKS_CLIENT_SECRET"];

    if (!clientId || !clientSecret) {
        throw new Error(
            "No Databricks credentials found. " +
            "Set DATABRICKS_TOKEN in .env.local for local dev, " +
            "or ensure the app is running on Databricks Apps."
        );
    }

    const token = await getOAuthToken(cleanHost, clientId, clientSecret);
    return { host: cleanHost, token };
}