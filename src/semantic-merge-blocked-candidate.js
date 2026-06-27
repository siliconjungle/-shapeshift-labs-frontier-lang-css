function blockedMergeCandidate(input, mergedSourceText, hash) {
  if (input.includeBlockedMergeCandidate !== true && input.includeBlockedMergedSourceText !== true) return {};
  return {
    candidateMergedSourceText: mergedSourceText,
    candidateMergedSourceHash: hash?.(mergedSourceText),
    candidateOperation: 'semantic-declaration-merge',
    candidateAdmissionStatus: 'blocked'
  };
}

export { blockedMergeCandidate };
