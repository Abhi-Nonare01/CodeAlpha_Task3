# 🤖 Java Artificial Intelligence Chatbot (CodeAlfa Task 3)

An intelligent, interactive AI Chatbot built in **Java 17** combining **Natural Language Processing (NLP)**, **Machine Learning Intent Classification (TF-IDF Vector Space Model + Cosine Similarity)**, a **Rule-based & Arithmetic Engine**, a **Real-time FAQ Training Manager**, and **Dual Modern Interfaces (Desktop Swing GUI & Embedded Web UI)**.

---

## 🌟 Key Features

1. **Natural Language Processing (NLP) Pipeline**:
   - **Contraction Normalization**: Resolves contractions like `i'm -> i am`, `what's -> what is`, `don't -> do not`.
   - **Tokenization & Cleaning**: Strips special punctuation and normalizes alphanumeric words.
   - **Stopword Removal**: Eliminates grammatical filler words while preserving key domain intent.
   - **Porter Stemmer**: Reduces words to root morphological stems (`computing`, `computer` $\rightarrow$ `comput`).
   - **TF-IDF Vectorizer**: Fits smooth Inverse Document Frequency weights $\log\left(\frac{1 + N}{1 + \text{DF}}\right) + 1$ and computes L2-normalized feature vectors.
   - **Cosine Similarity**: Vector-space cosine angle scoring $\cos(\theta) = \frac{A \cdot B}{\|A\| \|B\|}$.

2. **Machine Learning & Rule-based Hybrid Engine**:
   - **ML Intent Classifier**: Classifies queries against 27+ intent classes using nearest-neighbor pattern matching and class centroid vectors with confidence ranking.
   - **Rule Engine**: Evaluates recursive arithmetic formulas (`calc 25 * 4 + 10`, `sqrt(144)`), dynamic Date & Time inquiries, and user name memory (`My name is Alex` $\rightarrow$ `What is my name?`).
   - **Context & Dialog Memory**: Remembers user identity, conversation turn counts, and previous intents.
   - **Smart Fallbacks**: Suggests top alternative candidate intents when confidence is low.

3. **User Interfaces**:
   - **Desktop GUI (Swing + FlatLaf)**: Modern dark/light theme, rounded message bubbles, real-time typing animation, suggestion chips, chat transcript export, and interactive FAQ training modal.
   - **Embedded Web UI**: Built-in HTTP server (`http://localhost:8080`) serving a responsive HTML5/CSS3/JS chat interface and REST APIs (`/api/chat`, `/api/faqs`, `/api/train`, `/api/stats`).
   - **CLI Mode**: Interactive terminal chat for headless environments.

4. **Dynamic FAQ Training**:
   - Add new custom question-and-answer pairs live from the GUI or Web UI.
   - Triggers instant retraining of the vectorizer and ML intent classifier without restarting.

---

## 🏗️ Architecture Overview

```
                   +----------------------------------+
                   |  User Input (GUI / Web / CLI)    |
                   +-----------------+----------------+
                                     |
                                     v
                   +----------------------------------+
                   |     Text Preprocessor (NLP)      |
                   |  - Contraction Normalization     |
                   |  - Tokenizer & Stopword Filter   |
                   |  - Porter Stemming Algorithm     |
                   +-----------------+----------------+
                                     |
                                     v
                   +----------------------------------+
                   |       Chatbot Core Engine        |
                   +-----------------+----------------+
                                    / \
         +-------------------------+   +--------------------------+
         |                                                        |
         v                                                        v
+------------------+                                    +--------------------+
|   Rule Engine    |                                    | ML Intent Classifier|
| - Math Evaluator |                                    | - TF-IDF Vectors   |
| - Time & Date    |                                    | - Cosine Similarity|
| - Name Memory    |                                    | - Centroid Ranking |
+--------+---------+                                    +---------+----------+
         |                                                        |
         |                                                        v
         |                                              +--------------------+
         |                                              | FAQ Knowledge Base |
         |                                              | (faqs.json / custom|
         |                                              +--------------------+
         \                                                        /
          \                                                      /
           +-------------------------+--------------------------+
                                     |
                                     v
                   +----------------------------------+
                   | Response Generator & Suggestions |
                   +----------------------------------+
```

---

## 📂 Project Structure

```
AiChatbot/
├── pom.xml
├── README.md
├── src/
│   ├── main/
│   │   ├── java/com/codealfa/chatbot/
│   │   │   ├── Main.java                        # Entry Point (GUI / Web / CLI launcher)
│   │   │   ├── nlp/
│   │   │   │   ├── Tokenizer.java               # Text normalization & token splitting
│   │   │   │   ├── StopWords.java               # Stop words filtering
│   │   │   │   ├── PorterStemmer.java           # Pure Java Porter Stemming algorithm
│   │   │   │   ├── TextPreprocessor.java        # NLP pipeline orchestrator
│   │   │   │   ├── TfIdfVectorizer.java         # TF-IDF matrix & vector calculation
│   │   │   │   └── CosineSimilarity.java        # Vector cosine similarity
│   │   │   ├── ml/
│   │   │   │   ├── TrainingSample.java          # Sample data representation
│   │   │   │   ├── ClassificationResult.java    # Prediction output & scored candidates
│   │   │   │   └── IntentClassifier.java        # TF-IDF + Cosine Similarity classifier
│   │   │   ├── engine/
│   │   │   │   ├── Intent.java                  # Intent & FAQ data model
│   │   │   │   ├── KnowledgeBase.java           # JSON FAQ manager & trainer
│   │   │   │   ├── ConversationContext.java     # Dialog memory & state
│   │   │   │   ├── RuleEngine.java              # Math, Time, Name memory evaluator
│   │   │   │   └── ChatbotEngine.java           # Central controller
│   │   │   ├── gui/
│   │   │   │   ├── ChatbotGUI.java              # Swing + FlatLaf UI
│   │   │   │   └── FAQManagerDialog.java        # FAQ table & retraining editor
│   │   │   └── web/
│   │   │       └── WebServer.java               # Embedded HTTP server & REST APIs
│   │   └── resources/
│   │       ├── faqs.json                        # Default FAQ dataset (27+ intents)
│   │       └── web/
│   │           ├── index.html                   # Web Chat Single Page App
│   │           ├── style.css                    # Modern UI styles & themes
│   │           └── app.js                       # Frontend JavaScript controller
│   └── test/
│       └── java/com/codealfa/chatbot/
│           ├── nlp/NLPTest.java                 # Tokenizer, Stemmer, TF-IDF tests
│           └── engine/ChatbotEngineTest.java    # Classifier & Rule tests
```

---

## 🚀 How to Run

### Prerequisites
- **Java 17** or higher (`java -version`)
- **Apache Maven 3.8+** (`mvn -version`)

### 1. Build and Run Tests
```bash
mvn clean test
```

### 2. Package Executable Fat JAR
```bash
mvn clean package -DskipTests
```
The executable JAR is generated at `target/ai-chatbot-1.0.0.jar`.

### 3. Launch Modes

#### Modern Desktop GUI (Default):
```bash
java -jar target/ai-chatbot-1.0.0.jar
```

#### Embedded Web Interface:
```bash
java -jar target/ai-chatbot-1.0.0.jar --web
```
Open your browser and navigate to: **`http://localhost:8080`**

#### Interactive CLI Terminal Mode:
```bash
java -jar target/ai-chatbot-1.0.0.jar --cli
```

#### Dual Mode (Both Desktop GUI and Web Server):
```bash
java -jar target/ai-chatbot-1.0.0.jar --both
```

---

## 💡 Example Conversations & Queries

| Category | Example User Query | Bot Response Type |
| :--- | :--- | :--- |
| **Greetings** | `"Hello bot!"` | ML Intent: `greeting` |
| **CodeAlfa Info** | `"Tell me about CodeAlfa tasks"` | ML Intent: `codealfa_tasks` |
| **NLP Theory** | `"What is TF-IDF and Cosine Similarity?"` | ML Intent: `tfidf_explanation` / `cosine_similarity` |
| **Java Knowledge** | `"What is the difference between HashMap and Hashtable?"` | ML Intent: `java_collections` |
| **Arithmetic** | `"calc (125 * 4) + sqrt(144)"` | Rule Engine: `512` |
| **Time & Date** | `"What time is it?"` / `"What is today's date?"` | Rule Engine: Current System Time & Date |
| **Memory** | `"My name is Sarah"` $\rightarrow$ `"What is my name?"` | Rule Engine: `"Your name is Sarah!"` |
| **Fun & Small Talk** | `"Tell me a programming joke"` | ML Intent: `joke` |

---

## 🧪 Unit Testing Results

All 12 automated unit tests pass successfully:
- `NLPTest`: Contraction expansion, StopWords filtering, Porter Stemmer root reduction, TF-IDF vector fitting, and Cosine similarity computation.
- `ChatbotEngineTest`: Classification accuracy, Arithmetic rule evaluation, Time/Date lookups, Name memory persistence, and dynamic FAQ addition with real-time model retraining.
