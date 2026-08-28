package com.codealfa.chatbot.nlp;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Provides natural conversational responses in Hindi and Hinglish for all chatbot intents.
 */
public class LanguageAdapter {

    private static final Map<String, List<String>> HINDI_RESPONSES = new HashMap<>();
    private static final Map<String, List<String>> HINGLISH_RESPONSES = new HashMap<>();
    private static final Random random = new Random();

    static {
        // --- HINDI (हिंदी) ---
        HINDI_RESPONSES.put("greeting", List.of(
                "नमस्ते! मैं आपका NexusAI सहायक हूँ। आज मैं आपकी क्या मदद कर सकता हूँ?",
                "प्रणाम! आप AI, NLP, Java या CodeAlfa इंटर्नशिप के बारे में मुझसे कुछ भी पूछ सकते हैं।"
        ));
        HINDI_RESPONSES.put("goodbye", List.of(
                "अलविदा! आपका दिन शुभ और सफल रहे। जब भी ज़रूरत हो, वापस आएं!",
                "नमस्ते! फिर मिलेंगे। अपना ख्याल रखें।"
        ));
        HINDI_RESPONSES.put("thanks", List.of(
                "आपका बहुत-बहुत स्वागत है! अगर कोई और सवाल हो तो ज़रूर पूछें।",
                "मुझे आपकी मदद करके बहुत खुशी हुई! 😊"
        ));
        HINDI_RESPONSES.put("bot_identity", List.of(
                "मैं NexusAI हूँ - एक बुद्धिमान Java NLP और Machine Learning आधारित चैटबॉट, जो CodeAlfa Internship Task 3 के लिए बनाया गया है।"
        ));
        HINDI_RESPONSES.put("codealfa_info", List.of(
                "CodeAlfa एक प्रसिद्ध सॉफ्टवेयर और वर्चुअल इंटर्नशिप प्लेटफॉर्म है, जो छात्रों को Java, AI और वेब डेवलपमेंट में वास्तविक प्रोजेक्ट्स पर काम करने का अवसर देता है।"
        ));
        HINDI_RESPONSES.put("codealfa_tasks", List.of(
                "CodeAlfa Java इंटर्नशिप में 3 मुख्य प्रोजेक्ट्स हैं:\n• **Task 1**: Student Grade Tracker\n• **Task 2**: Hotel Reservation System\n• **Task 3**: Artificial Intelligence Chatbot (जो मैं हूँ!)।"
        ));
        HINDI_RESPONSES.put("nlp_explanation", List.of(
                "**Natural Language Processing (NLP)** आर्टिफिशियल इंटेलिजेंस की वह शाखा है जो कंप्यूटर को मानव भाषा समझने और प्रोसेस करने में सक्षम बनाती है। इसके मुख्य चरण हैं:\n1. **Tokenization**: वाक्यों को शब्दों में विभाजित करना।\n2. **Stopwords Removal**: अनावश्यक शब्दों को हटाना।\n3. **Porter Stemming**: शब्दों को उनके मूल रूप में बदलना।\n4. **TF-IDF और Cosine Similarity**: गणितीय वेक्टर बनाकर समानता खोजना।"
        ));
        HINDI_RESPONSES.put("tfidf_explanation", List.of(
                "**TF-IDF** का मतलब **Term Frequency - Inverse Document Frequency** है। यह मापता है कि कोई शब्द किसी वाक्य में कितना महत्वपूर्ण और अनोखा है।"
        ));
        HINDI_RESPONSES.put("java_basics", List.of(
                "**Java** एक उच्च-स्तरीय, क्लास-आधारित, ऑब्जेक्ट-ओरिएंटेड और प्लेटफॉर्म-इंडिपेंडेंट प्रोग्रामिंग भाषा है।\n• **मुख्य विशेषताएं**:\n1. **Platform Independence**: 'Write Once, Run Anywhere' (WORA) - Java कोड JVM पर चलता है।\n2. **Automatic Memory Management**: Garbage Collector गैर-ज़रूरी मेमोरी को अपने आप साफ़ करता है।\n3. **Object-Oriented**: Classes, Objects, Inheritance, Polymorphism, Encapsulation aur Abstraction पर आधारित।\n4. **सुरक्षित एवं मज़बूत**: Exception Handling और Bytecode Verifier के साथ सुरक्षित।"
        ));
        HINDI_RESPONSES.put("java_collections", List.of(
                "**HashMap vs Hashtable in Java**:\n• **HashMap**: सिंक्रोनाइज़्ड नहीं होता (तेज़ है) और `null` की अनुमति देता है।\n• **Hashtable**: थ्रेड-सेफ (सिंक्रोनाइज़्ड) है और `null` की अनुमति नहीं देता।"
        ));
        HINDI_RESPONSES.put("oop_concepts", List.of(
                "**Object-Oriented Programming (OOP) के 4 मुख्य स्तंभ**:\n1. **Encapsulation**: डेटा और मेथड्स को एक यूनिट (class) में बाँधना।\n2. **Inheritance**: पैरेंट क्लास के गुणों को चाइल्ड क्लास में हासिल करना (`extends`)।\n3. **Polymorphism**: एक ही मेथड का अलग-अलग रूपों में काम करना (Overloading / Overriding)।\n4. **Abstraction**: केवल ज़रूरी जानकारी दिखाना और आंतरिक विवरण छुपाना (Interfaces/Abstract classes)।"
        ));
        HINDI_RESPONSES.put("python_basics", List.of(
                "**Python** एक बहुत ही सरल, पठनीय और शक्तिशाली प्रोग्रामिंग भाषा है जिसका उपयोग AI, Data Science, Web Development और Automation में बड़े पैमाने पर होता है।"
        ));
        HINDI_RESPONSES.put("sql_database", List.of(
                "**SQL (Structured Query Language)** रिलेशनल डेटाबेस (जैसे MySQL, PostgreSQL) में डेटा को स्टोर, रिट्रीव और मैनेज करने के लिए इस्तेमाल की जाने वाली भाषा है।"
        ));
        HINDI_RESPONSES.put("joke", List.of(
                "Java डेवलपर्स चश्मा क्यों पहनते हैं? क्योंकि वे C# (सी-शार्प) नहीं देख सकते! 😄",
                "दुनिया में 10 तरह के लोग होते हैं: वो जो बाइनरी समझते हैं, और वो जो नहीं समझते! 😂"
        ));

        // --- HINGLISH (Roman Hindi) ---
        HINGLISH_RESPONSES.put("greeting", List.of(
                "Namaste! Main aapka NexusAI assistant hoon. Aaj main aapki kya help kar sakta hoon?",
                "Hello ji! NexusAI me aapka swagat hai. AI, Java, Math ya CodeAlfa ke baare me kuch bhi poochiye!"
        ));
        HINGLISH_RESPONSES.put("goodbye", List.of(
                "Alvida! Have a great day! Jab bhi koi doubt ho, wapas aa jaiyega! 😊",
                "Bye bye! Take care, aapse baat karke accha laga!"
        ));
        HINGLISH_RESPONSES.put("thanks", List.of(
                "You're welcome! Aur koi sawaal ho toh bejhijhak poochiye!",
                "Koi baat nahi ji! Mujhe aapki help karke bohot khushi hui! 😊"
        ));
        HINGLISH_RESPONSES.put("bot_identity", List.of(
                "Main NexusAI hoon - Java 17, NLP aur Machine Learning par bana ek smart chatbot jo CodeAlfa Internship Task 3 ke liye tayar kiya gaya hai."
        ));
        HINGLISH_RESPONSES.put("codealfa_info", List.of(
                "CodeAlfa ek leading software platform hai jo students ko practical virtual internships provide karta hai. Isme Java, AI aur Web Development ke industry projects sikhaye jaate hain."
        ));
        HINGLISH_RESPONSES.put("codealfa_tasks", List.of(
                "CodeAlfa Java Internship ke tasks ye hain:\n• **Task 1**: Student Grade Tracker\n• **Task 2**: Hotel Reservation System\n• **Task 3**: Artificial Intelligence Chatbot (Jo main hoon! 🤖)\nHar task ka code GitHub par daal kar LinkedIn par share karna hota hai."
        ));
        HINGLISH_RESPONSES.put("nlp_explanation", List.of(
                "**NLP (Natural Language Processing)** Artificial Intelligence ki field hai jisse computers insani bhasha (human language) ko samajh sakte hain. Is chatbot me use hone wale stages:\n1. **Tokenization**: Sentence ko words me todna.\n2. **Stopwords Filter**: Faaltu words (is, the, a) hatana.\n3. **Porter Stemming**: Words ko unki root form me convert karna (e.g. programming -> program).\n4. **TF-IDF & Cosine Similarity**: Mathematical vectors bana kar sabse matching answer dhundhna."
        ));
        HINGLISH_RESPONSES.put("tfidf_explanation", List.of(
                "**TF-IDF** ka full form hai **Term Frequency - Inverse Document Frequency**.\n• **TF**: Batata hai ki ek word sentence me kitni baar aaya.\n• **IDF**: Batata hai ki wo word pure dataset me kitna unique/important hai.\nIn dono ko multiply karke chatbot samajhta hai ki aapka main sawaal kya hai!"
        ));
        HINGLISH_RESPONSES.put("java_basics", List.of(
                "**Java** ek high-level, object-oriented aur platform-independent programming language hai.\n• **Main Features**:\n1. **Platform Independence**: 'Write Once, Run Anywhere' (WORA) - Java ka bytecode kisi bhi OS ke JVM par chal sakta hai.\n2. **Garbage Collection**: Unused memory ko automatically free karta hai.\n3. **Object-Oriented**: Classes, Objects, Inheritance, Polymorphism par based hai.\n4. **Rich Ecosystem**: Spring Boot, Hibernate, JavaFX, Swing jaisi hazaron libraries provide karta hai."
        ));
        HINGLISH_RESPONSES.put("java_collections", List.of(
                "**HashMap aur Hashtable me main differences**:\n• **HashMap**: Fast hota hai, synchronized nahi hota, aur `null` keys/values allow karta hai.\n• **Hashtable**: Thread-safe (synchronized) hota hai lekin slow hota hai aur `null` allow nahi karta."
        ));
        HINGLISH_RESPONSES.put("oop_concepts", List.of(
                "**OOP ke 4 Main Pillars**:\n1. **Encapsulation**: Data aur methods ko class ke andar wrap karna.\n2. **Inheritance**: Parent class ke code ko reuse karna (`extends`).\n3. **Polymorphism**: Ek hi method ko alag forms me use karna (Overloading/Overriding).\n4. **Abstraction**: Backend implementation ko hide karke simple interface provide karna."
        ));
        HINGLISH_RESPONSES.put("python_basics", List.of(
                "**Python** ek easy-to-learn aur versatile programming language hai jo AI, Machine Learning, Data Science aur Web development me bohot popular hai."
        ));
        HINGLISH_RESPONSES.put("sql_database", List.of(
                "**SQL (Structured Query Language)** relational databases (MySQL, PostgreSQL) me data create, read, update aur delete (CRUD) karne ke kaam aati hai."
        ));
        HINGLISH_RESPONSES.put("joke", List.of(
                "Java programmers chashma kyu pehante hain? Kyunki unhe C# (C-Sharp) nahi dikhta! 😄",
                "Ek programmer beach par gaya... usne samundar dekha aur bola: 'Kitna bada data lake hai!' 😂"
        ));
    }

    /**
     * Adapts response to the detected language.
     */
    public static String adapt(String intentTag, String englishResponse, LanguageDetector.Language lang) {
        if (lang == LanguageDetector.Language.HINDI) {
            List<String> list = HINDI_RESPONSES.get(intentTag);
            if (list != null && !list.isEmpty()) {
                return list.get(random.nextInt(list.size()));
            }
        } else if (lang == LanguageDetector.Language.HINGLISH) {
            List<String> list = HINGLISH_RESPONSES.get(intentTag);
            if (list != null && !list.isEmpty()) {
                return list.get(random.nextInt(list.size()));
            }
        }
        return englishResponse;
    }

    /**
     * Formats fallback response in the appropriate language.
     */
    public static String getFallback(LanguageDetector.Language lang) {
        if (lang == LanguageDetector.Language.HINDI) {
            return "माफ़ कीजिये, मैं आपका सवाल पूरी तरह नहीं समझ पाया। क्या आप इसे थोड़ा स्पष्ट रूप से पूछ सकते हैं? (जैसे AI, Java, CodeAlfa, या गणित गणना `calc 50*4`)।";
        } else if (lang == LanguageDetector.Language.HINGLISH) {
            return "Mujhe aapka sawaal theek se samajh nahi aaya. Kya aap thoda rephrase karke pooch sakte hain? (Jaise 'NLP kya hai', 'CodeAlfa tasks', ya calculation 'calc 50*4').";
        }
        return "I'm not quite sure I understood that question. Could you please rephrase it or try asking about AI, Java, CodeAlfa, or calculations?";
    }
}
