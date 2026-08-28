package com.codealfa.chatbot.engine;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.util.Arrays;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;

public class ChatbotEngineTest {

    private ChatbotEngine engine;

    @BeforeEach
    public void setUp() {
        File testTempFile = new File("target/test_custom_faqs.json");
        if (testTempFile.exists()) {
            testTempFile.delete();
        }
        engine = new ChatbotEngine(testTempFile);
    }

    @Test
    public void testGreetingIntentClassification() {
        ChatbotEngine.ChatResponse resp = engine.process("Hello there, how are you today?");
        assertNotNull(resp);
        assertNotNull(resp.getText());
        assertTrue(resp.getConfidence() > 0.3);
        assertTrue(resp.getIntentTag().equalsIgnoreCase("greeting") || resp.getIntentTag().equalsIgnoreCase("how_are_you"));
    }

    @Test
    public void testCodeAlfaIntentClassification() {
        ChatbotEngine.ChatResponse resp = engine.process("Tell me about CodeAlfa internship");
        assertNotNull(resp);
        assertEquals("codealfa_info", resp.getIntentTag());
        assertTrue(resp.getText().toLowerCase().contains("codealfa"));
    }

    @Test
    public void testNlpTfIdfFaqClassification() {
        ChatbotEngine.ChatResponse resp = engine.process("What is TF-IDF and how does it work?");
        assertNotNull(resp);
        assertEquals("tfidf_explanation", resp.getIntentTag());
        assertTrue(resp.getText().contains("Term Frequency"));
    }

    @Test
    public void testMathRuleEvaluation() {
        ChatbotEngine.ChatResponse resp = engine.process("calc (25 + 5) * 4");
        assertNotNull(resp);
        assertEquals("RULE", resp.getMatchType());
        assertTrue(resp.getText().contains("120"));

        ChatbotEngine.ChatResponse resp2 = engine.process("calculate sqrt(144) + 8");
        assertNotNull(resp2);
        assertEquals("RULE", resp2.getMatchType());
        assertTrue(resp2.getText().contains("20"));
    }

    @Test
    public void testTimeAndDateRuleEvaluation() {
        ChatbotEngine.ChatResponse timeResp = engine.process("what time is it");
        assertNotNull(timeResp);
        assertEquals("RULE", timeResp.getMatchType());
        assertTrue(timeResp.getText().contains("current time"));

        ChatbotEngine.ChatResponse dateResp = engine.process("what is today's date");
        assertNotNull(dateResp);
        assertEquals("RULE", dateResp.getMatchType());
        assertTrue(dateResp.getText().contains("Today is"));
    }

    @Test
    public void testNameMemoryExtractionAndRecall() {
        ChatbotEngine.ChatResponse setResp = engine.process("My name is John Doe");
        assertNotNull(setResp);
        assertTrue(setResp.getText().contains("John Doe"));
        assertEquals("John Doe", engine.getContext().getUserName());

        ChatbotEngine.ChatResponse getResp = engine.process("What is my name?");
        assertNotNull(getResp);
        assertTrue(getResp.getText().contains("John Doe"));
    }

    @Test
    public void testDynamicFaqAdditionAndRetraining() {
        Intent customIntent = new Intent(
                "quantum_computing",
                "Advanced Tech",
                Arrays.asList("What is quantum computing", "Explain qubits and quantum superposition", "Tell me about quantum computers"),
                Arrays.asList("Quantum computing leverages principles of quantum mechanics like superposition and entanglement.")
        );

        engine.getKnowledgeBase().addOrUpdateIntent(customIntent);
        engine.retrain();

        ChatbotEngine.ChatResponse resp = engine.process("Explain quantum computing and qubits");
        assertNotNull(resp);
        assertEquals("quantum_computing", resp.getIntentTag());
        assertTrue(resp.getText().contains("superposition"));
    }
}
