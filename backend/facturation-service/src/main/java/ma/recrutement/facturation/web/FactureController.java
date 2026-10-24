package ma.recrutement.facturation.web;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.recrutement.facturation.domain.Facture;
import ma.recrutement.facturation.service.FacturationService;
import ma.recrutement.facturation.service.FacturePdf;
import ma.recrutement.facturation.web.Dtos.FacturationStats;
import ma.recrutement.facturation.web.Dtos.FactureDto;
import ma.recrutement.facturation.web.Dtos.FactureRequest;
import ma.recrutement.facturation.web.Dtos.PlacementDto;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class FactureController {

    private final FacturationService service;
    private final FacturePdf pdf;

    @GetMapping("/api/factures")
    @PreAuthorize("hasAnyRole('RECRUTEUR','ENTREPRISE')")
    public List<FactureDto> lister() {
        return service.lister();
    }

    @PostMapping("/api/factures")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('RECRUTEUR')")
    public FactureDto creer(@Valid @RequestBody FactureRequest req) {
        return service.creer(req);
    }

    @PostMapping("/api/factures/{id}/emettre")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public FactureDto emettre(@PathVariable UUID id) {
        return service.emettre(id);
    }

    @PostMapping("/api/factures/{id}/payer")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public FactureDto payer(@PathVariable UUID id) {
        return service.marquerPayee(id);
    }

    @GetMapping("/api/factures/{id}/pdf")
    @PreAuthorize("hasAnyRole('RECRUTEUR','ENTREPRISE')")
    public ResponseEntity<byte[]> pdf(@PathVariable UUID id) {
        Facture f = service.pourPdf(id);
        String nom = (f.getNumero() == null ? "facture-brouillon" : f.getNumero()) + ".pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(nom).build().toString())
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf.generer(f));
    }

    @GetMapping("/api/placements")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public List<PlacementDto> placements() {
        return service.placements();
    }

    @GetMapping("/api/facturation/stats")
    @PreAuthorize("hasRole('RECRUTEUR')")
    public FacturationStats stats() {
        return service.stats();
    }
}
