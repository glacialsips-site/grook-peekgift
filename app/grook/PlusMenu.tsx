'use client';

import { useEffect, useRef } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onFiles: (files: FileList | File[]) => void;
};

export default function PlusMenu({ open, onClose, onFiles }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const pick = (ref: React.RefObject<HTMLInputElement | null>) => {
    onClose();
    requestAnimationFrame(() => ref.current?.click());
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length) {
      onFiles(e.target.files);
    }
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInput}
        className="hidden"
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleInput}
        className="hidden"
      />
      <input ref={fileRef} type="file" multiple onChange={handleInput} className="hidden" />

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center md:items-center"
          onClick={onClose}
        >
          <div
            className="w-full md:w-[400px] bg-[#191919] border border-white/10 rounded-t-3xl md:rounded-3xl p-2 pb-[max(env(safe-area-inset-bottom),12px)] md:mb-0 mb-0 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto h-1 w-10 bg-white/15 rounded-full my-2 md:hidden" />
            <MenuRow
              icon="📷"
              label="Camera"
              sub="Take a photo"
              onClick={() => pick(cameraRef)}
            />
            <MenuRow
              icon="🖼️"
              label="Photo library"
              sub="Pick from your phone"
              onClick={() => pick(libraryRef)}
            />
            <MenuRow
              icon="📎"
              label="File"
              sub="Any file from your device"
              onClick={() => pick(fileRef)}
            />
            <button
              onClick={onClose}
              className="w-full mt-2 py-3 text-white/70 hover:text-white rounded-2xl hover:bg-white/5 transition text-[15px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function MenuRow({
  icon,
  label,
  sub,
  onClick,
}: {
  icon: string;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 active:bg-white/10 transition text-left"
    >
      <div className="h-11 w-11 rounded-xl bg-white/8 flex items-center justify-center text-xl">
        {icon}
      </div>
      <div>
        <div className="text-white text-[15px] font-medium">{label}</div>
        <div className="text-white/50 text-xs">{sub}</div>
      </div>
    </button>
  );
}
