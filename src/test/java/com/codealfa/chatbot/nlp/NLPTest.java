package com.codealfa.chatbot.nlp;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class NLPTest {

    private TextPreprocessor preprocessor;
    private PorterStemmer stemmer;

    @BeforeEach
    public void setUp() {
        preprocessor = new TextPreprocessor(true);
        stemmer = new PorterStemmer();
    }

    @Test
    public void testTokenizerContractionsAndPunctuation() {
        String text = "I'm learning AI, and what's your name? Don't worry!";
        List<String> tokens = Tokenizer.tokenize(text);

        assertTrue(tokens.contains("i"));
        assertTrue(tokens.contains("am"));
        assertTrue(tokens.contains("learning"));
        assertTrue(tokens.contains("ai"));
        assertTrue(tokens.contains("what"));
        assertTrue(tokens.contains("is"));
        assertTrue(tokens.contains("do"));
        assertTrue(tokens.contains("not"));
        assertTrue(tokens.contains("worry"));
        assertFalse(tokens.contains("i'm"));
        assertFalse(tokens.contains("?"));
    }

    @Test
    public void testStopWordsFilter() {
        List<String> rawTokens = Arrays.asList("this", "is", "a", "great", "machine", "learning", "model");
        List<String> filtered = StopWords.filter(rawTokens);

        assertFalse(filtered.contains("this"));
        assertFalse(filtered.contains("is"));
        assertFalse(filtered.contains("a"));
        assertTrue(filtered.contains("great"));
        assertTrue(filtered.contains("machine"));
        assertTrue(filtered.contains("learning"));
        assertTrue(filtered.contains("model"));
    }

    @Test
    public void testPorterStemmer() {
        assertEquals("comput", stemmer.stemWord("computing"));
        assertEquals("comput", stemmer.stemWord("computer"));
        assertEquals("program", stemmer.stemWord("programming"));
        assertEquals("program", stemmer.stemWord("programs"));
        assertEquals("connect", stemmer.stemWord("connection"));
        assertEquals("connect", stemmer.stemWord("connected"));
    }

    @Test
    public void testTextPreprocessorPipeline() {
        String input = "The programmer is programming intelligent neural algorithms!";
        List<String> preprocessed = preprocessor.preprocess(input);

        assertNotNull(preprocessed);
        assertFalse(preprocessed.isEmpty());
        assertTrue(preprocessed.contains("program"));
        assertTrue(preprocessed.contains("intellig"));
        assertTrue(preprocessed.contains("neural"));
        assertTrue(preprocessed.contains("algorithm"));
        assertFalse(preprocessed.contains("the"));
        assertFalse(preprocessed.contains("is"));
    }

    @Test
    public void testTfIdfVectorizerAndCosineSimilarity() {
        TfIdfVectorizer vectorizer = new TfIdfVectorizer();

        List<List<String>> corpus = Arrays.asList(
                Arrays.asList("java", "program", "develop"),
                Arrays.asList("machin", "learn", "artifici", "intellig"),
                Arrays.asList("java", "spring", "boot", "develop")
        );

        vectorizer.fit(corpus);
        assertTrue(vectorizer.isFitted());
        assertTrue(vectorizer.getVocabularySize() > 0);

        double[] vec1 = vectorizer.transform(Arrays.asList("java", "develop"));
        double[] vec2 = vectorizer.transform(Arrays.asList("java", "program"));
        double[] vec3 = vectorizer.transform(Arrays.asList("machin", "learn"));

        double sim12 = CosineSimilarity.compute(vec1, vec2);
        double sim13 = CosineSimilarity.compute(vec1, vec3);

        assertTrue(sim12 > 0.3, "Java documents should have high cosine similarity");
        assertEquals(0.0, sim13, 0.001, "Disjoint topics should have near zero cosine similarity");
    }
}
