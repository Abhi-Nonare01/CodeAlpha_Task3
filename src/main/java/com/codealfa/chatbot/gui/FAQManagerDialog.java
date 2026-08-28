package com.codealfa.chatbot.gui;

import com.codealfa.chatbot.engine.ChatbotEngine;
import com.codealfa.chatbot.engine.Intent;
import com.codealfa.chatbot.engine.KnowledgeBase;
import com.formdev.flatlaf.FlatClientProperties;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.table.DefaultTableModel;
import javax.swing.table.TableRowSorter;
import java.awt.*;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Modern FAQ Knowledge Base & Model Trainer Dialog with FlatLaf styling.
 */
public class FAQManagerDialog extends JDialog {

    private final ChatbotEngine engine;
    private final KnowledgeBase kb;
    private JTable faqTable;
    private DefaultTableModel tableModel;
    private TableRowSorter<DefaultTableModel> sorter;
    private JTextField searchField;

    public FAQManagerDialog(JFrame parent, ChatbotEngine engine) {
        super(parent, "Knowledge Base & Model Trainer", true);
        this.engine = engine;
        this.kb = engine.getKnowledgeBase();
        initUI();
        loadTableData();
    }

    private void initUI() {
        setSize(880, 540);
        setLocationRelativeTo(getParent());
        setLayout(new BorderLayout());

        // Top Toolbar
        JPanel topPanel = new JPanel(new BorderLayout(10, 0));
        topPanel.setBorder(new EmptyBorder(14, 18, 14, 18));

        JLabel titleLabel = new JLabel("Trained Intents & Knowledge Patterns");
        titleLabel.setFont(new Font("Segoe UI", Font.BOLD, 15));
        topPanel.add(titleLabel, BorderLayout.WEST);

        JPanel searchPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 6, 0));
        searchPanel.add(new JLabel("Search:"));
        searchField = new JTextField(20);
        searchField.putClientProperty(FlatClientProperties.PLACEHOLDER_TEXT, "Filter by intent or query...");
        searchField.addCaretListener(e -> {
            String query = searchField.getText();
            if (query.trim().isEmpty()) {
                sorter.setRowFilter(null);
            } else {
                sorter.setRowFilter(RowFilter.regexFilter("(?i)" + query));
            }
        });
        searchPanel.add(searchField);
        topPanel.add(searchPanel, BorderLayout.EAST);

        add(topPanel, BorderLayout.NORTH);

        // Table
        String[] columns = {"Intent Tag", "Category", "Patterns Count", "Responses Count", "Sample Pattern"};
        tableModel = new DefaultTableModel(columns, 0) {
            @Override
            public boolean isCellEditable(int row, int column) {
                return false;
            }
        };

        faqTable = new JTable(tableModel);
        faqTable.setRowHeight(28);
        faqTable.setFont(new Font("Segoe UI", Font.PLAIN, 13));
        faqTable.getTableHeader().setFont(new Font("Segoe UI", Font.BOLD, 13));
        faqTable.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);

        sorter = new TableRowSorter<>(tableModel);
        faqTable.setRowSorter(sorter);

        JScrollPane scrollPane = new JScrollPane(faqTable);
        scrollPane.setBorder(new EmptyBorder(0, 18, 0, 18));
        add(scrollPane, BorderLayout.CENTER);

        // Bottom Action Buttons
        JPanel bottomPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 10, 14));
        bottomPanel.setBorder(new EmptyBorder(8, 18, 14, 18));

        JButton addBtn = new JButton("+ Add New FAQ");
        addBtn.putClientProperty(FlatClientProperties.BUTTON_TYPE, FlatClientProperties.BUTTON_TYPE_ROUND_RECT);
        addBtn.setBackground(new Color(59, 130, 246));
        addBtn.setForeground(Color.WHITE);
        addBtn.addActionListener(e -> showAddEditDialog(null));

        JButton editBtn = new JButton("Edit Selected");
        editBtn.addActionListener(e -> {
            int selectedRow = faqTable.getSelectedRow();
            if (selectedRow >= 0) {
                int modelRow = faqTable.convertRowIndexToModel(selectedRow);
                String tag = (String) tableModel.getValueAt(modelRow, 0);
                kb.getIntentByTag(tag).ifPresent(this::showAddEditDialog);
            } else {
                JOptionPane.showMessageDialog(this, "Please select an FAQ to edit.", "Selection Required", JOptionPane.WARNING_MESSAGE);
            }
        });

        JButton deleteBtn = new JButton("Delete Selected");
        deleteBtn.addActionListener(e -> {
            int selectedRow = faqTable.getSelectedRow();
            if (selectedRow >= 0) {
                int modelRow = faqTable.convertRowIndexToModel(selectedRow);
                String tag = (String) tableModel.getValueAt(modelRow, 0);
                int confirm = JOptionPane.showConfirmDialog(this, "Are you sure you want to delete FAQ '" + tag + "'?", "Confirm Deletion", JOptionPane.YES_NO_OPTION);
                if (confirm == JOptionPane.YES_OPTION) {
                    kb.deleteIntent(tag);
                    engine.retrain();
                    loadTableData();
                    JOptionPane.showMessageDialog(this, "FAQ deleted and model retrained!", "Success", JOptionPane.INFORMATION_MESSAGE);
                }
            } else {
                JOptionPane.showMessageDialog(this, "Please select an FAQ to delete.", "Selection Required", JOptionPane.WARNING_MESSAGE);
            }
        });

        JButton retrainBtn = new JButton("Retrain Model");
        retrainBtn.setBackground(new Color(16, 185, 129));
        retrainBtn.setForeground(Color.WHITE);
        retrainBtn.addActionListener(e -> {
            engine.retrain();
            JOptionPane.showMessageDialog(this,
                    String.format("Model successfully retrained!\n• Training Samples: %d\n• Vocabulary Size: %d",
                            engine.getClassifier().getTrainingSampleCount(),
                            engine.getClassifier().getVocabularySize()),
                    "Retraining Complete", JOptionPane.INFORMATION_MESSAGE);
        });

        JButton closeBtn = new JButton("Close");
        closeBtn.addActionListener(e -> dispose());

        bottomPanel.add(addBtn);
        bottomPanel.add(editBtn);
        bottomPanel.add(deleteBtn);
        bottomPanel.add(retrainBtn);
        bottomPanel.add(closeBtn);

        add(bottomPanel, BorderLayout.SOUTH);
    }

    private void loadTableData() {
        tableModel.setRowCount(0);
        for (Intent intent : kb.getIntents()) {
            int patternCount = intent.getPatterns() != null ? intent.getPatterns().size() : 0;
            int responseCount = intent.getResponses() != null ? intent.getResponses().size() : 0;
            String sample = (intent.getPatterns() != null && !intent.getPatterns().isEmpty())
                    ? intent.getPatterns().get(0) : "";

            tableModel.addRow(new Object[]{
                    intent.getTag(),
                    intent.getCategory() != null ? intent.getCategory() : "General",
                    patternCount,
                    responseCount,
                    sample
            });
        }
    }

    private void showAddEditDialog(Intent existingIntent) {
        boolean isEdit = existingIntent != null;
        JDialog editDialog = new JDialog(this, isEdit ? "Edit FAQ Intent" : "Add New FAQ Intent", true);
        editDialog.setSize(560, 490);
        editDialog.setLocationRelativeTo(this);
        editDialog.setLayout(new BorderLayout(10, 10));

        JPanel form = new JPanel(new GridLayout(4, 1, 8, 8));
        form.setBorder(new EmptyBorder(16, 18, 16, 18));

        // Tag Field
        JPanel tagPanel = new JPanel(new BorderLayout(5, 0));
        tagPanel.add(new JLabel("Intent Tag (e.g. 'java_streams'):"), BorderLayout.NORTH);
        JTextField tagField = new JTextField(isEdit ? existingIntent.getTag() : "");
        if (isEdit) tagField.setEnabled(false);
        tagPanel.add(tagField, BorderLayout.CENTER);
        form.add(tagPanel);

        // Category Field
        JPanel catPanel = new JPanel(new BorderLayout(5, 0));
        catPanel.add(new JLabel("Category (e.g. 'Java', 'AI', 'General'):"), BorderLayout.NORTH);
        JTextField catField = new JTextField(isEdit ? existingIntent.getCategory() : "General");
        catPanel.add(catField, BorderLayout.CENTER);
        form.add(catPanel);

        // Patterns Text Area
        JPanel patPanel = new JPanel(new BorderLayout(5, 0));
        patPanel.add(new JLabel("User Questions / Training Phrases (one per line):"), BorderLayout.NORTH);
        JTextArea patArea = new JTextArea(isEdit ? String.join("\n", existingIntent.getPatterns()) : "", 4, 30);
        patPanel.add(new JScrollPane(patArea), BorderLayout.CENTER);
        form.add(patPanel);

        // Responses Text Area
        JPanel respPanel = new JPanel(new BorderLayout(5, 0));
        respPanel.add(new JLabel("Bot Responses / Answers (one per line):"), BorderLayout.NORTH);
        JTextArea respArea = new JTextArea(isEdit ? String.join("\n", existingIntent.getResponses()) : "", 4, 30);
        respPanel.add(new JScrollPane(respArea), BorderLayout.CENTER);
        form.add(respPanel);

        editDialog.add(form, BorderLayout.CENTER);

        JPanel btnPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 10, 12));
        JButton saveBtn = new JButton("Save & Retrain");
        saveBtn.setBackground(new Color(59, 130, 246));
        saveBtn.setForeground(Color.WHITE);

        saveBtn.addActionListener(e -> {
            String tag = tagField.getText().trim();
            String cat = catField.getText().trim();
            List<String> patterns = Arrays.stream(patArea.getText().split("\\n"))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());

            List<String> responses = Arrays.stream(respArea.getText().split("\\n"))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());

            if (tag.isEmpty()) {
                JOptionPane.showMessageDialog(editDialog, "Tag cannot be empty.", "Validation Error", JOptionPane.ERROR_MESSAGE);
                return;
            }
            if (patterns.isEmpty()) {
                JOptionPane.showMessageDialog(editDialog, "Please provide at least one training pattern.", "Validation Error", JOptionPane.ERROR_MESSAGE);
                return;
            }
            if (responses.isEmpty()) {
                JOptionPane.showMessageDialog(editDialog, "Please provide at least one response.", "Validation Error", JOptionPane.ERROR_MESSAGE);
                return;
            }

            Intent newIntent = new Intent(tag, cat.isEmpty() ? "General" : cat, patterns, responses);
            kb.addOrUpdateIntent(newIntent);
            engine.retrain();
            loadTableData();
            editDialog.dispose();
            JOptionPane.showMessageDialog(this, "FAQ saved and model retrained successfully!", "Success", JOptionPane.INFORMATION_MESSAGE);
        });

        JButton cancelBtn = new JButton("Cancel");
        cancelBtn.addActionListener(e -> editDialog.dispose());

        btnPanel.add(saveBtn);
        btnPanel.add(cancelBtn);
        editDialog.add(btnPanel, BorderLayout.SOUTH);

        editDialog.setVisible(true);
    }
}
