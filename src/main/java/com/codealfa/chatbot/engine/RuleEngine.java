package com.codealfa.chatbot.engine;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Rule Engine executing regex patterns, arithmetic evaluation,
 * date/time inquiries, memory commands, and system actions.
 */
public class RuleEngine {

    // Regex patterns for rule matching
    private static final Pattern NAME_SET_PATTERN = Pattern.compile(
            "^(?:my name is|i am called|call me|i am|this is)\\s+([a-zA-Z0-9_\\-\\s]{2,30})$",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern NAME_GET_PATTERN = Pattern.compile(
            ".*\\b(?:what is my name|who am i|do you know my name|do you remember me|my name)\\b.*",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern MATH_PATTERN = Pattern.compile(
            "^(?:calculate|calc|what is|compute|solve)?\\s*([0-9\\.\\+\\-\\*/\\%\\^\\(\\)\\s]{3,})$",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern TIME_PATTERN = Pattern.compile(
            ".*\\b(?:what time is it|current time|tell me the time|time now|what is the time)\\b.*",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern DATE_PATTERN = Pattern.compile(
            ".*\\b(?:what is the date|today's date|todays date|what day is it|current date|what date is today)\\b.*",
            Pattern.CASE_INSENSITIVE
    );

    /**
     * Evaluates rules against the user query. Returns Optional with response if matched, otherwise empty.
     */
    public Optional<String> evaluate(String query, ConversationContext context, KnowledgeBase kb) {
        if (query == null || query.isBlank()) {
            return Optional.empty();
        }

        String trimmed = query.trim();
        String lowerTrimmed = trimmed.toLowerCase();

        // Contextual Follow-up: Language Switch / Translation Request
        if (lowerTrimmed.equals("in hindi") || lowerTrimmed.equals("hindi me") || lowerTrimmed.equals("hindi me batao")
                || lowerTrimmed.equals("explain in hindi") || lowerTrimmed.equals("hindi") || lowerTrimmed.equals("हिंदी में")
                || lowerTrimmed.equals("hindi please")) {
            String lastTag = context.getLastIntentTag();
            if (lastTag != null && !lastTag.equals("fallback") && !lastTag.equals("greeting")) {
                return Optional.of(com.codealfa.chatbot.nlp.LanguageAdapter.adapt(lastTag, "यहाँ आपका जवाब हिंदी में है:", com.codealfa.chatbot.nlp.LanguageDetector.Language.HINDI));
            }
            return Optional.of("नमस्ते! आप मुझसे Java, AI, NLP, CodeAlfa या किसी भी विषय पर हिंदी में सवाल पूछ सकते हैं। मैं आपकी क्या सहायता करूँ?");
        }

        if (lowerTrimmed.equals("in hinglish") || lowerTrimmed.equals("hinglish me") || lowerTrimmed.equals("hinglish me batao")
                || lowerTrimmed.equals("explain in hinglish") || lowerTrimmed.equals("hinglish")) {
            String lastTag = context.getLastIntentTag();
            if (lastTag != null && !lastTag.equals("fallback") && !lastTag.equals("greeting")) {
                return Optional.of(com.codealfa.chatbot.nlp.LanguageAdapter.adapt(lastTag, "Ye raha aapka answer Hinglish me:", com.codealfa.chatbot.nlp.LanguageDetector.Language.HINGLISH));
            }
            return Optional.of("Namaste! Aap mujhse Java, AI, NLP, CodeAlfa ya kisi bhi topic par Hinglish me pooch sakte hain. Kya janna chahenge?");
        }

        if (lowerTrimmed.equals("in english") || lowerTrimmed.equals("english me") || lowerTrimmed.equals("english please")) {
            String lastTag = context.getLastIntentTag();
            if (lastTag != null && !lastTag.equals("fallback")) {
                Optional<Intent> intentOpt = kb.getIntentByTag(lastTag);
                if (intentOpt.isPresent() && !intentOpt.get().getResponses().isEmpty()) {
                    return Optional.of(intentOpt.get().getResponses().get(0));
                }
            }
            return Optional.of("Hello! I can answer questions in English, Hindi, and Hinglish. What would you like to explore today?");
        }

        // 1. Check for Name Assignment ("My name is Alex", "Call me Jordan")
        Matcher nameSetMatcher = NAME_SET_PATTERN.matcher(trimmed);
        if (nameSetMatcher.matches()) {
            String candidateName = nameSetMatcher.group(1).trim();
            // Filter out false positives like "i am happy", "i am fine", "i am good"
            String lower = candidateName.toLowerCase();
            if (!lower.equals("fine") && !lower.equals("good") && !lower.equals("happy")
                    && !lower.equals("here") && !lower.equals("tired") && !lower.equals("ok")
                    && !lower.equals("leaving") && !lower.equals("bored")) {
                context.setUserName(candidateName);
                return Optional.of(String.format("Nice to meet you, **%s**! 😊 I have saved your name. How can I help you today?", candidateName));
            }
        }

        // 2. Check for Name Query ("What is my name?")
        if (NAME_GET_PATTERN.matcher(trimmed).matches()) {
            String name = context.getUserName();
            if (name != null && !name.isBlank()) {
                return Optional.of(String.format("Your name is **%s**! How can I assist you, %s?", name, name));
            } else {
                return Optional.of("I don't know your name yet! You can tell me by typing: *My name is [Your Name]*.");
            }
        }

        // 3. Check for Date & Day queries
        if (DATE_PATTERN.matcher(trimmed).matches()) {
            LocalDate today = LocalDate.now();
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy", Locale.ENGLISH);
            return Optional.of(String.format("📅 Today is **%s**.", today.format(formatter)));
        }

        // 4. Check for Time queries
        if (TIME_PATTERN.matcher(trimmed).matches()) {
            LocalTime now = LocalTime.now();
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("hh:mm:ss a", Locale.ENGLISH);
            ZoneId zone = ZoneId.systemDefault();
            return Optional.of(String.format("🕒 The current time is **%s** (%s).", now.format(formatter), zone.getId()));
        }

        // 5. Check for Math / Calculation queries
        if (isMathExpression(trimmed)) {
            String expr = extractMathExpression(trimmed);
            try {
                double result = evaluateMath(expr);
                String formatted = (result == (long) result) ? String.format("%d", (long) result) : String.format("%.4f", result);
                return Optional.of(String.format("🧮 Result: `%s` = **%s**", expr.trim(), formatted));
            } catch (Exception ignored) {
                // Not a valid math expression, continue to ML classification
            }
        }

        // 6. Memory clear command
        if (trimmed.equalsIgnoreCase("clear memory") || trimmed.equalsIgnoreCase("forget me")) {
            context.clear();
            return Optional.of("🧹 I have cleared our session memory. Starting fresh!");
        }

        return Optional.empty();
    }

    private boolean isMathExpression(String text) {
        String lower = text.toLowerCase();
        if (lower.startsWith("calc ") || lower.startsWith("calculate ") || lower.startsWith("compute ") || lower.startsWith("solve ")) {
            return true;
        }
        // Expression containing arithmetic operators and digits
        return text.matches("^[0-9\\.\\+\\-\\*/\\%\\^\\(\\)\\s]{3,}$") &&
                (text.contains("+") || text.contains("-") || text.contains("*") || text.contains("/") || text.contains("%") || text.contains("^"));
    }

    private String extractMathExpression(String text) {
        return text.replaceAll("(?i)^(?:calculate|calc|what is|compute|solve)\\s*", "").replace("?", "").trim();
    }

    /**
     * Safe recursive descent parser for basic arithmetic expressions (+, -, *, /, %, ^, parentheses).
     */
    public static double evaluateMath(final String str) {
        return new Object() {
            int pos = -1, ch;

            void nextChar() {
                ch = (++pos < str.length()) ? str.charAt(pos) : -1;
            }

            boolean eat(int charToEat) {
                while (ch == ' ') nextChar();
                if (ch == charToEat) {
                    nextChar();
                    return true;
                }
                return false;
            }

            double parse() {
                nextChar();
                double x = parseExpression();
                if (pos < str.length()) throw new RuntimeException("Unexpected char: " + (char) ch);
                return x;
            }

            double parseExpression() {
                double x = parseTerm();
                for (;;) {
                    if (eat('+')) x += parseTerm();
                    else if (eat('-')) x -= parseTerm();
                    else return x;
                }
            }

            double parseTerm() {
                double x = parseFactor();
                for (;;) {
                    if (eat('*')) x *= parseFactor();
                    else if (eat('/')) {
                        double divisor = parseFactor();
                        if (divisor == 0) throw new ArithmeticException("Division by zero");
                        x /= divisor;
                    } else if (eat('%')) {
                        x %= parseFactor();
                    } else return x;
                }
            }

            double parseFactor() {
                if (eat('+')) return +parseFactor();
                if (eat('-')) return -parseFactor();

                double x;
                int startPos = this.pos;
                if (eat('(')) {
                    x = parseExpression();
                    if (!eat(')')) throw new RuntimeException("Missing ')'");
                } else if ((ch >= '0' && ch <= '9') || ch == '.') {
                    while ((ch >= '0' && ch <= '9') || ch == '.') nextChar();
                    x = Double.parseDouble(str.substring(startPos, this.pos));
                } else if (ch >= 'a' && ch <= 'z') {
                    while (ch >= 'a' && ch <= 'z') nextChar();
                    String func = str.substring(startPos, this.pos);
                    if (eat('(')) {
                        x = parseExpression();
                        if (!eat(')')) throw new RuntimeException("Missing ')' after argument to " + func);
                    } else {
                        x = parseFactor();
                    }
                    if (func.equalsIgnoreCase("sqrt")) x = Math.sqrt(x);
                    else if (func.equalsIgnoreCase("abs")) x = Math.abs(x);
                    else if (func.equalsIgnoreCase("sin")) x = Math.sin(Math.toRadians(x));
                    else if (func.equalsIgnoreCase("cos")) x = Math.cos(Math.toRadians(x));
                    else if (func.equalsIgnoreCase("tan")) x = Math.tan(Math.toRadians(x));
                    else throw new RuntimeException("Unknown function: " + func);
                } else {
                    throw new RuntimeException("Unexpected token: " + (char) ch);
                }

                if (eat('^')) x = Math.pow(x, parseFactor());

                return x;
            }
        }.parse();
    }
}
