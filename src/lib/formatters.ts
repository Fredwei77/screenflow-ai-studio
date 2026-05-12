/**
 * Format seconds into H:MM:SS or M:SS display string
 */
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generate a random 6-character meeting ID
 */
export function generateMeetingId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Format a timestamp to a human-readable time string
 */
export function formatTime(timestamp: string | number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}
