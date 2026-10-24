package ma.recrutement.candidat.repository;

import java.util.List;
import java.util.UUID;

import ma.recrutement.candidat.domain.Note;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteRepository extends JpaRepository<Note, UUID> {
    List<Note> findByCandidatIdOrderByCreatedAtDesc(UUID candidatId);
}
