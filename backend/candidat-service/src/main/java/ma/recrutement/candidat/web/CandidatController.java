package ma.recrutement.candidat.web;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.recrutement.candidat.domain.Candidat;
import ma.recrutement.candidat.domain.Disponibilite;
import ma.recrutement.candidat.domain.Niveau;
import ma.recrutement.candidat.service.CandidatService;
import ma.recrutement.candidat.web.Dtos.CandidatDto;
import ma.recrutement.candidat.web.Dtos.CandidatRequest;
import ma.recrutement.candidat.web.Dtos.CandidatResume;
import ma.recrutement.candidat.web.Dtos.Groupe;
import ma.recrutement.candidat.web.Dtos.NoteDto;
import ma.recrutement.candidat.web.Dtos.NoteRequest;
import ma.recrutement.candidat.web.Dtos.VivierStats;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/candidats")
@RequiredArgsConstructor
public class CandidatController {

    private final CandidatService service;

    // ---------- Recruteur ----------

    @GetMapping
    @PreAuthorize("hasRole('RECRUTEUR')")
    public List<CandidatResume> rechercher(@RequestParam(required = false) String q,
                                           @RequestParam(required = false) String ville,
                                           @RequestParam(required = false) Niveau niveau,
                                           @RequestParam(required = false) Disponibilite disponibilite,
                                           @RequestParam(required = false) String competence,
                                           @RequestParam(required = false) String secteur) {
        return service.rechercher(q, ville, niveau, disponibilite, competence, secteur);
    }

    @GetMapping("/groupes")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public List<Groupe> groupes(@RequestParam(defaultValue = "niveau") String par) {
        return service.regrouper(par);
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public VivierStats stats() {
        return service.stats();
    }

    /** Résumés sans coordonnées, utilisés par le pipeline et la shortlist côté client. */
    @GetMapping("/resumes")
    @PreAuthorize("hasAnyRole('RECRUTEUR','ENTREPRISE')")
    public List<CandidatResume> resumes(@RequestParam List<UUID> ids) {
        return service.resumes(ids);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public CandidatDto detail(@PathVariable UUID id) {
        return service.detail(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('RECRUTEUR')")
    public CandidatDto creer(@Valid @RequestBody CandidatRequest req) {
        return service.creer(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public CandidatDto modifier(@PathVariable UUID id, @Valid @RequestBody CandidatRequest req) {
        return service.modifier(id, req);
    }

    @PostMapping(path = "/{id}/cv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('RECRUTEUR')")
    public CandidatDto deposerCv(@PathVariable UUID id, @RequestPart("fichier") MultipartFile fichier) {
        return service.deposerCv(id, fichier);
    }

    @GetMapping("/{id}/cv")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public ResponseEntity<InputStreamResource> telechargerCv(@PathVariable UUID id) {
        return cv(service.pourTelechargement(id));
    }

    @GetMapping("/{id}/notes")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public List<NoteDto> notes(@PathVariable UUID id) {
        return service.notes(id);
    }

    @PostMapping("/{id}/notes")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('RECRUTEUR')")
    public NoteDto ajouterNote(@PathVariable UUID id, @Valid @RequestBody NoteRequest req) {
        return service.ajouterNote(id, req.texte());
    }

    // ---------- Candidat connecté ----------

    @GetMapping("/me")
    @PreAuthorize("hasRole('CANDIDAT')")
    public CandidatDto monProfil() {
        return service.monProfil();
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('CANDIDAT')")
    public CandidatDto enregistrerMonProfil(@Valid @RequestBody CandidatRequest req) {
        return service.enregistrerMonProfil(req);
    }

    @DeleteMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('CANDIDAT')")
    public void supprimerMonProfil() {
        service.supprimerMonProfil();
    }

    @PostMapping(path = "/me/cv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('CANDIDAT')")
    public CandidatDto deposerMonCv(@RequestPart("fichier") MultipartFile fichier) {
        return service.deposerCv(null, fichier);
    }

    @GetMapping("/me/cv")
    @PreAuthorize("hasRole('CANDIDAT')")
    public ResponseEntity<InputStreamResource> telechargerMonCv() {
        return cv(service.pourTelechargement(null));
    }

    private ResponseEntity<InputStreamResource> cv(Candidat c) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(c.getCvNomFichier()).build().toString())
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(new InputStreamResource(service.lireCv(c)));
    }
}
