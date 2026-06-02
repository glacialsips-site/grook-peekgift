// No Tailwind. Runtime theming is done with CSS custom properties (--peek-*), not a
// compile-time utility framework. An explicit empty plugin set stops any inherited
// Tailwind/PostCSS config from the legacy root app leaking into this build.
export default { plugins: {} };
