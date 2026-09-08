export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <use href={`/assets/kiseki/icons/kiseki-icons.svg#${name}`} />
    </svg>
  );
}
