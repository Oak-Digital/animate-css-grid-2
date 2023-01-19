export const arraylikeToArray = <T>(arrLike: ArrayLike<T>): T[] => {
  if (!arrLike) return [];
  return Array.prototype.slice.call(arrLike);
};
