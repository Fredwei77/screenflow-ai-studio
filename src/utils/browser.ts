/**
 * Browser and feature detection utilities for graceful degradation on iOS Safari.
 */

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

export const isIOS = /iPad|iPhone|iPod/.test(ua) ||
  (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1); // iPadOS 13+

export const isSafari = /^((?!chrome|android).)*safari/i.test(ua) || isIOS;

export const isMobile = isIOS || /Android/i.test(ua);

/** canvas.captureStream() — not available on iOS Safari */
export const supportsCaptureStream = (() => {
  try {
    return typeof document.createElement('canvas').captureStream === 'function';
  } catch {
    return false;
  }
})();

/** navigator.mediaDevices.getDisplayMedia — unavailable on iPhone, iPadOS 16+ only */
export const supportsGetDisplayMedia = (() => {
  try {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
  } catch {
    return false;
  }
})();

/** MediaRecorder — Safari 14.1+; must check MIME support at runtime */
export const supportsMediaRecorder = typeof MediaRecorder !== 'undefined';

/**
 * Find a MediaRecorder MIME type that works on this browser.
 * Safari supports video/mp4 (H264); Chrome/Firefox support video/webm.
 */
export function getSupportedMimeType(): string | null {
  const types = [
    // Safari (mp4)
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
    // Chrome / Firefox (webm)
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return null;
}

/**
 * Get the file extension for a given MIME type (used for download filenames).
 */
export function getExtensionForMime(mime: string): string {
  if (mime.startsWith('video/mp4')) return 'mp4';
  return 'webm';
}
