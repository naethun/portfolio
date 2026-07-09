export type HandTrackingDelegate = 'GPU' | 'CPU';

export const HAND_TRACKING_DELEGATES: readonly HandTrackingDelegate[] = [
  'GPU',
  'CPU',
];

export async function createWithHandDelegateFallback<T>(
  create: (delegate: HandTrackingDelegate) => Promise<T>
): Promise<T> {
  let lastError: unknown = null;

  for (const delegate of HAND_TRACKING_DELEGATES) {
    try {
      return await create(delegate);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}
