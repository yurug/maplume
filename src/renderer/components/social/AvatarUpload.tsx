/**
 * AvatarUpload - Photo selection and upload component
 */

import React, { useState, useCallback } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Button } from '../ui/button';
import { ImageCropModal } from './ImageCropModal';

interface AvatarUploadProps {
  currentImage?: string | null;
  onUpload: (imageData: string) => Promise<void>;
  onCancel: () => void;
  isOnline: boolean;
}

export function AvatarUpload({ currentImage, onUpload, onCancel, isOnline }: AvatarUploadProps) {
  const { t } = useI18n();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectImage = useCallback(async () => {
    if (!isOnline) {
      setError(t.uploadRequiresOnline || 'Upload requires an internet connection');
      return;
    }

    try {
      setError(null);
      const imagePath = await window.electronAPI.selectAvatarImage();

      if (!imagePath) {
        return; // User cancelled
      }

      // Read the file and convert to data URL
      const response = await fetch(`file://${imagePath}`);
      const blob = await response.blob();

      // Check file size (max 5MB before crop)
      if (blob.size > 5 * 1024 * 1024) {
        setError(t.imageTooLarge || 'Image is too large (max 5MB)');
        return;
      }

      // Check file type
      if (!blob.type.startsWith('image/')) {
        setError(t.invalidImageType || 'Please select a valid image file');
        return;
      }

      // Convert to data URL
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setShowCropModal(true);
      };
      reader.onerror = () => {
        setError(t.failedToReadImage || 'Failed to read image file');
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Failed to select image:', err);
      setError(t.failedToSelectImage || 'Failed to select image');
    }
  }, [isOnline, t]);

  const handleCrop = useCallback(async (croppedImage: string) => {
    setShowCropModal(false);
    setUploading(true);
    setError(null);

    try {
      await onUpload(croppedImage);
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      setError(t.failedToUploadAvatar || 'Failed to upload avatar');
      setUploading(false);
    }
  }, [onUpload, t]);

  const handleCancelCrop = useCallback(() => {
    setShowCropModal(false);
    setSelectedImage(null);
  }, []);

  return (
    <div className="flex flex-col items-center py-6">
      {/* Current preview */}
      {currentImage && (
        <div className="mb-6">
          <div className="w-24 h-24 rounded-full overflow-hidden shadow-lg border-2 border-warm-200 dark:border-warm-700">
            <img
              src={currentImage}
              alt="Current avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-center text-sm text-warm-500 mt-2">
            {t.currentPhoto || 'Current photo'}
          </p>
        </div>
      )}

      {/* Upload button */}
      <Button
        variant="outline"
        onClick={handleSelectImage}
        disabled={uploading || !isOnline}
        className="flex items-center gap-2"
      >
        <Upload className="w-4 h-4" />
        {currentImage
          ? (t.changePhoto || 'Change Photo')
          : (t.uploadPhoto || 'Upload Photo')}
      </Button>

      {/* Offline warning */}
      {!isOnline && (
        <div className="flex items-center gap-2 mt-4 text-sm text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-4 h-4" />
          <span>{t.uploadRequiresOnline || 'Upload requires an internet connection'}</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 mt-4 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="mt-4 text-sm text-warm-500">
          {t.uploading || 'Uploading...'}
        </div>
      )}

      {/* Hint */}
      <p className="text-center text-sm text-warm-500 mt-4 max-w-xs">
        {t.uploadPhotoHint || 'Select a JPG or PNG image. You can crop it after selection.'}
      </p>

      {/* Actions */}
      <div className="flex justify-end gap-3 w-full mt-6 pt-4 border-t border-warm-200 dark:border-warm-700">
        <Button variant="outline" onClick={onCancel} disabled={uploading}>
          {t.cancel || 'Cancel'}
        </Button>
      </div>

      {/* Crop modal */}
      {showCropModal && selectedImage && (
        <ImageCropModal
          imageSrc={selectedImage}
          onCrop={handleCrop}
          onCancel={handleCancelCrop}
        />
      )}
    </div>
  );
}

export default AvatarUpload;
