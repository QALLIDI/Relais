package ma.recrutement.entreprise.messagerie;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MessageMissionRepository extends JpaRepository<MessageMission, UUID> {

    List<MessageMission> findByMissionIdOrderByCreeLeAsc(UUID missionId);

    /** Dernier message de chaque fil (recruteur : tous les fils). */
    @Query("""
            select m from MessageMission m
            where m.creeLe = (select max(d.creeLe) from MessageMission d where d.missionId = m.missionId)
            order by m.creeLe desc""")
    List<MessageMission> derniersMessages();

    /** Dernier message de chaque fil d'une entreprise. */
    @Query("""
            select m from MessageMission m
            where m.entrepriseId = :entreprise
              and m.creeLe = (select max(d.creeLe) from MessageMission d where d.missionId = m.missionId)
            order by m.creeLe desc""")
    List<MessageMission> derniersMessagesEntreprise(@Param("entreprise") UUID entreprise);

    /**
     * Messages non lus par {@code moi}, toutes missions confondues : [missionId, nombre, date du dernier].
     * Un message est non lu s'il vient de quelqu'un d'autre et qu'il est postérieur à la dernière lecture.
     */
    @Query("""
            select m.missionId, count(m), max(m.creeLe) from MessageMission m
            where m.auteurId <> :moi
              and m.creeLe > coalesce((select l.luLe from LectureMessage l
                                       where l.missionId = m.missionId and l.utilisateurId = :moi), :origine)
            group by m.missionId""")
    List<Object[]> nonLus(@Param("moi") String moi, @Param("origine") OffsetDateTime origine);

    /** Même chose, limitée aux missions d'une entreprise. */
    @Query("""
            select m.missionId, count(m), max(m.creeLe) from MessageMission m
            where m.entrepriseId = :entreprise and m.auteurId <> :moi
              and m.creeLe > coalesce((select l.luLe from LectureMessage l
                                       where l.missionId = m.missionId and l.utilisateurId = :moi), :origine)
            group by m.missionId""")
    List<Object[]> nonLusEntreprise(@Param("entreprise") UUID entreprise, @Param("moi") String moi,
                                    @Param("origine") OffsetDateTime origine);
}
