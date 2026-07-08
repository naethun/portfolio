export function claimBoundSearch(searchedBoundIds, boundId) {
  if (!searchedBoundIds || !boundId || searchedBoundIds.has(boundId)) {
    return false;
  }
  searchedBoundIds.add(boundId);
  return true;
}
