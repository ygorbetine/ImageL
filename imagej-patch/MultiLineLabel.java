package ij.gui;
import java.awt.*;
import java.util.*;

/** ImageL: substitui o Canvas original (que nao desenha texto de forma confiavel no CheerpJ: dialogos de mensagem/erro
 *  ficavam vazios) por um Panel com um java.awt.Label por linha. Mesma API publica usada pelo ImageJ. */
public class MultiLineLabel extends Panel {
    String[] lines;
    int num_lines;
    int min_width;

    public MultiLineLabel(String label) { init(label); }

    public MultiLineLabel(String label, int minimumWidth) { init(label); min_width = minimumWidth; }

    private void init(String text) {
        removeAll();
        StringTokenizer t = new StringTokenizer(text == null ? "" : text, "\n");
        num_lines = t.countTokens();
        lines = new String[num_lines];
        setLayout(new GridLayout(Math.max(1, num_lines), 1, 0, 0));
        for (int i = 0; i < num_lines; i++) {
            lines[i] = t.nextToken();
            Label l = new Label(lines[i].length() == 0 ? " " : lines[i], Label.LEFT);
            if (getFont() != null) l.setFont(getFont());
            add(l);
        }
    }

    public void setText(String text) {
        init(text);
        invalidate();
        validate();
    }

    public void setFont(Font f) {
        super.setFont(f);
        for (Component c : getComponents()) c.setFont(f);
    }

    public Dimension getPreferredSize() {
        Dimension d = super.getPreferredSize();
        return new Dimension(Math.max(min_width, d.width + 12), d.height + 20);
    }

    public Dimension getMinimumSize() { return getPreferredSize(); }

    public Insets getInsets() { return new Insets(6, 6, 6, 6); }
}
