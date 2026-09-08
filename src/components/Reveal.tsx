import { motion } from 'motion/react';
import { Heart, Trash2 } from 'lucide-react';
import { PALETTE, type Star } from '../lib/models';
import { fairytale } from '../lib/fx';
import { Icon } from './Icon';
import { Press } from './Press';

export function Reveal({
  star,
  title,
  remark,
  date,
  category,
  favoriteLabel,
  unfavoriteLabel,
  deleteLabel,
  reduced,
  leaving,
  onFavorite,
  onDelete,
}: {
  star: Star;
  title: string;
  remark: string;
  date: string;
  category: string;
  favoriteLabel: string;
  unfavoriteLabel: string;
  deleteLabel: string;
  reduced: boolean;
  leaving: boolean;
  onFavorite: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="reveal" style={{ ['--star' as string]: PALETTE[star.colorId] }}>
      <motion.div
        className="reveal-body"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: leaving ? 0 : 1 }}
        transition={{ duration: 0.36, ease: fairytale }}
      >
        <h2 id="dialog-title" className="reveal-title">
          {title}
        </h2>
        <p className="reveal-reminder">{remark}</p>
        <blockquote>{star.text}</blockquote>
        <p className="muted">{date}</p>
        <p className="category-tag">
          <Icon name={star.category} />
          {category}
        </p>
        <div className="reveal-actions">
          <Press className="button secondary" aria-pressed={star.isFavorite} onClick={onFavorite}>
            <Heart size={18} fill={star.isFavorite ? 'currentColor' : 'none'} />
            {star.isFavorite ? unfavoriteLabel : favoriteLabel}
          </Press>
          <Press className="text-button danger" onClick={onDelete}>
            <Trash2 size={17} />
            {deleteLabel}
          </Press>
        </div>
      </motion.div>
    </div>
  );
}
