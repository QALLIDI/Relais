package ma.recrutement.facturation.service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import ma.recrutement.facturation.domain.Facture;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Génère la facture au format PDF (OpenPDF). */
@Component
public class FacturePdf {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Value("${app.cabinet.nom:[Nom du cabinet]}")
    private String cabinet;

    @Value("${app.cabinet.adresse:[Adresse du cabinet]}")
    private String adresse;

    @Value("${app.cabinet.ice:[ICE du cabinet]}")
    private String ice;

    public byte[] generer(Facture f) {
        NumberFormat montant = NumberFormat.getNumberInstance(Locale.FRANCE);
        montant.setMinimumFractionDigits(2);
        montant.setMaximumFractionDigits(2);
        Font titre = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20);
        Font gras = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);
        Font normal = FontFactory.getFont(FontFactory.HELVETICA, 11);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4, 50, 50, 50, 50);
        PdfWriter.getInstance(doc, out);
        doc.open();

        doc.add(new Paragraph(cabinet, gras));
        doc.add(new Paragraph(adresse + " · ICE " + ice, normal));
        doc.add(new Paragraph(" "));
        doc.add(new Paragraph("Facture " + (f.getNumero() == null ? "(brouillon)" : f.getNumero()), titre));
        if (f.getDateEmission() != null) {
            doc.add(new Paragraph("Émise le " + DATE.format(f.getDateEmission())
                    + " · échéance le " + DATE.format(f.getEcheance()), normal));
        }
        doc.add(new Paragraph(" "));
        doc.add(new Paragraph("Facturé à : " + f.getEntrepriseNom(), gras));
        doc.add(new Paragraph(" "));

        PdfPTable table = new PdfPTable(new float[]{4, 1.5f});
        table.setWidthPercentage(100);
        table.addCell(cellule("Désignation", gras, Element.ALIGN_LEFT));
        table.addCell(cellule("Montant (MAD)", gras, Element.ALIGN_RIGHT));
        table.addCell(cellule(f.getObjet(), normal, Element.ALIGN_LEFT));
        table.addCell(cellule(montant.format(f.getMontantHt()), normal, Element.ALIGN_RIGHT));
        table.addCell(cellule("Total HT", gras, Element.ALIGN_RIGHT));
        table.addCell(cellule(montant.format(f.getMontantHt()), normal, Element.ALIGN_RIGHT));
        table.addCell(cellule("TVA " + f.getTauxTva().stripTrailingZeros().toPlainString() + " %", gras, Element.ALIGN_RIGHT));
        table.addCell(cellule(montant.format(f.getMontantTva()), normal, Element.ALIGN_RIGHT));
        table.addCell(cellule("Total TTC", gras, Element.ALIGN_RIGHT));
        table.addCell(cellule(montant.format(valeur(f.getMontantTtc())), gras, Element.ALIGN_RIGHT));
        doc.add(table);

        doc.add(new Paragraph(" "));
        doc.add(new Paragraph("Paiement par virement à 30 jours. Merci de rappeler le numéro de facture.", normal));
        doc.close();
        return out.toByteArray();
    }

    private static PdfPCell cellule(String texte, Font font, int alignement) {
        PdfPCell c = new PdfPCell(new Phrase(texte, font));
        c.setHorizontalAlignment(alignement);
        c.setPadding(8);
        return c;
    }

    private static BigDecimal valeur(BigDecimal b) {
        return b == null ? BigDecimal.ZERO : b;
    }
}
