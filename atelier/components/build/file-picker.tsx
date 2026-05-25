'use client';

import { useCallback, useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type UploadedImage = {
  url: string;
  contentType: string;
  path: string;
  sizeBytes: number;
};

type Props = {
  peekId: string;
  onUpload: (image: UploadedImage) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  className?: string;
  buttonLabel?: string;
};

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif';

export function FilePicker({
  peekId,
  onUpload,
  onError,
  disabled = false,
  className,
  buttonLabel = 'Add image',
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPicker = useCallback(() => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  }, [disabled, uploading]);

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;

      setError(null);
      setUploading(true);
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(
          `/api/upload?peekId=${encodeURIComponent(peekId)}`,
          {
            method: 'POST',
            body: form,
          },
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as
            | { error?: string; message?: string }
            | null;
          const message =
            body?.message ??
            body?.error ??
            `upload failed (${res.status})`;
          setError(message);
          onError?.(message);
          return;
        }
        const data = (await res.json()) as UploadedImage;
        onUpload(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'network error';
        setError(message);
        onError?.(message);
      } finally {
        setUploading(false);
      }
    },
    [onError, onUpload, peekId],
  );

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={openPicker}
        disabled={disabled || uploading}
        className="text-muted-foreground"
      >
        {uploading ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="mr-1.5 h-4 w-4" />
        )}
        {uploading ? 'Uploading…' : buttonLabel}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleChange}
      />
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
