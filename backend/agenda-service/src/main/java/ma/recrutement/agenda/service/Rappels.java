package ma.recrutement.agenda.service;

import javax.sql.DataSource;

import lombok.RequiredArgsConstructor;
import net.javacrumbs.shedlock.core.LockProvider;
import net.javacrumbs.shedlock.provider.jdbctemplate.JdbcTemplateLockProvider;
import net.javacrumbs.shedlock.spring.annotation.EnableSchedulerLock;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Tâche planifiée des rappels, toutes les 5 minutes. ShedLock (table {@code shedlock}) garantit
 * qu'une seule instance du service l'exécute à la fois.
 */
@Component
@RequiredArgsConstructor
public class Rappels {

    private final ReunionService reunions;

    @Scheduled(cron = "${app.rappels.cron}")
    @SchedulerLock(name = "rappels-reunions", lockAtMostFor = "PT4M", lockAtLeastFor = "PT30S")
    public void executer() {
        reunions.envoyerRappels();
    }

    @Configuration(proxyBeanMethods = false)
    @EnableSchedulerLock(defaultLockAtMostFor = "PT4M")
    static class Verrous {

        @Bean
        public LockProvider lockProvider(DataSource dataSource) {
            return new JdbcTemplateLockProvider(JdbcTemplateLockProvider.Configuration.builder()
                    .withJdbcTemplate(new JdbcTemplate(dataSource))
                    .usingDbTime()
                    .build());
        }
    }
}
