package com.codealfa.chatbot;

import com.codealfa.chatbot.engine.ChatbotEngine;
import com.codealfa.chatbot.gui.ChatbotGUI;
import com.codealfa.chatbot.web.WebServer;

import java.awt.GraphicsEnvironment;
import java.io.File;
import java.util.Scanner;

/**
 * Application Entry Point for CodeAlfa AI Chatbot.
 * Supports Desktop Swing GUI, Embedded Web Server, and Interactive CLI mode.
 */
public class Main {

    public static void main(String[] args) {
        System.out.println("==========================================================");
        System.out.println("  🤖 CodeAlfa AI Chatbot - Task 3 (NLP & Machine Learning) ");
        System.out.println("==========================================================");

        // Parse command line arguments
        boolean cliMode = false;
        boolean webMode = false;
        boolean bothMode = false;
        int port = 8080;

        for (int i = 0; i < args.length; i++) {
            String arg = args[i].toLowerCase();
            if (arg.equals("--cli") || arg.equals("-c")) {
                cliMode = true;
            } else if (arg.equals("--web") || arg.equals("-w")) {
                webMode = true;
            } else if (arg.equals("--both") || arg.equals("-b")) {
                bothMode = true;
            } else if ((arg.equals("--port") || arg.equals("-p")) && i + 1 < args.length) {
                try {
                    port = Integer.parseInt(args[++i]);
                } catch (NumberFormatException ignored) {}
            }
        }

        // Initialize Chatbot Core Engine
        File customFaqsFile = new File("data/custom_faqs.json");
        ChatbotEngine engine = new ChatbotEngine(customFaqsFile);

        System.out.println(String.format("[Init] Loaded %d Training Patterns across %d Intents (Vocab: %d terms)",
                engine.getClassifier().getTrainingSampleCount(),
                engine.getKnowledgeBase().getIntents().size(),
                engine.getClassifier().getVocabularySize()));

        if (bothMode) {
            startWebServer(port, engine);
            launchGui(engine);
        } else if (webMode) {
            startWebServer(port, engine);
            System.out.println("[Web Server] Access the Chatbot at: http://localhost:" + port);
            System.out.println("[Web Server] Press Ctrl+C to terminate.");
            // Keep thread alive
            try {
                Thread.currentThread().join();
            } catch (InterruptedException ignored) {}
        } else if (cliMode || GraphicsEnvironment.isHeadless()) {
            runCliLoop(engine);
        } else {
            // Default: Launch GUI mode
            try {
                launchGui(engine);
            } catch (Throwable t) {
                System.out.println("[Notice] GUI launch failed or headless environment detected. Falling back to CLI mode...");
                runCliLoop(engine);
            }
        }
    }

    private static void startWebServer(int port, ChatbotEngine engine) {
        try {
            WebServer webServer = new WebServer(port, engine);
            webServer.start();
        } catch (Exception e) {
            System.err.println("[WebServer] Failed to start server on port " + port + ": " + e.getMessage());
        }
    }

    private static void launchGui(ChatbotEngine engine) {
        System.out.println("[GUI] Launching Modern Desktop Interface...");
        ChatbotGUI.launch(engine);
    }

    private static void runCliLoop(ChatbotEngine engine) {
        System.out.println("\n[CLI Mode] Type your questions below. Type 'exit' or 'quit' to exit.");
        System.out.println("------------------------------------------------------------------");
        Scanner scanner = new Scanner(System.in);

        while (true) {
            System.out.print("\nYou: ");
            if (!scanner.hasNextLine()) break;
            String input = scanner.nextLine().trim();

            if (input.equalsIgnoreCase("exit") || input.equalsIgnoreCase("quit") || input.equalsIgnoreCase("bye")) {
                ChatbotEngine.ChatResponse farewell = engine.process("bye");
                System.out.println("Bot: " + farewell.getText());
                break;
            }

            if (input.isEmpty()) continue;

            ChatbotEngine.ChatResponse response = engine.process(input);
            System.out.println(String.format("Bot [%s | Conf: %.0f%%]: %s",
                    response.getMatchType(),
                    response.getConfidence() * 100,
                    response.getText()));

            if (!response.getSuggestions().isEmpty()) {
                System.out.println("💡 Suggestions: " + String.join(" | ", response.getSuggestions()));
            }
        }
        scanner.close();
    }
}
