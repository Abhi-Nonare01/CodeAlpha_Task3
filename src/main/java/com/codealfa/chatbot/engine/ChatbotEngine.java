package com.codealfa.chatbot.engine;

import com.codealfa.chatbot.ml.ClassificationResult;
import com.codealfa.chatbot.ml.IntentClassifier;
import com.codealfa.chatbot.nlp.LanguageAdapter;
import com.codealfa.chatbot.nlp.LanguageDetector;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Random;

/**
 * Central orchestrator combining Natural Language Processing,
 * Multilingual Support (English, Hindi, Hinglish),
 * Machine Learning Intent Classification, Rule-Based Matching, and Context Management.
 */
public class ChatbotEngine {

    public static class ChatResponse {
        private final String text;
        private final double confidence;
        private final String intentTag;
        private final String matchType; // "RULE", "ML_INTENT", "FALLBACK"
        private final List<String> suggestions;
        private final String language;

        public ChatResponse(String text, double confidence, String intentTag, String matchType, List<String> suggestions, String language) {
            this.text = text;
            this.confidence = confidence;
            this.intentTag = intentTag;
            this.matchType = matchType;
            this.suggestions = suggestions != null ? suggestions : Collections.emptyList();
            this.language = language != null ? language : "en";
        }

        public String getText() {
            return text;
        }

        public double getConfidence() {
            return confidence;
        }

        public String getIntentTag() {
            return intentTag;
        }

        public String getMatchType() {
            return matchType;
        }

        public List<String> getSuggestions() {
            return suggestions;
        }

        public String getLanguage() {
            return language;
        }

        @Override
        public String toString() {
            return String.format("ChatResponse{lang='%s', match='%s', intent='%s', conf=%.2f, text='%s'}",
                    language, matchType, intentTag, confidence, text);
        }
    }

    private final KnowledgeBase knowledgeBase;
    private final IntentClassifier classifier;
    private final RuleEngine ruleEngine;
    private final ConversationContext context;
    private final Random random;

    private static final List<String> DEFAULT_SUGGESTIONS = Arrays.asList(
            "What is CodeAlfa?",
            "What is NLP?",
            "What is TF-IDF?",
            "Tell me a joke",
            "Calculate 25 * 4 + 10"
    );

    public ChatbotEngine() {
        this(new File("data/custom_faqs.json"));
    }

    public ChatbotEngine(File customFaqsFile) {
        this.knowledgeBase = new KnowledgeBase(customFaqsFile);
        this.classifier = new IntentClassifier(0.28);
        this.ruleEngine = new RuleEngine();
        this.context = new ConversationContext();
        this.random = new Random();
        retrain();
    }

    /**
     * Retrains the Machine Learning Intent Classifier on the latest KnowledgeBase samples.
     */
    public synchronized void retrain() {
        classifier.train(knowledgeBase.extractTrainingSamples());
    }

    /**
     * Processes a user input message and returns an intelligent response with multilingual adaptation.
     */
    public ChatResponse process(String userMessage) {
        if (userMessage == null || userMessage.isBlank()) {
            return new ChatResponse(
                    "Please ask me a question or type a message! 😊",
                    1.0,
                    "empty_input",
                    "FALLBACK",
                    DEFAULT_SUGGESTIONS,
                    "en"
            );
        }

        String query = userMessage.trim();
        LanguageDetector.Language detectedLang = LanguageDetector.detect(query);
        context.addMessage("user", query);

        // 1. Check Rule Engine (Arithmetic, Date/Time, Name Memory, System commands)
        Optional<String> ruleResult = ruleEngine.evaluate(query, context, knowledgeBase);
        if (ruleResult.isPresent()) {
            String respText = ruleResult.get();
            context.addMessage("bot", respText);
            return new ChatResponse(respText, 1.0, "rule_matched", "RULE", getContextualSuggestions(null), detectedLang.getCode());
        }

        // 2. Machine Learning Intent Classification (TF-IDF + Cosine Similarity)
        ClassificationResult classification = classifier.predict(query);

        if (classification.isConfident()) {
            Optional<Intent> matchedIntentOpt = knowledgeBase.getIntentByTag(classification.getTopIntentTag());
            if (matchedIntentOpt.isPresent()) {
                Intent matchedIntent = matchedIntentOpt.get();
                List<String> responses = matchedIntent.getResponses();
                String rawEnglishResponse = (responses != null && !responses.isEmpty())
                        ? responses.get(random.nextInt(responses.size()))
                        : "I understand your question regarding " + matchedIntent.getTag() + "!";

                // Multilingual adaptation (Hindi / Hinglish / English)
                String adaptedResponse = LanguageAdapter.adapt(matchedIntent.getTag(), rawEnglishResponse, detectedLang);

                context.setLastIntentTag(matchedIntent.getTag());
                context.addMessage("bot", adaptedResponse);

                List<String> suggestions = (matchedIntent.getSuggestions() != null && !matchedIntent.getSuggestions().isEmpty())
                        ? matchedIntent.getSuggestions()
                        : getContextualSuggestions(matchedIntent.getCategory());

                return new ChatResponse(
                        adaptedResponse,
                        classification.getConfidence(),
                        matchedIntent.getTag(),
                        "ML_INTENT",
                        suggestions,
                        detectedLang.getCode()
                );
            }
        }

        // 3. Low Confidence / Fallback with smart candidate recommendation
        String fallbackResponse = LanguageAdapter.getFallback(detectedLang);
        context.setLastIntentTag("fallback");
        context.addMessage("bot", fallbackResponse);

        return new ChatResponse(
                fallbackResponse,
                classification.getConfidence(),
                "fallback",
                "FALLBACK",
                getTopCandidateSuggestions(classification),
                detectedLang.getCode()
        );
    }

    private List<String> getTopCandidateSuggestions(ClassificationResult classification) {
        List<String> suggestions = new ArrayList<>();
        for (ClassificationResult.ScoredIntent candidate : classification.getCandidateScores()) {
            if (suggestions.size() >= 3) break;
            Optional<Intent> intentOpt = knowledgeBase.getIntentByTag(candidate.getIntentTag());
            if (intentOpt.isPresent() && intentOpt.get().getPatterns() != null && !intentOpt.get().getPatterns().isEmpty()) {
                suggestions.add(intentOpt.get().getPatterns().get(0));
            }
        }
        if (suggestions.isEmpty()) {
            return DEFAULT_SUGGESTIONS;
        }
        return suggestions;
    }

    private List<String> getContextualSuggestions(String category) {
        List<String> suggestions = new ArrayList<>();
        for (Intent intent : knowledgeBase.getIntents()) {
            if (category != null && category.equalsIgnoreCase(intent.getCategory())) {
                if (intent.getPatterns() != null && !intent.getPatterns().isEmpty()) {
                    suggestions.add(intent.getPatterns().get(0));
                }
            }
            if (suggestions.size() >= 4) break;
        }
        return suggestions.isEmpty() ? DEFAULT_SUGGESTIONS : suggestions;
    }

    public KnowledgeBase getKnowledgeBase() {
        return knowledgeBase;
    }

    public IntentClassifier getClassifier() {
        return classifier;
    }

    public ConversationContext getContext() {
        return context;
    }
}
