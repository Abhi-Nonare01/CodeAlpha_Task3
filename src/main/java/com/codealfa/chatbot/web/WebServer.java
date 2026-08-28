package com.codealfa.chatbot.web;

import com.codealfa.chatbot.engine.ChatbotEngine;
import com.codealfa.chatbot.engine.Intent;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Embedded lightweight HTTP Server serving the responsive Web UI and REST API.
 */
public class WebServer {

    private final int port;
    private final ChatbotEngine engine;
    private final Gson gson;
    private HttpServer server;

    public WebServer(int port, ChatbotEngine engine) {
        this.port = port;
        this.engine = engine;
        this.gson = new Gson();
    }

    public void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress(port), 0);

        // Static Web Asset Handler
        server.createContext("/", new StaticFileHandler());

        // REST API Endpoints
        server.createContext("/api/chat", new ChatApiHandler());
        server.createContext("/api/faqs", new FaqsApiHandler());
        server.createContext("/api/train", new TrainApiHandler());
        server.createContext("/api/stats", new StatsApiHandler());

        server.setExecutor(null); // default executor
        server.start();
        System.out.println("[WebServer] AI Chatbot Web Interface running at http://localhost:" + port);
    }

    public void stop() {
        if (server != null) {
            server.stop(0);
            System.out.println("[WebServer] Stopped.");
        }
    }

    private class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();
            if (path.equals("/") || path.isBlank()) {
                path = "/index.html";
            }

            String resourcePath = "web" + path;
            try (InputStream is = getClass().getClassLoader().getResourceAsStream(resourcePath)) {
                if (is == null) {
                    String response = "404 Not Found";
                    exchange.sendResponseHeaders(404, response.length());
                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(response.getBytes());
                    }
                    return;
                }

                ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                byte[] data = new byte[4096];
                int nRead;
                while ((nRead = is.read(data, 0, data.length)) != -1) {
                    buffer.write(data, 0, nRead);
                }

                byte[] bytes = buffer.toByteArray();
                String contentType = getContentType(path);
                exchange.getResponseHeaders().set("Content-Type", contentType);
                exchange.sendResponseHeaders(200, bytes.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(bytes);
                }
            }
        }

        private String getContentType(String path) {
            if (path.endsWith(".html")) return "text/html; charset=UTF-8";
            if (path.endsWith(".css")) return "text/css; charset=UTF-8";
            if (path.endsWith(".js")) return "application/javascript; charset=UTF-8";
            if (path.endsWith(".json")) return "application/json; charset=UTF-8";
            if (path.endsWith(".png")) return "image/png";
            if (path.endsWith(".svg")) return "image/svg+xml";
            return "text/plain";
        }
    }

    private class ChatApiHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJsonResponse(exchange, 405, Map.of("error", "Method not allowed"));
                return;
            }

            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            JsonObject json = gson.fromJson(body, JsonObject.class);
            String message = (json != null && json.has("message")) ? json.get("message").getAsString() : "";

            ChatbotEngine.ChatResponse response = engine.process(message);

            Map<String, Object> respMap = new HashMap<>();
            respMap.put("text", response.getText());
            respMap.put("confidence", response.getConfidence());
            respMap.put("intentTag", response.getIntentTag());
            respMap.put("matchType", response.getMatchType());
            respMap.put("suggestions", response.getSuggestions());

            sendJsonResponse(exchange, 200, respMap);
        }
    }

    private class FaqsApiHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            List<Intent> intents = engine.getKnowledgeBase().getIntents();
            sendJsonResponse(exchange, 200, Map.of("intents", intents));
        }
    }

    private class TrainApiHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJsonResponse(exchange, 405, Map.of("error", "Method not allowed"));
                return;
            }

            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            Intent newIntent = gson.fromJson(body, Intent.class);

            if (newIntent == null || newIntent.getTag() == null || newIntent.getTag().isBlank()) {
                sendJsonResponse(exchange, 400, Map.of("error", "Invalid intent payload. Tag is required."));
                return;
            }

            engine.getKnowledgeBase().addOrUpdateIntent(newIntent);
            engine.retrain();

            sendJsonResponse(exchange, 200, Map.of(
                    "status", "success",
                    "message", "Intent added/updated and ML model retrained!",
                    "trainingSamples", engine.getClassifier().getTrainingSampleCount(),
                    "vocabularySize", engine.getClassifier().getVocabularySize()
            ));
        }
    }

    private class StatsApiHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            Map<String, Object> stats = new HashMap<>();
            stats.put("status", "online");
            stats.put("trainingSamples", engine.getClassifier().getTrainingSampleCount());
            stats.put("vocabularySize", engine.getClassifier().getVocabularySize());
            stats.put("totalIntents", engine.getKnowledgeBase().getIntents().size());
            stats.put("turnCount", engine.getContext().getTurnCount());
            sendJsonResponse(exchange, 200, stats);
        }
    }

    private void addCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
    }

    private void sendJsonResponse(HttpExchange exchange, int statusCode, Object data) throws IOException {
        String jsonStr = gson.toJson(data);
        byte[] bytes = jsonStr.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
}
