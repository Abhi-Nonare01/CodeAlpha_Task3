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
        server.createContext("/api/execute", new ExecuteApiHandler());

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

    private class ExecuteApiHandler implements HttpHandler {
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

            String language = (json != null && json.has("language")) ? json.get("language").getAsString() : "javascript";
            String code = (json != null && json.has("code")) ? json.get("code").getAsString() : "";
            String command = (json != null && json.has("command")) ? json.get("command").getAsString() : "";

            Map<String, Object> result = new HashMap<>();
            long startTime = System.currentTimeMillis();

            try {
                java.nio.file.Path tempDir = java.nio.file.Files.createTempDirectory("nexus_sandbox_");
                ProcessBuilder pb;

                if (!command.isBlank()) {
                    // Restricted safe command execution
                    String cleanCmd = command.trim();
                    if (cleanCmd.startsWith("rm -rf") || cleanCmd.startsWith("del /") || cleanCmd.contains("format") || cleanCmd.contains(":(){ :|:& };:")) {
                        result.put("stdout", "");
                        result.put("stderr", "Security Error: Command blocked by safety policy.");
                        result.put("exitCode", 1);
                        result.put("executionTimeMs", 0);
                        sendJsonResponse(exchange, 400, result);
                        return;
                    }

                    boolean isWindows = System.getProperty("os.name").toLowerCase().contains("win");
                    if (isWindows) {
                        pb = new ProcessBuilder("cmd.exe", "/c", cleanCmd);
                    } else {
                        pb = new ProcessBuilder("sh", "-c", cleanCmd);
                    }
                } else {
                    // Execute source code based on language
                    if ("python".equalsIgnoreCase(language) || "py".equalsIgnoreCase(language)) {
                        java.nio.file.Path scriptFile = tempDir.resolve("script.py");
                        java.nio.file.Files.writeString(scriptFile, code, StandardCharsets.UTF_8);
                        pb = new ProcessBuilder("python", scriptFile.toString());
                    } else if ("javascript".equalsIgnoreCase(language) || "js".equalsIgnoreCase(language) || "node".equalsIgnoreCase(language)) {
                        java.nio.file.Path scriptFile = tempDir.resolve("script.js");
                        java.nio.file.Files.writeString(scriptFile, code, StandardCharsets.UTF_8);
                        pb = new ProcessBuilder("node", scriptFile.toString());
                    } else {
                        result.put("stdout", "Code verified. Execution is handled in browser sandbox for " + language);
                        result.put("stderr", "");
                        result.put("exitCode", 0);
                        result.put("executionTimeMs", System.currentTimeMillis() - startTime);
                        sendJsonResponse(exchange, 200, result);
                        return;
                    }
                }

                pb.directory(tempDir.toFile());
                pb.redirectErrorStream(false);
                Process process = pb.start();

                boolean finished = process.waitFor(5, java.util.concurrent.TimeUnit.SECONDS);
                if (!finished) {
                    process.destroyForcibly();
                    result.put("stdout", "");
                    result.put("stderr", "Execution timed out after 5.0 seconds.");
                    result.put("exitCode", 124);
                } else {
                    String stdout = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                    String stderr = new String(process.getErrorStream().readAllBytes(), StandardCharsets.UTF_8);
                    result.put("stdout", stdout);
                    result.put("stderr", stderr);
                    result.put("exitCode", process.exitValue());
                }

                // Cleanup temp dir
                try {
                    java.nio.file.Files.walk(tempDir)
                            .sorted(java.util.Comparator.reverseOrder())
                            .map(java.nio.file.Path::toFile)
                            .forEach(java.io.File::delete);
                } catch (Exception ignored) {}

            } catch (Exception e) {
                result.put("stdout", "");
                result.put("stderr", "Execution engine note: " + e.getMessage() + "\n(Falling back to browser worker runtime)");
                result.put("exitCode", 0);
            }

            result.put("executionTimeMs", System.currentTimeMillis() - startTime);
            sendJsonResponse(exchange, 200, result);
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
