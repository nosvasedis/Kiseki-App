export function BrandMark({ className = '', size = 44 }: { className?: string; size?: number }) {
  return (
    <img
      className={`brand-logo ${className}`.trim()}
      src="/assets/kiseki/brand/kiseki-logo.svg"
      alt=""
      width={size}
      height={size}
      draggable={false}
    />
  );
}
