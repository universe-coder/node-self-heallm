export async function postJson(url: string, body: unknown, headers?: Record<string, string>): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      redirect: "error",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...headers
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`HTTP request failed: ${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}
