package com.codealfa.chatbot.engine;

import com.codealfa.chatbot.ml.TrainingSample;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;

import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Manages the FAQ knowledge base, loads default JSON dataset from classpath,
 * supports saving/loading external customized FAQs, and creates ML training samples.
 */
public class KnowledgeBase {

    private final List<Intent> intents;
    private final Gson gson;
    private File customStorageFile;

    public KnowledgeBase() {
        this.intents = new CopyOnWriteArrayList<>();
        this.gson = new GsonBuilder().setPrettyPrinting().create();
        loadDefaultDataset();
    }

    public KnowledgeBase(File customStorageFile) {
        this.intents = new CopyOnWriteArrayList<>();
        this.gson = new GsonBuilder().setPrettyPrinting().create();
        this.customStorageFile = customStorageFile;
        if (customStorageFile != null && customStorageFile.exists()) {
            loadFromFile(customStorageFile);
        } else {
            loadDefaultDataset();
            if (customStorageFile != null) {
                saveToFile(customStorageFile);
            }
        }
    }

    /**
     * Loads the default faqs.json dataset bundled in resources.
     */
    public synchronized void loadDefaultDataset() {
        try (InputStream is = getClass().getClassLoader().getResourceAsStream("faqs.json")) {
            if (is != null) {
                try (Reader reader = new InputStreamReader(is, StandardCharsets.UTF_8)) {
                    Type mapType = new TypeToken<Map<String, List<Intent>>>() {}.getType();
                    Map<String, List<Intent>> data = gson.fromJson(reader, mapType);
                    if (data != null && data.containsKey("intents")) {
                        this.intents.clear();
                        this.intents.addAll(data.get("intents"));
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("[KnowledgeBase] Error loading default faqs.json: " + e.getMessage());
        }
    }

    /**
     * Loads intents from a custom external JSON file.
     */
    public synchronized void loadFromFile(File file) {
        if (file == null || !file.exists()) return;
        try (Reader reader = new FileReader(file, StandardCharsets.UTF_8)) {
            Type mapType = new TypeToken<Map<String, List<Intent>>>() {}.getType();
            Map<String, List<Intent>> data = gson.fromJson(reader, mapType);
            if (data != null && data.containsKey("intents")) {
                this.intents.clear();
                this.intents.addAll(data.get("intents"));
                this.customStorageFile = file;
            }
        } catch (Exception e) {
            System.err.println("[KnowledgeBase] Error loading intents from file: " + e.getMessage());
        }
    }

    /**
     * Persists current intents into a JSON file.
     */
    public synchronized void saveToFile(File file) {
        if (file == null) return;
        try {
            File parent = file.getParentFile();
            if (parent != null && !parent.exists()) {
                parent.mkdirs();
            }
            try (FileWriter writer = new FileWriter(file, StandardCharsets.UTF_8)) {
                Map<String, List<Intent>> data = Collections.singletonMap("intents", new ArrayList<>(intents));
                gson.toJson(data, writer);
            }
            this.customStorageFile = file;
        } catch (Exception e) {
            System.err.println("[KnowledgeBase] Error saving intents to file: " + e.getMessage());
        }
    }

    public synchronized void persist() {
        if (customStorageFile != null) {
            saveToFile(customStorageFile);
        }
    }

    /**
     * Adds a new intent or updates an existing one if tag matches.
     */
    public synchronized void addOrUpdateIntent(Intent intent) {
        if (intent == null || intent.getTag() == null || intent.getTag().isBlank()) {
            return;
        }
        deleteIntent(intent.getTag());
        intents.add(intent);
        persist();
    }

    /**
     * Deletes an intent by tag.
     */
    public synchronized boolean deleteIntent(String tag) {
        boolean removed = intents.removeIf(i -> i.getTag().equalsIgnoreCase(tag));
        if (removed) {
            persist();
        }
        return removed;
    }

    public Optional<Intent> getIntentByTag(String tag) {
        if (tag == null) return Optional.empty();
        return intents.stream()
                .filter(i -> i.getTag().equalsIgnoreCase(tag))
                .findFirst();
    }

    public List<Intent> getIntents() {
        return Collections.unmodifiableList(intents);
    }

    /**
     * Extracts all training patterns from all intents as ML TrainingSamples.
     */
    public List<TrainingSample> extractTrainingSamples() {
        List<TrainingSample> samples = new ArrayList<>();
        for (Intent intent : intents) {
            if (intent.getPatterns() != null) {
                for (String pattern : intent.getPatterns()) {
                    if (pattern != null && !pattern.isBlank()) {
                        samples.add(new TrainingSample(intent.getTag(), pattern, Collections.emptyList()));
                    }
                }
            }
        }
        return samples;
    }
}
