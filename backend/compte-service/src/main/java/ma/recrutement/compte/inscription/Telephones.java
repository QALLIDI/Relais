package ma.recrutement.compte.inscription;

import com.google.i18n.phonenumbers.NumberParseException;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.google.i18n.phonenumbers.Phonenumber.PhoneNumber;
import org.springframework.http.HttpStatus;

/** Validation des numéros (libphonenumber) : format international, numéro valide pour son pays. */
final class Telephones {

    private static final PhoneNumberUtil UTIL = PhoneNumberUtil.getInstance();

    private Telephones() {
    }

    /** Numéro au format E.164 (+212612345678) ; un numéro sans indicatif est lu comme marocain. */
    static String normaliser(String saisie) {
        try {
            PhoneNumber n = UTIL.parse(saisie, "MA");
            if (!UTIL.isValidNumber(n)) {
                throw invalide();
            }
            return UTIL.format(n, PhoneNumberUtil.PhoneNumberFormat.E164);
        } catch (NumberParseException e) {
            throw invalide();
        }
    }

    /** +212 6•• •• •• 42 : indicatif, premier chiffre et deux derniers chiffres. */
    static String masquer(String e164) {
        if (e164 == null) {
            return null;
        }
        try {
            PhoneNumber n = UTIL.parse(e164, null);
            String national = UTIL.getNationalSignificantNumber(n);
            return "+" + n.getCountryCode() + " " + national.charAt(0) + "•• •• •• " + national.substring(national.length() - 2);
        } catch (NumberParseException e) {
            return "••••";
        }
    }

    private static InscriptionException invalide() {
        return new InscriptionException(HttpStatus.BAD_REQUEST,
                "Numéro de téléphone invalide. Saisissez-le au format international, par exemple +212 6 12 34 56 78.");
    }
}
