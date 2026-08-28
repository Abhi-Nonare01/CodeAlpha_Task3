package com.codealfa.chatbot.nlp;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Handles text tokenization, normalization, contraction expansion, and punctuation removal.
 */
public class Tokenizer {

    private static final Map<String, String> CONTRACTIONS = new HashMap<>();
    private static final Pattern WORD_PATTERN = Pattern.compile("[a-zA-Z0-9]+");

    static {
        CONTRACTIONS.put("i'm", "i am");
        CONTRACTIONS.put("you're", "you are");
        CONTRACTIONS.put("he's", "he is");
        CONTRACTIONS.put("she's", "she is");
        CONTRACTIONS.put("it's", "it is");
        CONTRACTIONS.put("we're", "we are");
        CONTRACTIONS.put("they're", "they are");
        CONTRACTIONS.put("i've", "i have");
        CONTRACTIONS.put("you've", "you have");
        CONTRACTIONS.put("we've", "we have");
        CONTRACTIONS.put("they've", "they have");
        CONTRACTIONS.put("i'll", "i will");
        CONTRACTIONS.put("you'll", "you will");
        CONTRACTIONS.put("he'll", "he will");
        CONTRACTIONS.put("she'll", "she will");
        CONTRACTIONS.put("we'll", "we will");
        CONTRACTIONS.put("they'll", "they will");
        CONTRACTIONS.put("i'd", "i would");
        CONTRACTIONS.put("you'd", "you would");
        CONTRACTIONS.put("he'd", "he would");
        CONTRACTIONS.put("she'd", "she would");
        CONTRACTIONS.put("we'd", "we would");
        CONTRACTIONS.put("they'd", "they would");
        CONTRACTIONS.put("can't", "can not");
        CONTRACTIONS.put("cannot", "can not");
        CONTRACTIONS.put("won't", "will not");
        CONTRACTIONS.put("don't", "do not");
        CONTRACTIONS.put("doesn't", "does not");
        CONTRACTIONS.put("didn't", "did not");
        CONTRACTIONS.put("haven't", "have not");
        CONTRACTIONS.put("hasn't", "has not");
        CONTRACTIONS.put("hadn't", "had not");
        CONTRACTIONS.put("isn't", "is not");
        CONTRACTIONS.put("aren't", "are not");
        CONTRACTIONS.put("wasn't", "was not");
        CONTRACTIONS.put("weren't", "were not");
        CONTRACTIONS.put("what's", "what is");
        CONTRACTIONS.put("who's", "who is");
        CONTRACTIONS.put("where's", "where is");
        CONTRACTIONS.put("when's", "when is");
        CONTRACTIONS.put("how's", "how is");
        CONTRACTIONS.put("that's", "that is");
        CONTRACTIONS.put("there's", "there is");
        CONTRACTIONS.put("let's", "let us");
    }

    /**
     * Normalizes text by expanding contractions and converting to lowercase.
     */
    public static String normalize(String text) {
        if (text == null) return "";
        String normalized = text.toLowerCase().trim();
        for (Map.Entry<String, String> entry : CONTRACTIONS.entrySet()) {
            normalized = normalized.replaceAll("\\b" + Pattern.quote(entry.getKey()) + "\\b", entry.getValue());
        }
        return normalized;
    }

    /**
     * Splits text into normalized alphanumeric tokens.
     */
    public static List<String> tokenize(String text) {
        if (text == null || text.isBlank()) {
            return Collections.emptyList();
        }

        String normalized = normalize(text);
        List<String> tokens = new ArrayList<>();
        Matcher matcher = WORD_PATTERN.matcher(normalized);
        while (matcher.find()) {
            tokens.add(matcher.group());
        }
        return tokens;
    }
}
