package com.codealfa.chatbot.gui;

import com.codealfa.chatbot.engine.ChatbotEngine;
import com.codealfa.chatbot.engine.Intent;
import com.formdev.flatlaf.FlatClientProperties;
import com.formdev.flatlaf.FlatDarkLaf;
import com.formdev.flatlaf.FlatLightLaf;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;
import java.io.File;
import java.io.FileWriter;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.List;

/**
 * World-class ChatGPT/Claude-styled Modern Swing Desktop GUI for AI Chatbot.
 */
public class ChatbotGUI extends JFrame {

    private final ChatbotEngine engine;
    private JPanel chatContainer;
    private JScrollPane chatScrollPane;
    private JTextField inputField;
    private JButton sendButton;
    private JPanel suggestionPanel;
    private JPanel welcomeHeroPanel;
    private DefaultListModel<String> historyListModel;
    private JList<String> historyList;
    private JLabel statusLabel;
    private boolean isDarkMode = true;

    // Color Palette
    private Color bgMain;
    private Color bgSidebar;
    private Color bgCard;
    private Color bgUserBubble;
    private Color textPrimary;
    private Color textSecondary;
    private Color accentColor = new Color(59, 130, 246);

    public ChatbotGUI(ChatbotEngine engine) {
        this.engine = engine;
        updateThemeColors();
        initUI();
    }

    private void updateThemeColors() {
        if (isDarkMode) {
            bgMain = new Color(13, 17, 23);
            bgSidebar = new Color(22, 27, 34);
            bgCard = new Color(33, 38, 45);
            bgUserBubble = new Color(37, 99, 235);
            textPrimary = new Color(240, 246, 252);
            textSecondary = new Color(139, 148, 158);
        } else {
            bgMain = new Color(246, 248, 250);
            bgSidebar = new Color(234, 238, 242);
            bgCard = new Color(255, 255, 255);
            bgUserBubble = new Color(37, 99, 235);
            textPrimary = new Color(31, 35, 40);
            textSecondary = new Color(101, 109, 118);
        }
    }

    private void initUI() {
        setTitle("NexusAI - Advanced Java NLP Chatbot (CodeAlfa Task 3)");
        setSize(1050, 750);
        setMinimumSize(new Dimension(850, 600));
        setLocationRelativeTo(null);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);

        // Root Container
        JPanel root = new JPanel(new BorderLayout());
        root.setBackground(bgMain);

        // 1. Left Sidebar (ChatGPT Style)
        JPanel sidebar = createSidebar();
        root.add(sidebar, BorderLayout.WEST);

        // 2. Main Chat Panel
        JPanel mainChatPanel = new JPanel(new BorderLayout());
        mainChatPanel.setBackground(bgMain);

        // Top Navigation Bar
        JPanel topNav = createTopNavbar();
        mainChatPanel.add(topNav, BorderLayout.NORTH);

        // Scrollable Chat Area
        chatContainer = new JPanel();
        chatContainer.setLayout(new BoxLayout(chatContainer, BoxLayout.Y_AXIS));
        chatContainer.setBackground(bgMain);
        chatContainer.setBorder(new EmptyBorder(20, 24, 20, 24));

        // Welcome Hero Panel (Empty state with Prompt Cards)
        welcomeHeroPanel = createWelcomeHero();
        chatContainer.add(welcomeHeroPanel);

        chatScrollPane = new JScrollPane(chatContainer);
        chatScrollPane.setBorder(null);
        chatScrollPane.getViewport().setBackground(bgMain);
        chatScrollPane.getVerticalScrollBar().setUnitIncrement(16);
        chatScrollPane.setHorizontalScrollBarPolicy(ScrollPaneConstants.HORIZONTAL_SCROLLBAR_NEVER);
        mainChatPanel.add(chatScrollPane, BorderLayout.CENTER);

        // Bottom Controls (Suggestion Chips + Floating Input Bar)
        JPanel bottomContainer = new JPanel(new BorderLayout());
        bottomContainer.setBackground(bgMain);

        suggestionPanel = new JPanel(new FlowLayout(FlowLayout.CENTER, 8, 4));
        suggestionPanel.setBackground(bgMain);
        bottomContainer.add(suggestionPanel, BorderLayout.NORTH);

        JPanel inputBar = createFloatingInputBar();
        bottomContainer.add(inputBar, BorderLayout.SOUTH);

        mainChatPanel.add(bottomContainer, BorderLayout.SOUTH);
        root.add(mainChatPanel, BorderLayout.CENTER);

        setContentPane(root);
        updateSuggestions(Arrays.asList("What is CodeAlfa?", "What is NLP?", "What is TF-IDF?", "Tell me a joke", "calc 128 * 16 + 50"));
    }

    private JPanel createSidebar() {
        JPanel sidebar = new JPanel(new BorderLayout());
        sidebar.setPreferredSize(new Dimension(240, 0));
        sidebar.setBackground(bgSidebar);
        sidebar.setBorder(BorderFactory.createMatteBorder(0, 0, 0, 1, isDarkMode ? new Color(48, 54, 61) : new Color(208, 215, 222)));

        // Sidebar Header
        JPanel header = new JPanel(new BorderLayout(8, 8));
        header.setBackground(bgSidebar);
        header.setBorder(new EmptyBorder(14, 14, 10, 14));

        JButton newChatBtn = new JButton("+  New Chat");
        newChatBtn.setFont(new Font("Segoe UI", Font.BOLD, 13));
        newChatBtn.putClientProperty(FlatClientProperties.BUTTON_TYPE, FlatClientProperties.BUTTON_TYPE_ROUND_RECT);
        newChatBtn.setBackground(accentColor);
        newChatBtn.setForeground(Color.WHITE);
        newChatBtn.setCursor(new Cursor(Cursor.HAND_CURSOR));
        newChatBtn.addActionListener(e -> resetToNewChat());
        header.add(newChatBtn, BorderLayout.CENTER);
        sidebar.add(header, BorderLayout.NORTH);

        // Chat History List
        JPanel historyContainer = new JPanel(new BorderLayout());
        historyContainer.setBackground(bgSidebar);
        historyContainer.setBorder(new EmptyBorder(6, 10, 6, 10));

        JLabel historyTitle = new JLabel("RECENT CHATS");
        historyTitle.setFont(new Font("Segoe UI", Font.BOLD, 10));
        historyTitle.setForeground(textSecondary);
        historyTitle.setBorder(new EmptyBorder(4, 6, 8, 6));
        historyContainer.add(historyTitle, BorderLayout.NORTH);

        historyListModel = new DefaultListModel<>();
        historyListModel.addElement("Current Conversation");
        historyList = new JList<>(historyListModel);
        historyList.setSelectedIndex(0);
        historyList.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        historyList.setBackground(bgSidebar);
        historyList.setForeground(textPrimary);
        historyList.setSelectionBackground(bgCard);
        historyList.setSelectionForeground(accentColor);

        historyContainer.add(new JScrollPane(historyList), BorderLayout.CENTER);
        sidebar.add(historyContainer, BorderLayout.CENTER);

        // Sidebar Footer Actions
        JPanel footer = new JPanel(new GridLayout(4, 1, 4, 4));
        footer.setBackground(bgSidebar);
        footer.setBorder(new EmptyBorder(10, 14, 14, 14));

        JButton faqBtn = createSidebarBtn("Knowledge Base (FAQ)");
        faqBtn.addActionListener(e -> openFaqManager());

        JButton exportBtn = createSidebarBtn("Export Transcript");
        exportBtn.addActionListener(e -> exportChat());

        JButton clearBtn = createSidebarBtn("Clear Conversation");
        clearBtn.addActionListener(e -> resetToNewChat());

        JButton themeBtn = createSidebarBtn(isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode");
        themeBtn.addActionListener(e -> {
            toggleTheme();
            themeBtn.setText(isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode");
        });

        footer.add(faqBtn);
        footer.add(exportBtn);
        footer.add(clearBtn);
        footer.add(themeBtn);
        sidebar.add(footer, BorderLayout.SOUTH);

        return sidebar;
    }

    private JButton createSidebarBtn(String text) {
        JButton btn = new JButton(text);
        btn.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        btn.putClientProperty(FlatClientProperties.BUTTON_TYPE, FlatClientProperties.BUTTON_TYPE_BORDERLESS);
        btn.setHorizontalAlignment(SwingConstants.LEFT);
        btn.setForeground(textPrimary);
        btn.setCursor(new Cursor(Cursor.HAND_CURSOR));
        return btn;
    }

    private JPanel createTopNavbar() {
        JPanel nav = new JPanel(new BorderLayout());
        nav.setBackground(bgMain);
        nav.setBorder(new EmptyBorder(12, 24, 12, 24));

        JPanel leftGroup = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 0));
        leftGroup.setOpaque(false);

        JLabel title = new JLabel("NexusAI Assistant");
        title.setFont(new Font("Segoe UI", Font.BOLD, 16));
        title.setForeground(textPrimary);

        int sampleCount = engine.getClassifier().getTrainingSampleCount();
        int vocabSize = engine.getClassifier().getVocabularySize();
        statusLabel = new JLabel(String.format("• Online (%d Patterns | TF-IDF Cosine Model)", sampleCount));
        statusLabel.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        statusLabel.setForeground(new Color(46, 204, 113));

        leftGroup.add(title);
        leftGroup.add(statusLabel);
        nav.add(leftGroup, BorderLayout.WEST);

        return nav;
    }

    private JPanel createWelcomeHero() {
        JPanel hero = new JPanel();
        hero.setLayout(new BoxLayout(hero, BoxLayout.Y_AXIS));
        hero.setBackground(bgMain);
        hero.setBorder(new EmptyBorder(30, 40, 20, 40));
        hero.setAlignmentX(Component.CENTER_ALIGNMENT);

        JLabel mainHeading = new JLabel("How can I help you today?");
        mainHeading.setFont(new Font("Segoe UI", Font.BOLD, 26));
        mainHeading.setForeground(textPrimary);
        mainHeading.setAlignmentX(Component.CENTER_ALIGNMENT);
        hero.add(mainHeading);

        JLabel subHeading = new JLabel("Interactive AI Chatbot powered by Java NLP, Porter Stemming, TF-IDF Vectorization & Rule Resolution.");
        subHeading.setFont(new Font("Segoe UI", Font.PLAIN, 13));
        subHeading.setForeground(textSecondary);
        subHeading.setAlignmentX(Component.CENTER_ALIGNMENT);
        subHeading.setBorder(new EmptyBorder(8, 0, 24, 0));
        hero.add(subHeading);

        // 4 Prompt Starter Cards in 2x2 Grid
        JPanel grid = new JPanel(new GridLayout(2, 2, 12, 12));
        grid.setBackground(bgMain);
        grid.setMaximumSize(new Dimension(680, 160));

        grid.add(createPromptCard("Explain NLP Pipeline", "Tokenization, Porter Stemmer & TF-IDF", "What is NLP and what techniques are used in this chatbot?"));
        grid.add(createPromptCard("Java Interview FAQ", "HashMap vs Hashtable & Collections", "What is the difference between HashMap and Hashtable in Java?"));
        grid.add(createPromptCard("Math Calculator", "Evaluate arithmetic formulas", "calc (128 * 16) + sqrt(256) - 48"));
        grid.add(createPromptCard("CodeAlfa Internship", "Task 3 details & submission guide", "Tell me about CodeAlfa internship tasks and submission"));

        hero.add(grid);
        return hero;
    }

    private JPanel createPromptCard(String title, String desc, String query) {
        JPanel card = new JPanel(new BorderLayout(8, 4));
        card.setBackground(bgCard);
        card.setBorder(new EmptyBorder(12, 14, 12, 14));
        card.putClientProperty(FlatClientProperties.STYLE, "arc: 12");
        card.setCursor(new Cursor(Cursor.HAND_CURSOR));

        JLabel titleLbl = new JLabel(title);
        titleLbl.setFont(new Font("Segoe UI", Font.BOLD, 13));
        titleLbl.setForeground(textPrimary);

        JLabel descLbl = new JLabel(desc);
        descLbl.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        descLbl.setForeground(textSecondary);

        card.add(titleLbl, BorderLayout.NORTH);
        card.add(descLbl, BorderLayout.CENTER);

        card.addMouseListener(new java.awt.event.MouseAdapter() {
            @Override
            public void mouseClicked(java.awt.event.MouseEvent e) {
                inputField.setText(query);
                handleSendMessage();
            }
            @Override
            public void mouseEntered(java.awt.event.MouseEvent e) {
                card.setBackground(isDarkMode ? new Color(45, 51, 59) : new Color(240, 242, 245));
            }
            @Override
            public void mouseExited(java.awt.event.MouseEvent e) {
                card.setBackground(bgCard);
            }
        });

        return card;
    }

    private JPanel createFloatingInputBar() {
        JPanel wrapper = new JPanel(new BorderLayout());
        wrapper.setBackground(bgMain);
        wrapper.setBorder(new EmptyBorder(6, 24, 18, 24));

        JPanel bar = new JPanel(new BorderLayout(10, 0));
        bar.setBackground(bgCard);
        bar.setBorder(new EmptyBorder(8, 16, 8, 8));
        bar.putClientProperty(FlatClientProperties.STYLE, "arc: 24");

        inputField = new JTextField();
        inputField.setFont(new Font("Segoe UI", Font.PLAIN, 14));
        inputField.putClientProperty(FlatClientProperties.PLACEHOLDER_TEXT, "Ask NexusAI (e.g. 'What is TF-IDF?', 'calc 50*4+20', 'Tell me about CodeAlfa')...");
        inputField.setBorder(null);
        inputField.setBackground(bgCard);
        inputField.setForeground(textPrimary);
        inputField.addKeyListener(new KeyAdapter() {
            @Override
            public void keyPressed(KeyEvent e) {
                if (e.getKeyCode() == KeyEvent.VK_ENTER) {
                    handleSendMessage();
                }
            }
        });

        sendButton = new JButton("Send");
        sendButton.setFont(new Font("Segoe UI", Font.BOLD, 12));
        sendButton.setBackground(accentColor);
        sendButton.setForeground(Color.WHITE);
        sendButton.putClientProperty(FlatClientProperties.BUTTON_TYPE, FlatClientProperties.BUTTON_TYPE_ROUND_RECT);
        sendButton.setCursor(new Cursor(Cursor.HAND_CURSOR));
        sendButton.addActionListener(e -> handleSendMessage());

        bar.add(inputField, BorderLayout.CENTER);
        bar.add(sendButton, BorderLayout.EAST);
        wrapper.add(bar, BorderLayout.CENTER);

        return wrapper;
    }

    private void handleSendMessage() {
        String text = inputField.getText().trim();
        if (text.isEmpty()) return;

        if (welcomeHeroPanel.isVisible()) {
            welcomeHeroPanel.setVisible(false);
        }

        inputField.setText("");
        addMessageBubble("You", text, true, 1.0, null);

        sendButton.setEnabled(false);
        inputField.setEnabled(false);

        SwingWorker<ChatbotEngine.ChatResponse, Void> worker = new SwingWorker<>() {
            @Override
            protected ChatbotEngine.ChatResponse doInBackground() throws Exception {
                Thread.sleep(180);
                return engine.process(text);
            }

            @Override
            protected void done() {
                try {
                    ChatbotEngine.ChatResponse response = get();
                    addMessageBubble("NexusAI", response.getText(), false, response.getConfidence(), response.getMatchType());
                    updateSuggestions(response.getSuggestions());
                } catch (Exception e) {
                    addMessageBubble("NexusAI", "Error processing your request.", false, 0.0, "ERROR");
                } finally {
                    sendButton.setEnabled(true);
                    inputField.setEnabled(true);
                    inputField.requestFocusInWindow();
                }
            }
        };
        worker.execute();
    }

    private void addMessageBubble(String sender, String text, boolean isUser, double confidence, String matchType) {
        JPanel row = new JPanel(new FlowLayout(isUser ? FlowLayout.RIGHT : FlowLayout.LEFT, 0, 6));
        row.setOpaque(false);
        row.setMaximumSize(new Dimension(Integer.MAX_VALUE, 800));

        JPanel bubble = new JPanel(new BorderLayout(6, 6));
        bubble.setBorder(new EmptyBorder(12, 16, 12, 16));
        bubble.putClientProperty(FlatClientProperties.STYLE, "arc: 16");

        if (isUser) {
            bubble.setBackground(bgUserBubble);
        } else {
            bubble.setBackground(bgCard);
            bubble.setBorder(BorderFactory.createCompoundBorder(
                    BorderFactory.createLineBorder(isDarkMode ? new Color(48, 54, 61) : new Color(220, 225, 230), 1),
                    new EmptyBorder(12, 16, 12, 16)
            ));
        }

        SimpleDateFormat sdf = new SimpleDateFormat("hh:mm a");
        String metaText;
        if (isUser) {
            metaText = String.format("You • %s", sdf.format(new Date()));
        } else {
            metaText = String.format("NexusAI • %s [%s | Conf: %.0f%%]", sdf.format(new Date()), matchType, confidence * 100);
        }

        JLabel metaLabel = new JLabel(metaText);
        metaLabel.setFont(new Font("Segoe UI", Font.BOLD, 10));
        metaLabel.setForeground(isUser ? new Color(210, 230, 255) : textSecondary);
        bubble.add(metaLabel, BorderLayout.NORTH);

        String formattedHtml = formatToHtml(text, isDarkMode, isUser);
        JEditorPane textPane = new JEditorPane("text/html", formattedHtml);
        textPane.setEditable(false);
        textPane.setOpaque(false);
        textPane.putClientProperty(JEditorPane.HONOR_DISPLAY_PROPERTIES, Boolean.TRUE);
        textPane.setFont(new Font("Segoe UI", Font.PLAIN, 13));

        int maxWidth = (int) (getWidth() * 0.68);
        textPane.setSize(new Dimension(Math.max(340, maxWidth), Short.MAX_VALUE));
        bubble.add(textPane, BorderLayout.CENTER);

        row.add(bubble);
        chatContainer.add(row);
        chatContainer.revalidate();
        chatContainer.repaint();

        SwingUtilities.invokeLater(() -> {
            JScrollBar vertical = chatScrollPane.getVerticalScrollBar();
            vertical.setValue(vertical.getMaximum());
        });
    }

    private String formatToHtml(String text, boolean dark, boolean isUser) {
        String color = isUser ? "#FFFFFF" : (dark ? "#F0F6FC" : "#1F2328");
        String codeBg = isUser ? "rgba(0,0,0,0.2)" : (dark ? "#161B22" : "#EAEEF2");

        String html = text
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replaceAll("\\*\\*(.*?)\\*\\*", "<b>$1</b>")
                .replaceAll("\\*(.*?)\\*", "<i>$1</i>")
                .replaceAll("`(.*?)`", "<code style='background:" + codeBg + "; padding:2px 5px; border-radius:4px;'>$1</code>")
                .replace("\n", "<br/>");

        return "<html><body style='color:" + color + "; font-family: Segoe UI, sans-serif; font-size:12px; margin:0; padding:0;'>" + html + "</body></html>";
    }

    private void updateSuggestions(List<String> suggestions) {
        suggestionPanel.removeAll();
        if (suggestions != null && !suggestions.isEmpty()) {
            for (String suggestion : suggestions) {
                JButton chip = new JButton(suggestion);
                chip.setFont(new Font("Segoe UI", Font.PLAIN, 11));
                chip.putClientProperty(FlatClientProperties.BUTTON_TYPE, FlatClientProperties.BUTTON_TYPE_ROUND_RECT);
                chip.setBackground(bgCard);
                chip.setForeground(textPrimary);
                chip.setCursor(new Cursor(Cursor.HAND_CURSOR));
                chip.addActionListener(e -> {
                    inputField.setText(suggestion);
                    handleSendMessage();
                });
                suggestionPanel.add(chip);
            }
        }
        suggestionPanel.revalidate();
        suggestionPanel.repaint();
    }

    private void resetToNewChat() {
        chatContainer.removeAll();
        chatContainer.add(welcomeHeroPanel);
        welcomeHeroPanel.setVisible(true);
        engine.getContext().clear();
        updateSuggestions(Arrays.asList("What is CodeAlfa?", "What is NLP?", "What is TF-IDF?", "Tell me a joke", "calc 128 * 16 + 50"));
        chatContainer.revalidate();
        chatContainer.repaint();
    }

    private void exportChat() {
        JFileChooser fileChooser = new JFileChooser();
        fileChooser.setSelectedFile(new File("nexus_chat_transcript.txt"));
        int choice = fileChooser.showSaveDialog(this);
        if (choice == JFileChooser.APPROVE_OPTION) {
            File target = fileChooser.getSelectedFile();
            try (FileWriter writer = new FileWriter(target, StandardCharsets.UTF_8)) {
                writer.write("=== NexusAI Conversation Transcript ===\n");
                writer.write("Generated: " + new Date() + "\n\n");
                for (var msg : engine.getContext().getHistory()) {
                    writer.write(String.format("[%s] %s: %s\n\n",
                            new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date(msg.getTimestamp())),
                            msg.getSender().toUpperCase(),
                            msg.getText()));
                }
                JOptionPane.showMessageDialog(this, "Transcript exported to " + target.getName(), "Export Successful", JOptionPane.INFORMATION_MESSAGE);
            } catch (Exception e) {
                JOptionPane.showMessageDialog(this, "Error exporting transcript: " + e.getMessage(), "Export Error", JOptionPane.ERROR_MESSAGE);
            }
        }
    }

    private void openFaqManager() {
        FAQManagerDialog dialog = new FAQManagerDialog(this, engine);
        dialog.setVisible(true);
        int sampleCount = engine.getClassifier().getTrainingSampleCount();
        statusLabel.setText(String.format("• Online (%d Patterns | TF-IDF Cosine Model)", sampleCount));
    }

    private void toggleTheme() {
        isDarkMode = !isDarkMode;
        updateThemeColors();
        try {
            if (isDarkMode) {
                UIManager.setLookAndFeel(new FlatDarkLaf());
            } else {
                UIManager.setLookAndFeel(new FlatLightLaf());
            }
            SwingUtilities.updateComponentTreeUI(this);
        } catch (Exception ignored) {}
    }

    public static void launch(ChatbotEngine engine) {
        SwingUtilities.invokeLater(() -> {
            try {
                UIManager.setLookAndFeel(new FlatDarkLaf());
            } catch (Exception ignored) {}
            new ChatbotGUI(engine).setVisible(true);
        });
    }
}
