export function goToSlide(track: HTMLElement, index: number): void {
  const cards = Array.from(track.children) as HTMLElement[];
  if (!cards[index]) return;
  track.scrollTo({
    left: cards[index].offsetLeft - cards[0].offsetLeft,
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
  });
}
export function activeSlide(track: HTMLElement): number {
  const cards = Array.from(track.children) as HTMLElement[];
  return cards.reduce(
    (best, card, index) =>
      Math.abs(card.offsetLeft - cards[0].offsetLeft - track.scrollLeft) <
      Math.abs(cards[best].offsetLeft - cards[0].offsetLeft - track.scrollLeft)
        ? index
        : best,
    0,
  );
}
