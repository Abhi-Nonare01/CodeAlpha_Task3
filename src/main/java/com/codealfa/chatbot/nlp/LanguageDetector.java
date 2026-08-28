package com.codealfa.chatbot.nlp;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Detects languages (English, Hindi, Hinglish, Spanish, French) and handles multilingual adaptations.
 */
public class LanguageDetector {

    public enum Language {
        ENGLISH("en", "English"),
        HINDI("hi", "हिंदी"),
        HINGLISH("hinglish", "Hinglish"),
        SPANISH("es", "Español"),
        FRENCH("fr", "Français");

        private final String code;
        private final String displayName;

        Language(String code, String displayName) {
            this.code = code;
            this.displayName = displayName;
        }

        public String getCode() {
            return code;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    // Common Hinglish marker words
    private static final Set<String> HINGLISH_KEYWORDS = new HashSet<>(Arrays.asList(
            "kya", "hai", "kaise", "karo", "batao", "mujhe", "tum", "aap", "kaun", "ho", "kaha",
            "kab", "kyu", "kyun", "chahiye", "karna", "samjhao", "shukriya", "dhanyawad", "namaste",
            "accha", "theek", "bolo", "sikhao", "samajh", "aaya", "mera", "naam", "bhi", "aur",
            "lekin", "wali", "wala", "wale", "kuch", "sab", "yeh", "woh", "kitna", "samay", "waqt"
    ));

    private static final Pattern DEVANAGARI_PATTERN = Pattern.compile("[\\u0900-\\u097F]");

    /**
     * Detects the language of a user input string.
     */
    public static Language detect(String text) {
        if (text == null || text.isBlank()) {
            return Language.ENGLISH;
        }

        String trimmed = text.trim();
        String lower = trimmed.toLowerCase();

        // Check for explicit Hindi / Hinglish query commands
        if (lower.contains("in hindi") || lower.contains("hindi me") || lower.contains("hindi please") || lower.equals("hindi") || lower.equals("हिंदी")) {
            return Language.HINDI;
        }
        if (lower.contains("in hinglish") || lower.contains("hinglish me") || lower.equals("hinglish")) {
            return Language.HINGLISH;
        }

        // 1. Check for Devanagari script (Pure Hindi)
        if (DEVANAGARI_PATTERN.matcher(trimmed).find()) {
            return Language.HINDI;
        }

        // 2. Check for Hinglish words
        List<String> words = Arrays.asList(lower.split("\\s+"));
        int hinglishCount = 0;
        for (String w : words) {
            String clean = w.replaceAll("[^a-zA-Z]", "");
            if (HINGLISH_KEYWORDS.contains(clean)) {
                hinglishCount++;
            }
        }

        if (hinglishCount >= 1 || (words.size() <= 4 && hinglishCount > 0)) {
            return Language.HINGLISH;
        }

        // 3. Spanish markers
        if (lower.startsWith("hola") || lower.startsWith("cómo") || lower.startsWith("que es") || lower.contains("por favor") || lower.contains("gracias")) {
            return Language.SPANISH;
        }

        // 4. French markers
        if (lower.startsWith("bonjour") || lower.startsWith("salut") || lower.contains("qu'est-ce") || lower.contains("merci")) {
            return Language.FRENCH;
        }

        return Language.ENGLISH;
    }
}
