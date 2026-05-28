/**
 * Typed accessor over the renderer CSS module.
 * =============================================
 *
 * The project's tsconfig has `noPropertyAccessFromIndexSignature`, and the
 * default CSS-module declaration types every class as an index signature
 * (`{ [k: string]: string }`), which forbids dotted access. Rather than
 * bracket-notate dozens of call sites, we declare the exact class names once
 * here as a typed record so `s.heroTitle` is a known property.
 *
 * This is also a single source of truth for the class names the renderer
 * relies on — if a class is renamed in the module, this list is where the
 * mismatch surfaces.
 */

import rawStyles from './renderer.module.css';

export type RendererClass =
  | 'page'
  | 'headingDisplay'
  | 'eyebrow'
  | 'bodyText'
  | 'hero'
  | 'heroInner'
  | 'heroTitle'
  | 'heroMedia'
  | 'heroScrim'
  | 'section'
  | 'sectionHeading'
  | 'storyBody'
  | 'story'
  | 'storyMedia'
  | 'timelineBeat'
  | 'timelineDot'
  | 'cardSet'
  | 'cardList'
  | 'card'
  | 'cardMedia'
  | 'cardBody'
  | 'cardTitle'
  | 'cardPrice'
  | 'cardCaption'
  | 'cardTag'
  | 'cta'
  | 'button'
  | 'buttonLink'
  | 'divider'
  | 'footer';

/**
 * The class-name map, typed so dotted access passes the linter.
 *
 * In Next, `rawStyles` is the bundler-hashed map. Outside a bundler (the SSR
 * proof script, run under tsx with no CSS loader) the import yields no usable
 * map, so we fall back to an IDENTITY proxy (`s.heroTitle` → "heroTitle"). The
 * raw CSS — which uses plain `.heroTitle` selectors — is inlined into the proof
 * HTML, so identity class names line up exactly. Next is unaffected (its
 * `rawStyles` is truthy and wins).
 */
const identity = new Proxy(
  {},
  { get: (_t, prop) => (typeof prop === 'string' ? prop : '') },
) as Record<RendererClass, string>;

const resolved =
  rawStyles && typeof rawStyles === 'object' && 'page' in rawStyles
    ? (rawStyles as Record<RendererClass, string>)
    : identity;

export const s = resolved;
