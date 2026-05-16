'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value?: string[];
  onChange: (value: string[]) => void;
  maxImages?: number;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
}

export function ImageUpload({
  value = [],
  onChange,
  maxImages = 10,
  maxSize = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
}: ImageUploadProps) {
  const [uploading, setUploading] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (value.length + acceptedFiles.length > maxImages) {
        setErrors({ general: `Maximum ${maxImages} images allowed` });
        return;
      }

      setErrors({});
      const newImages: string[] = [...value];

      for (const file of acceptedFiles) {
        if (file.size > maxSize) {
          setErrors((prev) => ({
            ...prev,
            [file.name]: `File size exceeds ${maxSize / 1024 / 1024}MB`,
          }));
          continue;
        }

        if (!acceptedTypes.includes(file.type)) {
          setErrors((prev) => ({
            ...prev,
            [file.name]: `File type not allowed. Allowed: ${acceptedTypes.join(', ')}`,
          }));
          continue;
        }

        // Upload file to Payload media endpoint
        const formData = new FormData();
        formData.append('file', file);

        try {
          setUploading((prev) => [...prev, file.name]);
          const response = await fetch('/api/media', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });

          let payloadUnknown: unknown;
          try {
            payloadUnknown = await response.json();
          } catch {
            payloadUnknown = null;
          }

          if (!response.ok) {
            const errMsg =
              payloadUnknown &&
              typeof payloadUnknown === 'object' &&
              'error' in payloadUnknown &&
              typeof (payloadUnknown as { error: unknown }).error === 'string' ?
                (payloadUnknown as { error: string }).error
              : `Upload failed (${response.status})`;
            throw new Error(errMsg);
          }

          const data = payloadUnknown as { doc?: { id?: unknown } } | null;
          const rawId = data?.doc?.id;
          const newId =
            rawId !== undefined && rawId !== null ? String(rawId) : '';
          if (newId) {
            newImages.push(newId);
            onChange([...newImages]);
          } else if (!payloadUnknown ||
              !(typeof payloadUnknown === 'object' && 'doc' in payloadUnknown)) {
            throw new Error('Unexpected response from upload');
          }
        } catch (error: unknown) {
          const msg =
            error instanceof Error ?
              error.message
            : 'Upload failed. Please try again.';
          setErrors((prev) => ({
            ...prev,
            [file.name]: msg,
          }));
        } finally {
          setUploading((prev) => prev.filter((name) => name !== file.name));
        }
      }
    },
    [value, onChange, maxImages, maxSize, acceptedTypes]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize,
    multiple: true,
    disabled: value.length >= maxImages || uploading.length > 0,
  });

  const removeImage = (index: number) => {
    const newImages = value.filter((_, i) => i !== index);
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 hover:border-gray-400',
          value.length >= maxImages && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-sm text-gray-600">Drop images here...</p>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Drag & drop images here, or click to select
            </p>
            <p className="text-xs text-gray-500">
              {acceptedTypes.join(', ')} up to {maxSize / 1024 / 1024}MB each
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Maximum {maxImages} images ({value.length}/{maxImages} used)
            </p>
          </div>
        )}
      </div>

      {errors.general && (
        <p className="text-sm text-red-600">{errors.general}</p>
      )}

      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {value.map((imageId, index) => (
            <div key={imageId} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100">
                <img
                  src={`/api/media/url/${encodeURIComponent(imageId)}`}
                  alt={`Product image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              {uploading.includes(imageId) ? (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                </div>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {Object.entries(errors)
        .filter(([key]) => key !== 'general')
        .map(([fileName, error]) => (
          <p key={fileName} className="text-sm text-red-600">
            {fileName}: {error}
          </p>
        ))}
    </div>
  );
}
