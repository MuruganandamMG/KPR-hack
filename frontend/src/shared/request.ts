export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const timeout = AbortSignal.timeout(110_000);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeout])
    : timeout;
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...init, signal });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new ApiError(
      "The server could not be reached. Retry with the same submission or check your tracking ID.",
      0,
    );
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof data?.detail === "string"
        ? data.detail
        : Array.isArray(data?.detail)
          ? data.detail.map((item: { msg: string }) => item.msg).join(". ")
          : "The request could not be completed.";
    throw new ApiError(message, response.status);
  }
  return data as T;
}
