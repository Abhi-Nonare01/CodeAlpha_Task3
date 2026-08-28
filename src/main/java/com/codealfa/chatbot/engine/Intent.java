package com.codealfa.chatbot.engine;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Model representing an Intent in the FAQ Knowledge Base.
 */
public class Intent {

    private String tag;
    private String category;
    private String description;
    private List<String> patterns;
    private List<String> responses;
    private List<String> suggestions;
    private String action;

    public Intent() {
        this.patterns = new ArrayList<>();
        this.responses = new ArrayList<>();
        this.suggestions = new ArrayList<>();
    }

    public Intent(String tag, String category, List<String> patterns, List<String> responses) {
        this.tag = tag;
        this.category = category;
        this.patterns = patterns != null ? patterns : new ArrayList<>();
        this.responses = responses != null ? responses : new ArrayList<>();
        this.suggestions = new ArrayList<>();
    }

    public String getTag() {
        return tag;
    }

    public void setTag(String tag) {
        this.tag = tag;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<String> getPatterns() {
        return patterns;
    }

    public void setPatterns(List<String> patterns) {
        this.patterns = patterns;
    }

    public List<String> getResponses() {
        return responses;
    }

    public void setResponses(List<String> responses) {
        this.responses = responses;
    }

    public List<String> getSuggestions() {
        return suggestions;
    }

    public void setSuggestions(List<String> suggestions) {
        this.suggestions = suggestions;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public void addPattern(String pattern) {
        if (pattern != null && !pattern.isBlank() && !patterns.contains(pattern)) {
            patterns.add(pattern);
        }
    }

    public void addResponse(String response) {
        if (response != null && !response.isBlank() && !responses.contains(response)) {
            responses.add(response);
        }
    }
}
