package com.codealfa.chatbot.nlp;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Text preprocessing pipeline:
 * 1. Normalization & contraction expansion
 * 2. Tokenization
 * 3. Stop words removal (optional/configurable)
 * 4. Stemming via Porter Stemmer
 */
public class TextPreprocessor {

    private final PorterStemmer stemmer;
    private final boolean removeStopWords;

    public TextPreprocessor() {
        this(true);
    }

    public TextPreprocessor(boolean removeStopWords) {
        this.stemmer = new PorterStemmer();
        this.removeStopWords = removeStopWords;
    }

    /**
     * Preprocesses input string into a list of cleaned, stemmed tokens.
     */
    public List<String> preprocess(String text) {
        if (text == null || text.isBlank()) {
            return Collections.emptyList();
        }

        List<String> tokens = Tokenizer.tokenize(text);

        if (removeStopWords) {
            tokens = StopWords.filter(tokens);
        }

        return tokens.stream()
                .map(stemmer::stemWord)
                .filter(token -> !token.isBlank())
                .collect(Collectors.toList());
    }

    /**
     * Preprocesses input string and joins tokens back into a space-separated normalized string.
     */
    public String preprocessToString(String text) {
        List<String> tokens = preprocess(text);
        return String.join(" ", tokens);
    }
}
