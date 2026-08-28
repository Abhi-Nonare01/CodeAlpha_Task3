package com.codealfa.chatbot.engine;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Tracks session state, conversation history, user preferences, and contextual variables.
 */
public class ConversationContext {

    public static class Message {
        private final String sender; // "user" or "bot"
        private final String text;
        private final long timestamp;

        public Message(String sender, String text) {
            this.sender = sender;
            this.text = text;
            this.timestamp = System.currentTimeMillis();
        }

        public String getSender() {
            return sender;
        }

        public String getText() {
            return text;
        }

        public long getTimestamp() {
            return timestamp;
        }
    }

    private String userName;
    private String lastIntentTag;
    private String lastUserQuery;
    private final Map<String, Object> memory;
    private final List<Message> history;
    private int turnCount;

    public ConversationContext() {
        this.memory = new HashMap<>();
        this.history = new ArrayList<>();
        this.turnCount = 0;
    }

    public void addMessage(String sender, String text) {
        history.add(new Message(sender, text));
        if ("user".equalsIgnoreCase(sender)) {
            turnCount++;
            lastUserQuery = text;
        }
    }

    public void setMemory(String key, Object value) {
        memory.put(key, value);
    }

    public Object getMemory(String key) {
        return memory.get(key);
    }

    public boolean hasMemory(String key) {
        return memory.containsKey(key);
    }

    public void removeMemory(String key) {
        memory.remove(key);
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
        setMemory("userName", userName);
    }

    public String getLastIntentTag() {
        return lastIntentTag;
    }

    public void setLastIntentTag(String lastIntentTag) {
        this.lastIntentTag = lastIntentTag;
    }

    public String getLastUserQuery() {
        return lastUserQuery;
    }

    public List<Message> getHistory() {
        return Collections.unmodifiableList(history);
    }

    public int getTurnCount() {
        return turnCount;
    }

    public void clear() {
        history.clear();
        memory.clear();
        userName = null;
        lastIntentTag = null;
        lastUserQuery = null;
        turnCount = 0;
    }
}
