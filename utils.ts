export async function callWithRetry<T>(
    callFn: () => Promise<T>,
    maxRetries = 3,
    baseDelayMs = 500
): Promise<T> {
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            return await callFn();
        } catch (error) {
            attempt++;
            if (attempt === maxRetries) {
                throw error;
            }

            const delay = baseDelayMs * Math.pow(2, attempt);
            console.warn(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
            await new Promise((res) => setTimeout(res, delay));
        }
    }
    throw new Error('Exceeded max retries');
}