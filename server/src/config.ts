import dotenv from 'dotenv';
import { types as mediasoupTypes } from 'mediasoup';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || '';

// Fail fast in production if JWT_SECRET is missing
if (nodeEnv === 'production' && !jwtSecret) {
  console.error('FATAL: JWT_SECRET environment variable is required in production');
  process.exit(1);
}

export const serverConfig = {
  port: parseInt(process.env.PORT || '4000'),
  nodeEnv,
  jwtSecret: jwtSecret || 'dev-secret-change-in-production',
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'meta-llama/llama-3.1-8b-instruct:free',
  corsOrigin: process.env.CORS_ORIGIN || '',
  maxParticipants: 50,
  maxWhiteboardStrokes: 500,

  // mediasoup SFU configuration
  sfu: {
    // Worker settings
    worker: {
      rtcMinPort: parseInt(process.env.SFU_RTC_MIN_PORT || '10000'),
      rtcMaxPort: parseInt(process.env.SFU_RTC_MAX_PORT || '10100'),
      logLevel: 'warn' as mediasoupTypes.WorkerLogLevel,
    },
    // Router media codecs - ordered by browser compatibility
    // iOS Safari requires H264 Baseline Profile (not High/Main)
    // Put H264 first as it's more widely supported
    router: {
      mediaCodecs: [
        {
          kind: 'video' as mediasoupTypes.MediaKind,
          mimeType: 'video/H264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '42e01f', // H264 Baseline Profile - required for iOS Safari
            'level-asymmetry-allowed': 1,
          },
        },
        {
          kind: 'video' as mediasoupTypes.MediaKind,
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'audio' as mediasoupTypes.MediaKind,
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
      ] as mediasoupTypes.RtpCodecCapability[],
    },
    // WebRtcTransport settings
    webRtcTransport: {
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp: process.env.ANNOUNCED_IP || undefined,
        },
      ] as mediasoupTypes.TransportListenIp[],
      initialAvailableOutgoingBitrate: 1000000,
      maxIncomingBitrate: 1500000,
      enableSctp: false,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    },
  },
};
