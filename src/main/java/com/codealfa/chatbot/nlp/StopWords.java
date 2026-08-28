package com.codealfa.chatbot.nlp;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Provides standard English stop words filtering while preserving question words and important domain keywords.
 */
public class StopWords {

    private static final Set<String> STOP_WORDS = new HashSet<>(Arrays.asList(
            "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
            "any", "are", "as", "at", "be", "because", "been", "before", "being", "below",
            "between", "both", "but", "by", "could", "did", "do", "does", "doing", "down",
            "during", "each", "few", "for", "from", "further", "had", "has", "have", "having",
            "he", "her", "here", "hers", "herself", "him", "himself", "his", "i", "if",
            "in", "into", "is", "it", "its", "itself", "just", "me", "more", "most", "my",
            "myself", "no", "nor", "not", "now", "of", "off", "on", "once", "only", "or",
            "other", "our", "ours", "ourselves", "out", "over", "own", "s", "same", "she",
            "should", "so", "some", "such", "t", "than", "that", "the", "their", "theirs",
            "them", "themselves", "then", "there", "these", "they", "this", "those", "through",
            "to", "too", "under", "until", "up", "very", "was", "we", "were", "with", "you",
            "your", "yours", "yourself", "yourselves"
    ));

    /**
     * Checks if a word is a stop word.
     */
    public static boolean isStopWord(String word) {
        if (word == null) return false;
        return STOP_WORDS.contains(word.toLowerCase().trim());
    }

    /**
     * Filters out stop words from a token list.
     */
    public static List<String> filter(List<String> tokens) {
        if (tokens == null) return Collections.emptyList();
        return tokens.stream()
                .filter(token -> !isStopWord(token))
                .collect(Collectors.toList());
    }

    /**
     * Returns an unmodifiable set of stop words.
     */
    public static Set<String> getStopWords() {
        return Collections.unmodifiableSet(STOP_WORDS);
    }
}
