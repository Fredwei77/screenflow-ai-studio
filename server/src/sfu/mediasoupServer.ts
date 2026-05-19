import * as mediasoup from 'mediasoup';
import { types as mediasoupTypes } from 'mediasoup';
import { serverConfig } from '../config.js';

let worker: mediasoupTypes.Worker | null = null;
const routers = new Map<string, mediasoupTypes.Router>();

/**
 * Create and initialize a mediasoup Worker.
 * In production you'd create one per CPU core, but for simplicity we use one.
 */
export async function createWorker(): Promise<mediasoupTypes.Worker> {
  const { rtcMinPort, rtcMaxPort, logLevel } = serverConfig.sfu.worker;

  worker = await mediasoup.createWorker({
    rtcMinPort,
    rtcMaxPort,
    logLevel,
  });

  worker.on('died', () => {
    console.error('[SFU] mediasoup Worker died — this should never happen!');
    setTimeout(() => process.exit(1), 2000);
  });

  console.log(`[SFU] Worker created [pid:${worker.pid}], RTC port range ${rtcMinPort}-${rtcMaxPort}`);
  return worker;
}

/**
 * Get or create a Router for a given room (meetingId).
 * Each room gets its own isolated Router with configured codecs.
 */
export async function getRouter(meetingId: string): Promise<mediasoupTypes.Router> {
  if (!worker) {
    throw new Error('mediasoup Worker not initialized — call createWorker() first');
  }

  let router = routers.get(meetingId);
  if (router && !router.closed) {
    return router;
  }

  const { mediaCodecs } = serverConfig.sfu.router;
  router = await worker.createRouter({ mediaCodecs });
  routers.set(meetingId, router);

  router.observer.on('close', () => {
    console.log(`[SFU] Router closed for room ${meetingId}`);
    routers.delete(meetingId);
  });

  console.log(`[SFU] Router created for room ${meetingId} [routerId:${router.id}]`);
  return router;
}

/**
 * Close and remove a Router for a given room.
 */
export async function closeRouter(meetingId: string): Promise<void> {
  const router = routers.get(meetingId);
  if (router && !router.closed) {
    router.close();
  }
  routers.delete(meetingId);
}

/**
 * Get the current Worker instance.
 */
export function getWorker(): mediasoupTypes.Worker | null {
  return worker;
}

/**
 * Get all active routers (for debugging).
 */
export function getActiveRouters(): Map<string, mediasoupTypes.Router> {
  return routers;
}
