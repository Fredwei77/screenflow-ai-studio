export interface SubtitleSegment {
  index: number;
  startTime: number;
  endTime: number;
  text: string;
}

export function splitTextIntoSegments(
  text: string,
  totalDurationMs: number,
  language: string = 'en-US'
): SubtitleSegment[] {
  const sentences = text
    .replace(/([.!?。！？])\s+/g, '$1\n')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length === 0) return [];

  const avgDuration = totalDurationMs / sentences.length;

  return sentences.map((sentence, index) => ({
    index: index + 1,
    startTime: index * avgDuration,
    endTime: (index + 1) * avgDuration,
    text: sentence,
  }));
}

export function transcriptToSRT(segments: SubtitleSegment[]): string {
  const formatTime = (ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor(ms % 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  };

  return segments
    .map(
      (seg) =>
        `${seg.index}\n${formatTime(seg.startTime)} --> ${formatTime(seg.endTime)}\n${seg.text}`
    )
    .join('\n\n');
}

export function transcriptToVTT(segments: SubtitleSegment[]): string {
  const formatTime = (ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor(ms % 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  const header = 'WEBVTT\n\n';
  const body = segments
    .map(
      (seg) =>
        `${seg.index}\n${formatTime(seg.startTime)} --> ${formatTime(seg.endTime)}\n${seg.text}`
    )
    .join('\n\n');

  return header + body;
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
