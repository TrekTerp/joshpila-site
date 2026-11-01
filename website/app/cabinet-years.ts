import years from './cocktail-years.generated.json';

// The archive owns the year list; these are six reusable positions in the artwork.
export const GLASSES_PER_SHELF = 6;
export const GLASS_START = 640;
export const GLASS_SLOT = 47.5;
export const glassTextures = [
  { left:640, right:698, outline:'M645 407 L695 407 Q696 424 674 432 L673 461 Q674 465 687 466 L688 470 L652 470 L652 467 Q666 465 667 461 L667 432 Q644 426 645 407 Z' },
  { left:698, right:748, outline:'M706 425 L743 425 L743 466 Q741 470 724 470 Q708 470 706 466 Z' },
  { left:748, right:792, outline:'M754 402 L785 402 L785 465 Q784 471 769 471 Q755 471 754 466 Z' },
  { left:792, right:839, outline:'M797 411 L838 411 Q839 427 822 433 L821 461 Q822 465 833 466 L835 470 L801 470 L802 467 Q813 465 815 461 L815 433 Q797 427 797 411 Z' },
  { left:839, right:886, outline:'M849 397 L880 397 L880 464 Q879 470 864 470 Q850 470 849 465 Z' },
  { left:886, right:925, outline:'M894 419 L917 419 Q918 436 909 441 L909 461 Q910 465 917 466 L918 470 L893 470 L893 467 Q901 465 903 461 L903 441 Q894 437 894 419 Z' },
];
export const adventYears = [...years].sort((a,b) => a.year-b.year).map((entry,index) => ({...entry, left:GLASS_START+index*GLASS_SLOT, right:GLASS_START+(index+1)*GLASS_SLOT}));
export function cocktailArchiveHref(view: 'backstory' | 'calendar' | 'finder', year?: number) {
  return `/cocktails/index.html?view=${view}${year === undefined ? '' : `&year=${year}`}`;
}
