import type { Language } from './models';
export const QUOTES: Record<Language, string[]> = {
  en: [
    'Even a quiet day holds a Kiseki.',
    'A little miracle is still a miracle.',
    'What you notice, you keep.',
    'The jar remembers what the rush forgets.',
    'Fold the small light. It is enough.',
    'Kindness to yourself is a Kiseki too.',
    'Tonight the sky is made of kept moments.',
    'Begin with one small, true thing.',
  ],
  el: [
    'Ακόμη και μια ήσυχη μέρα κρατά ένα Kiseki.',
    'Ένα μικρό θαύμα είναι πάλι θαύμα.',
    'Ό,τι προσέχεις, το φυλάς.',
    'Το βάζο θυμάται όσα η βιασύνη ξεχνά.',
    'Δίπλωσε το μικρό φως. Φτάνει.',
    'Η καλοσύνη στον εαυτό είναι κι αυτή ένα Kiseki.',
    'Απόψε ο ουρανός είναι φτιαγμένος από φυλαγμένες στιγμές.',
    'Ξεκίνα από ένα μικρό, αληθινό πράγμα.',
  ],
  ja: [
    '静かな一日にも、奇跡はある。',
    '小さな奇跡も、奇跡。',
    '気づいたものは、残せる。',
    '慌ただしさが忘れることを、瓶は覚えている。',
    '小さな光を折れば、それで足りる。',
    '自分への優しさも、奇跡。',
    '今夜の空は、残した瞬間でできている。',
    '小さくて、ほんとうのことから。',
  ],
};
export function loadingQuote(language: Language, now = Date.now()) {
  const list = QUOTES[language];
  return list[Math.abs(Math.floor(now)) % list.length];
}
