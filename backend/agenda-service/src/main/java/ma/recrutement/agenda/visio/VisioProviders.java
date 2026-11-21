package ma.recrutement.agenda.visio;

import ma.recrutement.agenda.domain.Reunion;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Choix de l'adaptateur visio selon {@code app.visio.provider}. */
@Configuration
public class VisioProviders {

    /** Local : une salle Jitsi publique nommée d'après la réunion, sans compte ni appel d'API. */
    @Bean
    @ConditionalOnProperty(name = "app.visio.provider", havingValue = "fake", matchIfMissing = true)
    public VisioProvider fakeVisioProvider() {
        return reunion -> "https://meet.jit.si/Relais-" + reunion.getId().toString().substring(0, 8);
    }

    @Bean
    @ConditionalOnProperty(name = "app.visio.provider", havingValue = "google")
    public VisioProvider googleMeetProvider() {
        return new GoogleMeetProvider();
    }

    @Bean
    @ConditionalOnProperty(name = "app.visio.provider", havingValue = "microsoft")
    public VisioProvider teamsProvider() {
        return new TeamsProvider();
    }

    /**
     * Google Meet via l'API Google Calendar (événement avec conferenceData). Non branché :
     * il faut un compte de service et la dépendance google-api-services-calendar.
     */
    static class GoogleMeetProvider implements VisioProvider {
        @Override
        public String creerLien(Reunion reunion) {
            throw new UnsupportedOperationException("Adaptateur Google Calendar non branché : utilisez VISIO_PROVIDER=fake");
        }
    }

    /**
     * Microsoft Teams via Microsoft Graph (onlineMeetings). Non branché : il faut une application
     * Entra ID et la dépendance microsoft-graph.
     */
    static class TeamsProvider implements VisioProvider {
        @Override
        public String creerLien(Reunion reunion) {
            throw new UnsupportedOperationException("Adaptateur Microsoft Graph non branché : utilisez VISIO_PROVIDER=fake");
        }
    }
}
