
/**
 * ÉCLAT — Shared Audio Decoding Service
 *
 * Decodes a File once and lets multiple
 * components reuse the same AudioBuffer.
 */

const decodedAudioCache = new WeakMap<
  File,
  Promise<AudioBuffer>
>();

/**
 * Returns a decoded AudioBuffer.
 *
 * If another component is already decoding
 * this File, reuse the pending Promise.
 */
export function getDecodedAudio(
  file: File
): Promise<AudioBuffer> {
  const cached = decodedAudioCache.get(file);

  if (cached) {
    return cached;
  }

  const task = (async (): Promise<AudioBuffer> => {
    const context = new AudioContext();

    try {
      const bytes = await file.arrayBuffer();

      const decoded = await context.decodeAudioData(
        bytes
      );

      return decoded;
    } finally {
      await context.close().catch(() => {});
    }
  })();

  decodedAudioCache.set(file, task);

  // Failed decoding must be retryable.
  void task.catch(() => {
    if (decodedAudioCache.get(file) === task) {
      decodedAudioCache.delete(file);
    }
  });

  return task;
}
