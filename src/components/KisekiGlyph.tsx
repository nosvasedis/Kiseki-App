import { PALETTE, type Category, type Color } from '../lib/models';
import { Icon } from './Icon';
export function KisekiGlyph({
  color,
  category,
  size = 72,
  lit = false,
}: {
  color: Color;
  category: Category;
  size?: number;
  lit?: boolean;
}) {
  return (
    <span
      className={`kiseki-glyph kiseki-glyph-${category}${lit ? ' is-lit' : ''}`}
      style={{ color: PALETTE[color], width: size, height: size }}
      aria-hidden="true"
    >
      <span className="kiseki-glyph-star" />
      <Icon name={category} size={Math.round(size * 0.34)} />
    </span>
  );
}
