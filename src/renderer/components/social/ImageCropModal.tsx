/**
 * ImageCropModal - Square crop UI for avatar images
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Button } from '../ui/button';

interface ImageCropModalProps {
  imageSrc: string;
  onCrop: (croppedImage: string) => void;
  onCancel: () => void;
}

const OUTPUT_SIZE = 256; // Output image size in pixels

export function ImageCropModal({ imageSrc, onCrop, onCancel }: ImageCropModalProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      // Calculate initial scale to fit image
      const containerSize = 280;
      const minDim = Math.min(img.width, img.height);
      const initialScale = containerSize / minDim;
      setScale(initialScale);
      // Center the image
      setOffset({
        x: (containerSize - img.width * initialScale) / 2,
        y: (containerSize - img.height * initialScale) / 2,
      });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Draw preview
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const containerSize = 280;
    canvas.width = containerSize;
    canvas.height = containerSize;

    // Clear canvas
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, containerSize, containerSize);

    // Save context state
    ctx.save();

    // Move to center, rotate, then draw
    ctx.translate(containerSize / 2, containerSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-containerSize / 2, -containerSize / 2);

    // Draw image with current scale and offset
    ctx.drawImage(
      image,
      offset.x,
      offset.y,
      image.width * scale,
      image.height * scale
    );

    // Restore context
    ctx.restore();

    // Draw crop guide overlay
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(40, 40, 200, 200);

    // Darken areas outside crop
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, containerSize, 40); // Top
    ctx.fillRect(0, 240, containerSize, 40); // Bottom
    ctx.fillRect(0, 40, 40, 200); // Left
    ctx.fillRect(240, 40, 40, 200); // Right
  }, [image, scale, offset, rotation]);

  // Handle mouse events for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
  }, [offset]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(s * 1.2, 5));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(s / 1.2, 0.2));
  }, []);

  const rotate = useCallback(() => {
    setRotation((r) => (r + 90) % 360);
  }, []);

  // Crop and export
  const handleCrop = useCallback(() => {
    if (!image) return;

    setProcessing(true);

    // Create output canvas
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = OUTPUT_SIZE;
    outputCanvas.height = OUTPUT_SIZE;
    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;

    // Fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    // Calculate crop area in source coordinates
    const containerSize = 280;
    const cropSize = 200;
    const cropX = 40;
    const cropY = 40;

    // Scale factor from preview to output
    const outputScale = OUTPUT_SIZE / cropSize;

    // Apply rotation
    ctx.save();
    ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-OUTPUT_SIZE / 2, -OUTPUT_SIZE / 2);

    // Draw the cropped portion
    ctx.drawImage(
      image,
      (offset.x - cropX) * outputScale,
      (offset.y - cropY) * outputScale,
      image.width * scale * outputScale,
      image.height * scale * outputScale
    );

    ctx.restore();

    // Convert to JPEG data URL
    const dataUrl = outputCanvas.toDataURL('image/jpeg', 0.85);

    setProcessing(false);
    onCrop(dataUrl);
  }, [image, scale, offset, rotation, onCrop]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-warm-900 rounded-xl shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-warm-200 dark:border-warm-700">
          <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-100">
            {t.cropImage || 'Crop Image'}
          </h2>
          <Button variant="ghost" size="icon-sm" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Canvas container */}
          <div
            className="relative mx-auto bg-warm-100 dark:bg-warm-800 rounded-lg overflow-hidden"
            style={{ width: 280, height: 280 }}
          >
            <canvas
              ref={canvasRef}
              width={280}
              height={280}
              className="cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <Button variant="outline" size="icon-sm" onClick={zoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <input
              type="range"
              min="0.2"
              max="3"
              step="0.1"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-32"
            />
            <Button variant="outline" size="icon-sm" onClick={zoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={rotate}>
              <RotateCw className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-center text-sm text-warm-500 mt-2">
            {t.cropDragHint || 'Drag to position, scroll to zoom'}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-warm-200 dark:border-warm-700">
          <Button variant="outline" onClick={onCancel} disabled={processing}>
            {t.cancel || 'Cancel'}
          </Button>
          <Button onClick={handleCrop} disabled={processing || !image}>
            {processing ? (t.processing || 'Processing...') : (t.crop || 'Crop')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ImageCropModal;
