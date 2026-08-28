package com.codealfa.chatbot.nlp;

/**
 * Utility for computing Cosine Similarity between numerical vectors.
 */
public class CosineSimilarity {

    /**
     * Computes the cosine similarity between two vectors: (A . B) / (||A|| * ||B||).
     * If vectors are already L2-normalized, this simplifies to the dot product.
     */
    public static double compute(double[] vecA, double[] vecB) {
        if (vecA == null || vecB == null || vecA.length == 0 || vecA.length != vecB.length) {
            return 0.0;
        }

        double dotProduct = 0.0;
        double normA = 0.0;
        double normB = 0.0;

        for (int i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        if (normA == 0.0 || normB == 0.0) {
            return 0.0;
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Dot product for pre-normalized vectors.
     */
    public static double dotProduct(double[] vecA, double[] vecB) {
        if (vecA == null || vecB == null || vecA.length == 0 || vecA.length != vecB.length) {
            return 0.0;
        }

        double dot = 0.0;
        for (int i = 0; i < vecA.length; i++) {
            dot += vecA[i] * vecB[i];
        }
        return dot;
    }
}
