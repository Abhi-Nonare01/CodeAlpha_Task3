package com.codealfa.chatbot.ml;

import java.util.Collections;
import java.util.List;

/**
 * Result returned by the Intent Classifier.
 */
public class ClassificationResult {

    public static class ScoredIntent implements Comparable<ScoredIntent> {
        private final String intentTag;
        private final double score;

        public ScoredIntent(String intentTag, double score) {
            this.intentTag = intentTag;
            this.score = score;
        }

        public String getIntentTag() {
            return intentTag;
        }

        public double getScore() {
            return score;
        }

        @Override
        public int compareTo(ScoredIntent o) {
            return Double.compare(o.score, this.score); // descending
        }
    }

    private final String topIntentTag;
    private final double confidence;
    private final String matchedPattern;
    private final List<ScoredIntent> candidateScores;
    private final boolean isConfident;

    public ClassificationResult(String topIntentTag, double confidence, String matchedPattern,
                                List<ScoredIntent> candidateScores, boolean isConfident) {
        this.topIntentTag = topIntentTag;
        this.confidence = confidence;
        this.matchedPattern = matchedPattern;
        this.candidateScores = candidateScores != null ? candidateScores : Collections.emptyList();
        this.isConfident = isConfident;
    }

    public static ClassificationResult fallback(String fallbackTag) {
        return new ClassificationResult(fallbackTag, 0.0, "", Collections.emptyList(), false);
    }

    public String getTopIntentTag() {
        return topIntentTag;
    }

    public double getConfidence() {
        return confidence;
    }

    public String getMatchedPattern() {
        return matchedPattern;
    }

    public List<ScoredIntent> getCandidateScores() {
        return candidateScores;
    }

    public boolean isConfident() {
        return isConfident;
    }

    @Override
    public String toString() {
        return String.format("ClassificationResult{intent='%s', confidence=%.4f, confident=%s}",
                topIntentTag, confidence, isConfident);
    }
}
