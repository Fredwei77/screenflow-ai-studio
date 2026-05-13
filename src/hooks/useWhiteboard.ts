import { useEffect, useRef, useCallback } from 'react';
import { useWhiteboardStore } from '../stores/useWhiteboardStore';
import { sendWhiteboardStroke, sendWhiteboardClear, getSocket } from '../services/socket';
import type { DrawStroke, DrawPoint } from '../types';

export function useWhiteboard(canvasRef: React.RefObject<HTMLCanvasElement | null>, meetingId: string, userId: string, userName: string) {
  const { strokes, currentTool, currentColor, lineWidth, addStroke, loadStrokes, clearStrokes } = useWhiteboardStore();
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<DrawPoint[]>([]);
  const strokesRef = useRef(strokes);

  // Keep strokes ref in sync
  strokesRef.current = strokes;

  // Redraw all strokes (reads from ref to avoid dependency on strokes)
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokesRef.current) {
      if (stroke.points.length < 2) continue;

      ctx.beginPath();
      ctx.strokeStyle = stroke.tool === 'eraser' ? '#1a1a2e' : stroke.color;
      ctx.lineWidth = stroke.tool === 'eraser' ? stroke.lineWidth * 3 : stroke.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [canvasRef]);

  // Redraw when strokes change (only depends on strokes, not redraw)
  useEffect(() => {
    redraw();
  }, [strokes, redraw]);

  // Resize canvas to fill container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      redraw();
    };

    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    return () => observer.disconnect();
  }, [canvasRef, redraw]);

  // Listen for remote whiteboard events
  useEffect(() => {
    if (!meetingId) return;

    const socket = getSocket();

    const handleRemoteStroke = (stroke: DrawStroke) => {
      addStroke(stroke);
    };

    const handleWhiteboardLoad = (loadedStrokes: DrawStroke[]) => {
      loadStrokes(loadedStrokes);
    };

    const handleWhiteboardClear = () => {
      clearStrokes();
    };

    socket.on('whiteboard:stroke', handleRemoteStroke);
    socket.on('whiteboard:load', handleWhiteboardLoad);
    socket.on('whiteboard:clear', handleWhiteboardClear);

    return () => {
      socket.off('whiteboard:stroke', handleRemoteStroke);
      socket.off('whiteboard:load', handleWhiteboardLoad);
      socket.off('whiteboard:clear', handleWhiteboardClear);
    };
  }, [meetingId, addStroke, loadStrokes, clearStrokes]);

  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent): DrawPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return null;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, [canvasRef]);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (!point) return;

    isDrawingRef.current = true;
    currentPointsRef.current = [point];
  }, [getCanvasPoint]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;

    const point = getCanvasPoint(e);
    if (!point) return;

    currentPointsRef.current.push(point);

    // Draw current stroke in real-time
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pts = currentPointsRef.current;
    if (pts.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = currentTool === 'eraser' ? '#1a1a2e' : currentColor;
    ctx.lineWidth = currentTool === 'eraser' ? lineWidth * 3 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
  }, [canvasRef, currentTool, currentColor, lineWidth, getCanvasPoint]);

  const stopDrawing = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (currentPointsRef.current.length < 2) {
      currentPointsRef.current = [];
      return;
    }

    const stroke: DrawStroke = {
      id: crypto.randomUUID(),
      tool: currentTool,
      color: currentColor,
      lineWidth,
      points: [...currentPointsRef.current],
      userId,
      userName,
    };

    addStroke(stroke);
    sendWhiteboardStroke(meetingId, stroke);
    currentPointsRef.current = [];
  }, [currentTool, currentColor, lineWidth, userId, userName, meetingId, addStroke]);

  // Cleanup drawing state on unmount
  useEffect(() => {
    return () => {
      isDrawingRef.current = false;
      currentPointsRef.current = [];
    };
  }, []);

  const handleClear = useCallback(() => {
    clearStrokes();
    sendWhiteboardClear(meetingId);
  }, [meetingId, clearStrokes]);

  return {
    startDrawing,
    draw,
    stopDrawing,
    handleClear,
  };
}
