package com.codealfa.chatbot.ml;

import java.util.List;

/**
 * Represents a single training sample for the intent classifier.
 */
public class TrainingSample {

    private final String intentTag;
    private final String rawText;
    private final List<String> tokens;
    private double[] vector;

    public TrainingSample(String intentTag, String rawText, List<String> tokens) {
        this.intentTag = intentTag;
        this.rawText = rawText;
        this.tokens = tokens;
    }

    public String getIntentTag() {
        return intentTag;
    }

    public String getRawText() {
        return rawText;
    }

    public List<String> getTokens() {
        return tokens;
    }

    public double[] getVector() {
        return vector;
    }

    public void setVector(double[] vector) {
        this.vector = vector;
    }
}
