'use client';

export default function PreviewPane() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
      <div className="max-w-md">
        <div className="text-5xl mb-4 opacity-30">✻</div>
        <h2 className="font-display text-3xl text-white/80 mb-3">Your gift page builds here.</h2>
        <p className="text-white/40 text-sm leading-relaxed">
          As you chat with Peek, the hero, item cards, and rules will appear on this side. It's the
          same page your recipient will see — preview-live as you build.
        </p>
      </div>
    </div>
  );
}
