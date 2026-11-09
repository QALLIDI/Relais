package ma.recrutement.notification.service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Contenu mis en forme d'un e-mail HTML : surtitre, paragraphes, encadré d'informations,
 * un seul bouton d'action et une note. Le texte brut de la notification reste la version texte.
 */
public record Mise(String surtitre, List<String> paragraphes, List<Info> infos, Action action, String note) {

    public record Info(String libelle, String valeur) {
    }

    public record Action(String libelle, String url) {
    }

    private static final Pattern LIEN = Pattern.compile("\\s*:?\\s*(https?://\\S+?)([.,;)]?)(?=\\s|$)");

    public Mise {
        paragraphes = paragraphes == null ? List.of() : List.copyOf(paragraphes);
        infos = infos == null ? List.of() : List.copyOf(infos);
    }

    /**
     * Mise en forme par défaut d'un message texte : un paragraphe par bloc, et le premier lien
     * devient le bouton « Ouvrir dans Recrut » (il est retiré du texte).
     */
    public static Mise depuisTexte(String message) {
        String texte = message == null ? "" : message;
        Action action = null;
        Matcher m = LIEN.matcher(texte);
        if (m.find()) {
            action = new Action("Ouvrir dans Recrut", m.group(1));
            texte = (texte.substring(0, m.start()) + m.group(2) + texte.substring(m.end())).trim();
            if (!texte.isEmpty() && !texte.matches("(?s).*[.!?]$")) {
                texte = texte + ".";
            }
        }
        List<String> paragraphes = new ArrayList<>();
        for (String bloc : texte.split("\\R\\s*\\R")) {
            if (!bloc.isBlank()) {
                paragraphes.add(bloc.strip());
            }
        }
        return new Mise(null, paragraphes, List.of(), action, null);
    }

    public Mise avecSurtitre(String valeur) {
        return new Mise(valeur, paragraphes, infos, action, note);
    }

    public Mise avecInfos(List<Info> valeurs) {
        return new Mise(surtitre, paragraphes, valeurs, action, note);
    }

    public Mise avecAction(String libelle, String url) {
        return new Mise(surtitre, paragraphes, infos, url == null ? null : new Action(libelle, url), note);
    }

    public Mise avecNote(String valeur) {
        return new Mise(surtitre, paragraphes, infos, action, valeur);
    }
}
