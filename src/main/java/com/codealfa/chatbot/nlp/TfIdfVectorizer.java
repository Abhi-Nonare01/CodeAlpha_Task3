package com.codealfa.chatbot.nlp;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * TF-IDF Vectorizer for converting text documents into numerical feature vectors.
 * Implements smooth IDF weighting and L2 vector normalization.
 */
public class TfIdfVectorizer {

    private final Map<String, Integer> vocabulary;
    private final Map<String, Double> idfScores;
    private int totalDocuments;
    private boolean isFitted;

    public TfIdfVectorizer() {
        this.vocabulary = new HashMap<>();
        this.idfScores = new HashMap<>();
        this.totalDocuments = 0;
        this.isFitted = false;
    }

    /**
     * Fits the vectorizer on a corpus of preprocessed token lists.
     * Computes the global vocabulary and IDF values.
     */
    public synchronized void fit(List<List<String>> corpus) {
        vocabulary.clear();
        idfScores.clear();
        totalDocuments = corpus.size();

        if (totalDocuments == 0) {
            isFitted = true;
            return;
        }

        // 1. Calculate document frequency for each term
        Map<String, Integer> docFrequency = new HashMap<>();
        for (List<String> doc : corpus) {
            Set<String> uniqueTerms = new HashSet<>(doc);
            for (String term : uniqueTerms) {
                docFrequency.put(term, docFrequency.getOrDefault(term, 0) + 1);
            }
        }

        // 2. Build vocabulary index & compute smooth IDF: log((1 + N) / (1 + df)) + 1
        int index = 0;
        for (Map.Entry<String, Integer> entry : docFrequency.entrySet()) {
            String term = entry.getKey();
            int df = entry.getValue();
            vocabulary.put(term, index++);

            double idf = Math.log((1.0 + totalDocuments) / (1.0 + df)) + 1.0;
            idfScores.put(term, idf);
        }

        isFitted = true;
    }

    /**
     * Transforms a preprocessed token list into a dense TF-IDF vector with L2 normalization.
     */
    public double[] transform(List<String> tokens) {
        if (!isFitted) {
            throw new IllegalStateException("TfIdfVectorizer must be fitted before transforming text.");
        }

        int vocabSize = vocabulary.size();
        double[] vector = new double[vocabSize];

        if (tokens == null || tokens.isEmpty() || vocabSize == 0) {
            return vector;
        }

        // 1. Compute term frequencies (TF)
        Map<String, Integer> termCounts = new HashMap<>();
        for (String token : tokens) {
            termCounts.put(token, termCounts.getOrDefault(token, 0) + 1);
        }

        int docLength = tokens.size();

        // 2. Compute TF-IDF weights: (count / docLength) * IDF
        for (Map.Entry<String, Integer> entry : termCounts.entrySet()) {
            String term = entry.getKey();
            Integer vocabIndex = vocabulary.get(term);
            if (vocabIndex != null) {
                double tf = (double) entry.getValue() / docLength;
                double idf = idfScores.getOrDefault(term, 0.0);
                vector[vocabIndex] = tf * idf;
            }
        }

        // 3. L2 normalize vector
        return normalizeL2(vector);
    }

    /**
     * Applies L2 normalization (Euclidean norm) to a vector.
     */
    public static double[] normalizeL2(double[] vector) {
        double sumSquares = 0.0;
        for (double v : vector) {
            sumSquares += v * v;
        }

        if (sumSquares > 0.0) {
            double norm = Math.sqrt(sumSquares);
            for (int i = 0; i < vector.length; i++) {
                vector[i] /= norm;
            }
        }
        return vector;
    }

    public int getVocabularySize() {
        return vocabulary.size();
    }

    public Map<String, Integer> getVocabulary() {
        return Collections.unmodifiableMap(vocabulary);
    }

    public boolean isFitted() {
        return isFitted;
    }
}
