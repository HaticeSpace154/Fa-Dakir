export const QURAN_RECITATIONS = [
  { id: 'warsh', name: 'ورش عن نافع — الخط المغربي', detail: 'المغربي المبسوط AALMAGHRIBI' },
  { id: 'warsh-normal', name: 'ورش عن نافع — الخط العادي', detail: 'خط أميري عادي' },
  { id: 'hafs', name: 'حفص عن عاصم', detail: 'مصحف المدينة' },
  { id: 'qalon', name: 'قالون عن نافع', detail: 'مصحف المدينة' },
  { id: 'douri', name: 'الدوري عن أبي عمرو', detail: 'مصحف المدينة' },
  { id: 'shubah', name: 'شعبة عن عاصم', detail: 'مصحف المدينة' },
  { id: 'bazzi', name: 'البزي عن ابن كثير', detail: 'قراءة نصية' },
  { id: 'soosi', name: 'السوسي عن أبي عمرو', detail: 'قراءة نصية' },
];

// Riwayas with published Mushaf page artwork (SVG). Riwayas outside this set render as flowing text only.
export const MUSHAF_PAGE_RECITATIONS = ['warsh-normal', 'hafs', 'qalon', 'douri', 'shubah'];

export function recitationSupportsMushafPages(recitation) {
  return MUSHAF_PAGE_RECITATIONS.includes(recitation);
}
