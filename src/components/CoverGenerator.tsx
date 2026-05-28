import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ImageIcon, Download, RefreshCw, Type, Upload, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type CoverSize = '16:9' | '9:16' | '1:1';

interface CoverTemplate {
  id: string;
  name: string;
  bgColor: string;
  gradient?: [string, string];
  gradientAngle?: number;
  textColor: string;
  fontFamily: string;
  titlePosition: 'top' | 'center' | 'bottom';
  overlayOpacity: number;
}

interface CoverGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  videoBlob: Blob | null;
  theme: 'dark' | 'light';
}

const COVER_TEMPLATES: CoverTemplate[] = [
  {
    id: 'modern-dark',
    name: 'Modern Dark',
    bgColor: '#1a1a2e',
    textColor: '#ffffff',
    fontFamily: 'Inter, sans-serif',
    titlePosition: 'bottom',
    overlayOpacity: 0.6,
  },
  {
    id: 'clean-light',
    name: 'Clean Light',
    bgColor: '#f8fafc',
    textColor: '#1e293b',
    fontFamily: 'Inter, sans-serif',
    titlePosition: 'bottom',
    overlayOpacity: 0.3,
  },
  {
    id: 'gradient-blue',
    name: 'Gradient Blue',
    bgColor: '#1e3a5f',
    gradient: ['#1e3a5f', '#3b82f6'],
    gradientAngle: 135,
    textColor: '#ffffff',
    fontFamily: 'Inter, sans-serif',
    titlePosition: 'center',
    overlayOpacity: 0.4,
  },
  {
    id: 'gradient-sunset',
    name: 'Sunset',
    bgColor: '#f97316',
    gradient: ['#f97316', '#ec4899'],
    gradientAngle: 135,
    textColor: '#ffffff',
    fontFamily: 'Inter, sans-serif',
    titlePosition: 'bottom',
    overlayOpacity: 0.45,
  },
  {
    id: 'gradient-emerald',
    name: 'Emerald',
    bgColor: '#065f46',
    gradient: ['#065f46', '#34d399'],
    gradientAngle: 160,
    textColor: '#ffffff',
    fontFamily: 'Inter, sans-serif',
    titlePosition: 'center',
    overlayOpacity: 0.5,
  },
  {
    id: 'gradient-purple',
    name: 'Purple Haze',
    bgColor: '#4c1d95',
    gradient: ['#4c1d95', '#a78bfa'],
    gradientAngle: 135,
    textColor: '#ffffff',
    fontFamily: 'Inter, sans-serif',
    titlePosition: 'center',
    overlayOpacity: 0.45,
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    bgColor: '#000000',
    textColor: '#ffffff',
    fontFamily: 'Inter, sans-serif',
    titlePosition: 'bottom',
    overlayOpacity: 0.7,
  },
  {
    id: 'vibrant',
    name: 'Vibrant',
    bgColor: '#8b5cf6',
    textColor: '#ffffff',
    fontFamily: 'Inter, sans-serif',
    titlePosition: 'center',
    overlayOpacity: 0.5,
  },
  {
    id: 'professional',
    name: 'Professional',
    bgColor: '#1e293b',
    textColor: '#e2e8f0',
    fontFamily: 'Inter, sans-serif',
    titlePosition: 'bottom',
    overlayOpacity: 0.8,
  },
];

const COVER_SIZES: Record<CoverSize, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
};

function drawGradientBg(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  template: CoverTemplate
) {
  if (template.gradient) {
    const angle = ((template.gradientAngle ?? 135) * Math.PI) / 180;
    const cx = width / 2;
    const cy = height / 2;
    const len = Math.sqrt(width * width + height * height) / 2;
    const grad = ctx.createLinearGradient(
      cx - len * Math.cos(angle),
      cy - len * Math.sin(angle),
      cx + len * Math.cos(angle),
      cy + len * Math.sin(angle)
    );
    grad.addColorStop(0, template.gradient[0]);
    grad.addColorStop(1, template.gradient[1]);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = template.bgColor;
  }
  ctx.fillRect(0, 0, width, height);
}

function drawTitleWithShadow(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
  textColor: string
) {
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Text shadow for readability
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Word-wrap
  const words = text.split(' ');
  let line = '';
  const lines: string[] = [];
  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  const lineHeight = Math.floor(fontSize * 1.3);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((ln, index) => {
    const yPos = startY + index * lineHeight;
    // Stroke outline for extra contrast
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = Math.max(2, fontSize / 20);
    ctx.strokeText(ln, centerX, yPos);
    ctx.fillStyle = textColor;
    ctx.fillText(ln, centerX, yPos);
  });

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

export const CoverGenerator: React.FC<CoverGeneratorProps> = ({
  isOpen,
  onClose,
  videoBlob,
  theme,
}) => {
  const { t } = useTranslation();
  const [selectedSize, setSelectedSize] = useState<CoverSize>('16:9');
  const [selectedTemplate, setSelectedTemplate] = useState<CoverTemplate>(COVER_TEMPLATES[0]);
  const [title, setTitle] = useState('');
  const [titlePosition, setTitlePosition] = useState<'top' | 'center' | 'bottom'>('bottom');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPosition, setLogoPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('bottom-right');
  const [keyframes, setKeyframes] = useState<string[]>([]);
  const [selectedKeyframe, setSelectedKeyframe] = useState<number>(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCovers, setGeneratedCovers] = useState<Record<CoverSize, string | null>>({
    '16:9': null,
    '9:16': null,
    '1:1': null,
  });

  const extractKeyframes = useCallback(async () => {
    if (!videoBlob) return;

    setIsExtracting(true);
    try {
      const videoUrl = URL.createObjectURL(videoBlob);
      const video = document.createElement('video');
      video.src = videoUrl;
      video.muted = true;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
      });

      const duration = video.duration;
      const frameCount = 5;
      const frames: string[] = [];

      for (let i = 0; i < frameCount; i++) {
        const time = (duration / (frameCount + 1)) * (i + 1);
        video.currentTime = time;

        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve();
        });

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          frames.push(canvas.toDataURL('image/jpeg', 0.8));
        }
      }

      setKeyframes(frames);
      setSelectedKeyframe(0);
      URL.revokeObjectURL(videoUrl);
    } catch (error) {
      console.error('Failed to extract keyframes:', error);
    } finally {
      setIsExtracting(false);
    }
  }, [videoBlob]);

  useEffect(() => {
    if (isOpen && videoBlob) {
      extractKeyframes();
    }
  }, [isOpen, videoBlob, extractKeyframes]);

  const generateCover = useCallback(
    async (size: CoverSize): Promise<string | null> => {
      if (keyframes.length === 0 || !keyframes[selectedKeyframe]) return null;

      const canvas = document.createElement('canvas');
      const { width, height } = COVER_SIZES[size];
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Background (solid or gradient)
      drawGradientBg(ctx, width, height, selectedTemplate);

      // Load and draw keyframe image
      const frameImg = new window.Image();
      frameImg.src = keyframes[selectedKeyframe];
      await new Promise<void>((resolve) => {
        frameImg.onload = () => resolve();
      });

      const imgAspect = frameImg.width / frameImg.height;
      const canvasAspect = width / height;
      let drawWidth = width;
      let drawHeight = height;
      let drawX = 0;
      let drawY = 0;

      if (imgAspect > canvasAspect) {
        drawHeight = height;
        drawWidth = height * imgAspect;
        drawX = (width - drawWidth) / 2;
      } else {
        drawWidth = width;
        drawHeight = width / imgAspect;
        drawY = (height - drawHeight) / 2;
      }

      ctx.drawImage(frameImg, drawX, drawY, drawWidth, drawHeight);

      // Overlay tint
      ctx.fillStyle = selectedTemplate.bgColor;
      ctx.globalAlpha = selectedTemplate.overlayOpacity;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;

      // Title with shadow
      if (title) {
        let titleY = height / 2;
        if (titlePosition === 'top') {
          titleY = height * 0.15;
        } else if (titlePosition === 'bottom') {
          titleY = height * 0.85;
        }

        drawTitleWithShadow(
          ctx,
          title,
          width / 2,
          titleY,
          width * 0.8,
          Math.floor(width / 15),
          selectedTemplate.fontFamily,
          selectedTemplate.textColor
        );
      }

      // Logo watermark
      if (logoUrl) {
        const logoImg = new window.Image();
        logoImg.src = logoUrl;
        await new Promise<void>((resolve) => {
          logoImg.onload = () => resolve();
        });

        const logoSize = Math.floor(width / 8);
        let logoX = logoPosition.includes('right') ? width - logoSize - 20 : 20;
        let logoY = logoPosition.includes('bottom') ? height - logoSize - 20 : 20;

        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
      }

      return canvas.toDataURL('image/jpeg', 0.9);
    },
    [keyframes, selectedKeyframe, selectedTemplate, title, titlePosition, logoUrl, logoPosition]
  );

  const generateAllCovers = useCallback(async () => {
    setIsGenerating(true);
    try {
      const sizes: CoverSize[] = ['16:9', '9:16', '1:1'];
      const results: Record<CoverSize, string | null> = {
        '16:9': null,
        '9:16': null,
        '1:1': null,
      };

      for (const size of sizes) {
        results[size] = await generateCover(size);
      }

      setGeneratedCovers(results);
    } finally {
      setIsGenerating(false);
    }
  }, [generateCover]);

  useEffect(() => {
    if (keyframes.length > 0) {
      generateAllCovers();
    }
  }, [keyframes, selectedKeyframe, selectedTemplate, title, titlePosition, logoUrl, logoPosition, generateAllCovers]);

  const downloadCover = useCallback(
    (size: CoverSize) => {
      const coverUrl = generatedCovers[size];
      if (!coverUrl) return;

      const link = document.createElement('a');
      link.href = coverUrl;
      link.download = `cover-${size.replace(':', 'x')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [generatedCovers]
  );

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoUrl(url);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
          theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold">AI Cover Generator</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col lg:flex-row gap-6">
          {/* Left panel: controls */}
          <div className="lg:w-1/3 space-y-4">
            {/* Keyframes */}
            <div
              className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}
            >
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Keyframes
              </h3>
              {isExtracting ? (
                <div className="text-center py-4 text-gray-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Extracting frames...
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2">
                  {keyframes.map((frame, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedKeyframe(index)}
                      className={`rounded-lg overflow-hidden border-2 transition-all ${
                        selectedKeyframe === index
                          ? 'border-indigo-500 scale-105'
                          : 'border-transparent hover:border-gray-500'
                      }`}
                    >
                      <img src={frame} alt={`Frame ${index + 1}`} className="w-full" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cover Size */}
            <div
              className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}
            >
              <h3 className="font-semibold mb-3">Cover Size</h3>
              <div className="flex gap-2">
                {(['16:9', '9:16', '1:1'] as CoverSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      selectedSize === size
                        ? 'bg-indigo-600 text-white'
                        : theme === 'dark'
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-white text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Templates */}
            <div
              className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}
            >
              <h3 className="font-semibold mb-3">Template</h3>
              <div className="grid grid-cols-3 gap-2">
                {COVER_TEMPLATES.map((template) => {
                  const bg = template.gradient
                    ? `linear-gradient(${template.gradientAngle ?? 135}deg, ${template.gradient[0]}, ${template.gradient[1]})`
                    : template.bgColor;
                  return (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`p-2 rounded-lg text-xs font-medium transition-all ${
                        selectedTemplate.id === template.id ? 'ring-2 ring-indigo-500' : ''
                      }`}
                      style={{ background: bg, color: template.textColor }}
                    >
                      {template.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div
              className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}
            >
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Type className="w-4 h-4" />
                Title
              </h3>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter cover title..."
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <div className="mt-2">
                <label className="text-sm text-gray-400">Position</label>
                <div className="flex gap-2 mt-1">
                  {(['top', 'center', 'bottom'] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setTitlePosition(pos)}
                      className={`flex-1 py-1 px-2 rounded text-xs ${
                        titlePosition === pos
                          ? 'bg-indigo-600 text-white'
                          : theme === 'dark'
                          ? 'bg-gray-700 text-gray-300'
                          : 'bg-white text-gray-700'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Logo Watermark */}
            <div
              className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}
            >
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Logo Watermark
              </h3>
              {logoUrl ? (
                <div className="flex items-center gap-3">
                  <img src={logoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-contain" />
                  <button
                    onClick={() => setLogoUrl(null)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <div
                    className={`border-2 border-dashed rounded-lg p-4 text-center ${
                      theme === 'dark'
                        ? 'border-gray-600 text-gray-400'
                        : 'border-gray-300 text-gray-600'
                    }`}
                  >
                    <Upload className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm">Upload Logo</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              )}
              {logoUrl && (
                <div className="mt-2">
                  <label className="text-sm text-gray-400">Position</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setLogoPosition(pos)}
                        className={`py-1 px-2 rounded text-xs ${
                          logoPosition === pos
                            ? 'bg-indigo-600 text-white'
                            : theme === 'dark'
                            ? 'bg-gray-700 text-gray-300'
                            : 'bg-white text-gray-700'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right panel: preview */}
          <div className="lg:w-2/3 space-y-4">
            <div
              className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}
            >
              <h3 className="font-semibold mb-3">Preview</h3>
              <div className="flex justify-center">
                {isGenerating ? (
                  <div
                    className={`w-full h-64 rounded-lg flex flex-col items-center justify-center gap-3 ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                    }`}
                  >
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <span className="text-gray-400">Generating covers...</span>
                  </div>
                ) : generatedCovers[selectedSize] ? (
                  <img
                    src={generatedCovers[selectedSize]!}
                    alt={`Cover ${selectedSize}`}
                    className="max-w-full max-h-[60vh] rounded-lg shadow-lg"
                  />
                ) : (
                  <div
                    className={`w-full h-64 rounded-lg flex items-center justify-center ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                    }`}
                  >
                    <span className="text-gray-400">
                      {isExtracting ? 'Generating...' : 'No video loaded'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div
              className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}
            >
              <h3 className="font-semibold mb-3">All Sizes</h3>
              <div className="grid grid-cols-3 gap-4">
                {(['16:9', '9:16', '1:1'] as CoverSize[]).map((size) => (
                  <div key={size} className="space-y-2">
                    <div className="text-sm font-medium text-center">{size}</div>
                    {generatedCovers[size] ? (
                      <>
                        <img
                          src={generatedCovers[size]!}
                          alt={`Cover ${size}`}
                          className="w-full rounded-lg shadow-lg"
                        />
                        <button
                          onClick={() => downloadCover(size)}
                          className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </>
                    ) : isGenerating ? (
                      <div
                        className={`w-full h-32 rounded-lg flex items-center justify-center ${
                          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                        }`}
                      >
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                      </div>
                    ) : (
                      <div
                        className={`w-full h-32 rounded-lg flex items-center justify-center ${
                          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                        }`}
                      >
                        <span className="text-gray-400 text-sm">Generating...</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverGenerator;
