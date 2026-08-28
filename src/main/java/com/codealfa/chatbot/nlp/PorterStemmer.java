package com.codealfa.chatbot.nlp;

/**
 * Porter Stemmer implementation in pure Java.
 * Reduces English words to their morphological roots (stems).
 * Based on Martin Porter's 1980 stemming algorithm.
 */
public class PorterStemmer {

    private char[] b;
    private int i, i_end, j, k;

    public PorterStemmer() {
        b = new char[50];
        i = 0;
        i_end = 0;
    }

    /**
     * Stems a single word string and returns the root form.
     */
    public synchronized String stemWord(String word) {
        if (word == null || word.length() <= 2) {
            return word;
        }
        word = word.toLowerCase();
        setWord(word);
        stem();
        return toString();
    }

    private void setWord(String word) {
        i = 0;
        for (int c = 0; c < word.length(); c++) {
            add(word.charAt(c));
        }
    }

    private void add(char ch) {
        if (i == b.length) {
            char[] new_b = new char[i + 50];
            System.arraycopy(b, 0, new_b, 0, i);
            b = new_b;
        }
        b[i++] = ch;
    }

    @Override
    public String toString() {
        return new String(b, 0, i_end);
    }

    private boolean cons(int i) {
        switch (b[i]) {
            case 'a': case 'e': case 'i': case 'o': case 'u': return false;
            case 'y': return (i == 0) || !cons(i - 1);
            default: return true;
        }
    }

    private int m() {
        int n = 0;
        int i_idx = 0;
        while (true) {
            if (i_idx > j) return n;
            if (!cons(i_idx)) break;
            i_idx++;
        }
        i_idx++;
        while (true) {
            while (true) {
                if (i_idx > j) return n;
                if (cons(i_idx)) break;
                i_idx++;
            }
            i_idx++;
            n++;
            while (true) {
                if (i_idx > j) return n;
                if (!cons(i_idx)) break;
                i_idx++;
            }
            i_idx++;
        }
    }

    private boolean vowelinstem() {
        for (int i_idx = 0; i_idx <= j; i_idx++) {
            if (!cons(i_idx)) return true;
        }
        return false;
    }

    private boolean doublec(int i_idx) {
        if (i_idx < 1) return false;
        if (b[i_idx] != b[i_idx - 1]) return false;
        return cons(i_idx);
    }

    private boolean cvc(int i_idx) {
        if (i_idx < 2 || !cons(i_idx) || cons(i_idx - 1) || !cons(i_idx - 2)) return false;
        int ch = b[i_idx];
        return ch != 'w' && ch != 'x' && ch != 'y';
    }

    private boolean ends(String s) {
        int l = s.length();
        int o = k - l + 1;
        if (o < 0) return false;
        for (int i_idx = 0; i_idx < l; i_idx++) {
            if (b[o + i_idx] != s.charAt(i_idx)) return false;
        }
        j = k - l;
        return true;
    }

    private void setto(String s) {
        int l = s.length();
        int o = j + 1;
        for (int i_idx = 0; i_idx < l; i_idx++) {
            b[o + i_idx] = s.charAt(i_idx);
        }
        k = j + l;
    }

    private void r(String s) {
        if (m() > 0) setto(s);
    }

    private void step1() {
        if (b[k] == 's') {
            if (ends("sses")) k -= 2;
            else if (ends("ies")) setto("i");
            else if (b[k - 1] != 's') k--;
        }
        if (ends("eed")) {
            if (m() > 0) k--;
        } else if ((ends("ed") || ends("ing")) && vowelinstem()) {
            k = j;
            if (ends("at")) setto("ate");
            else if (ends("bl")) setto("ble");
            else if (ends("iz")) setto("ize");
            else if (doublec(k)) {
                k--;
                int ch = b[k];
                if (ch == 'l' || ch == 's' || ch == 'z') k++;
            } else if (m() == 1 && cvc(k)) setto("e");
        }
    }

    private void step2() {
        if (ends("y") && vowelinstem()) b[k] = 'i';
    }

    private void step3() {
        if (k == 0) return;
        switch (b[k - 1]) {
            case 'a':
                if (ends("ational")) { r("ate"); break; }
                if (ends("tional")) { r("tion"); break; }
                break;
            case 'c':
                if (ends("enci")) { r("ence"); break; }
                if (ends("anci")) { r("ance"); break; }
                break;
            case 'e':
                if (ends("izer")) { r("ize"); break; }
                break;
            case 'l':
                if (ends("bli")) { r("ble"); break; }
                if (ends("alli")) { r("al"); break; }
                if (ends("entli")) { r("ent"); break; }
                if (ends("eli")) { r("e"); break; }
                if (ends("ousli")) { r("ous"); break; }
                break;
            case 'o':
                if (ends("ization")) { r("ize"); break; }
                if (ends("ation")) { r("ate"); break; }
                if (ends("ator")) { r("ate"); break; }
                break;
            case 's':
                if (ends("alism")) { r("al"); break; }
                if (ends("iveness")) { r("ive"); break; }
                if (ends("fulness")) { r("ful"); break; }
                if (ends("ousness")) { r("ous"); break; }
                break;
            case 't':
                if (ends("aliti")) { r("al"); break; }
                if (ends("iviti")) { r("ive"); break; }
                if (ends("biliti")) { r("ble"); break; }
                break;
            case 'g':
                if (ends("logi")) { r("log"); break; }
                break;
        }
    }

    private void step4() {
        switch (b[k]) {
            case 'e':
                if (ends("icate")) { r("ic"); break; }
                if (ends("ative")) { r(""); break; }
                if (ends("alize")) { r("al"); break; }
                break;
            case 'i':
                if (ends("iciti")) { r("ic"); break; }
                break;
            case 'l':
                if (ends("ical")) { r("ic"); break; }
                if (ends("ful")) { r(""); break; }
                break;
            case 's':
                if (ends("ness")) { r(""); break; }
                break;
        }
    }

    private void step5() {
        if (k == 0) return;
        switch (b[k - 1]) {
            case 'a':
                if (ends("al")) break;
                return;
            case 'c':
                if (ends("ance") || ends("ence")) break;
                return;
            case 'e':
                if (ends("er")) break;
                return;
            case 'i':
                if (ends("ic")) break;
                return;
            case 'l':
                if (ends("able") || ends("ible")) break;
                return;
            case 'n':
                if (ends("ant") || ends("ement") || ends("ment") || ends("ent")) break;
                return;
            case 'o':
                if (ends("ion") && j >= 0 && (b[j] == 's' || b[j] == 't')) break;
                if (ends("ou")) break;
                return;
            case 's':
                if (ends("ism")) break;
                return;
            case 't':
                if (ends("ate") || ends("iti")) break;
                return;
            case 'u':
                if (ends("ous")) break;
                return;
            case 'v':
                if (ends("ive")) break;
                return;
            case 'z':
                if (ends("ize")) break;
                return;
            default:
                return;
        }
        if (m() > 1) k = j;
    }

    private void step6() {
        j = k;
        if (b[k] == 'e') {
            int a = m();
            if (a > 1 || (a == 1 && !cvc(k - 1))) k--;
        }
        if (b[k] == 'l' && doublec(k) && m() > 1) k--;
    }

    private void stem() {
        k = i - 1;
        if (k > 1) {
            step1();
            step2();
            step3();
            step4();
            step5();
            step6();
        }
        i_end = k + 1;
        i = 0;
    }
}
