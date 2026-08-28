package com.codealfa.chatbot.ml;

import com.codealfa.chatbot.nlp.CosineSimilarity;
import com.codealfa.chatbot.nlp.TextPreprocessor;
import com.codealfa.chatbot.nlp.TfIdfVectorizer;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Machine Learning Intent Classifier using TF-IDF vector space modeling
 * and Cosine Similarity nearest-neighbor matching.
 */
public class IntentClassifier {

    private final TextPreprocessor preprocessor;
    private final TfIdfVectorizer vectorizer;
    private final List<TrainingSample> trainingSamples;
    private final Map<String, double[]> intentCentroids;
    private double confidenceThreshold;

    public IntentClassifier() {
        this(0.35);
    }

    public IntentClassifier(double confidenceThreshold) {
        this.preprocessor = new TextPreprocessor(true);
        this.vectorizer = new TfIdfVectorizer();
        this.trainingSamples = new ArrayList<>();
        this.intentCentroids = new HashMap<>();
        this.confidenceThreshold = confidenceThreshold;
    }

    /**
     * Trains the classifier on given raw samples (intentTag, text).
     */
    public synchronized void train(List<TrainingSample> samples) {
        this.trainingSamples.clear();
        this.intentCentroids.clear();

        if (samples == null || samples.isEmpty()) {
            return;
        }

        // 1. Preprocess and collect tokenized corpus
        List<List<String>> corpus = new ArrayList<>();
        for (TrainingSample sample : samples) {
            List<String> tokens = preprocessor.preprocess(sample.getRawText());
            // In case tokens were empty after stopword removal, fallback without stopword removal
            if (tokens.isEmpty()) {
                tokens = new TextPreprocessor(false).preprocess(sample.getRawText());
            }
            TrainingSample processed = new TrainingSample(sample.getIntentTag(), sample.getRawText(), tokens);
            this.trainingSamples.add(processed);
            corpus.add(tokens);
        }

        // 2. Fit TF-IDF Vectorizer
        vectorizer.fit(corpus);

        // 3. Compute TF-IDF vectors for all training samples
        for (TrainingSample sample : this.trainingSamples) {
            double[] vector = vectorizer.transform(sample.getTokens());
            sample.setVector(vector);
        }

        // 4. Compute Intent Centroids (mean vector per intent)
        Map<String, List<double[]>> vectorsByIntent = new HashMap<>();
        for (TrainingSample sample : this.trainingSamples) {
            vectorsByIntent.computeIfAbsent(sample.getIntentTag(), k -> new ArrayList<>())
                    .add(sample.getVector());
        }

        int vocabSize = vectorizer.getVocabularySize();
        for (Map.Entry<String, List<double[]>> entry : vectorsByIntent.entrySet()) {
            String intent = entry.getKey();
            List<double[]> list = entry.getValue();
            double[] centroid = new double[vocabSize];

            for (double[] v : list) {
                for (int i = 0; i < vocabSize; i++) {
                    centroid[i] += v[i];
                }
            }

            int count = list.size();
            for (int i = 0; i < vocabSize; i++) {
                centroid[i] /= count;
            }

            // Normalize centroid
            centroid = TfIdfVectorizer.normalizeL2(centroid);
            intentCentroids.put(intent, centroid);
        }
    }

    /**
     * Classifies a user query string and returns the top predicted intent and confidence.
     */
    public ClassificationResult predict(String userQuery) {
        if (!vectorizer.isFitted() || trainingSamples.isEmpty() || userQuery == null || userQuery.isBlank()) {
            return ClassificationResult.fallback("default_fallback");
        }

        // 1. Preprocess query
        List<String> queryTokens = preprocessor.preprocess(userQuery);
        if (queryTokens.isEmpty()) {
            queryTokens = new TextPreprocessor(false).preprocess(userQuery);
        }

        if (queryTokens.isEmpty()) {
            return ClassificationResult.fallback("default_fallback");
        }

        // 2. Transform to TF-IDF vector
        double[] queryVector = vectorizer.transform(queryTokens);

        // Check if query vector is zero (all words out of vocabulary)
        boolean hasNonZero = false;
        for (double v : queryVector) {
            if (v > 0.0) {
                hasNonZero = true;
                break;
            }
        }
        if (!hasNonZero) {
            return ClassificationResult.fallback("default_fallback");
        }

        // 3. Compute maximum pattern similarity and centroid similarity for each intent
        Map<String, Double> intentMaxSampleScore = new HashMap<>();
        Map<String, String> bestPatternPerIntent = new HashMap<>();

        for (TrainingSample sample : trainingSamples) {
            double similarity = CosineSimilarity.dotProduct(queryVector, sample.getVector());
            String intent = sample.getIntentTag();
            if (similarity > intentMaxSampleScore.getOrDefault(intent, 0.0)) {
                intentMaxSampleScore.put(intent, similarity);
                bestPatternPerIntent.put(intent, sample.getRawText());
            }
        }

        // 4. Combine pattern max similarity and centroid similarity: score = 0.7 * maxPattern + 0.3 * centroid
        Map<String, Double> finalIntentScores = new HashMap<>();
        for (Map.Entry<String, Double> entry : intentMaxSampleScore.entrySet()) {
            String intent = entry.getKey();
            double maxPatternSim = entry.getValue();
            double centroidSim = 0.0;
            double[] centroid = intentCentroids.get(intent);
            if (centroid != null) {
                centroidSim = CosineSimilarity.dotProduct(queryVector, centroid);
            }
            double combinedScore = (0.75 * maxPatternSim) + (0.25 * Math.max(0.0, centroidSim));
            finalIntentScores.put(intent, combinedScore);
        }

        // 5. Rank candidate intents
        List<ClassificationResult.ScoredIntent> ranked = finalIntentScores.entrySet().stream()
                .map(e -> new ClassificationResult.ScoredIntent(e.getKey(), e.getValue()))
                .sorted()
                .collect(Collectors.toList());

        if (ranked.isEmpty()) {
            return ClassificationResult.fallback("default_fallback");
        }

        ClassificationResult.ScoredIntent top = ranked.get(0);
        String bestPattern = bestPatternPerIntent.getOrDefault(top.getIntentTag(), "");
        boolean isConfident = top.getScore() >= confidenceThreshold;

        return new ClassificationResult(
                top.getIntentTag(),
                top.getScore(),
                bestPattern,
                ranked,
                isConfident
        );
    }

    public double getConfidenceThreshold() {
        return confidenceThreshold;
    }

    public void setConfidenceThreshold(double confidenceThreshold) {
        this.confidenceThreshold = confidenceThreshold;
    }

    public int getTrainingSampleCount() {
        return trainingSamples.size();
    }

    public int getVocabularySize() {
        return vectorizer.getVocabularySize();
    }
}
