type Props = {
  size?: number;
  className?: string;
  title?: string;
};

/**
 * Tiny "plechovka" glyph — the literal "plech" in ChciPlech.
 * Uses currentColor for the can body so it can be re-tinted inline.
 */
export function CanGlyph({ size = 14, className, title }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size * 1.45}
      viewBox="0 0 24 36"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      className={className}
    >
      {title && <title>{title}</title>}
      {/* body */}
      <rect x="2" y="3" width="20" height="30" rx="2" fill="currentColor" />
      {/* top cap */}
      <ellipse cx="12" cy="3" rx="10" ry="2" fill="var(--ink, #181512)" />
      {/* ring pull */}
      <circle
        cx="12"
        cy="2.5"
        r="1.4"
        fill="var(--paper-light, #f8f3e3)"
        stroke="var(--ink, #181512)"
        strokeWidth="0.6"
      />
      {/* label */}
      <rect x="2" y="14" width="20" height="6.5" fill="var(--paper-light, #f8f3e3)" />
      {/* highlight */}
      <rect x="4" y="6" width="1.1" height="24" rx="0.55" fill="var(--paper-light, #f8f3e3)" opacity="0.55" />
      {/* bottom rim */}
      <ellipse cx="12" cy="33" rx="10" ry="1.6" fill="var(--ember-deep, #a32f10)" opacity="0.85" />
    </svg>
  );
}
