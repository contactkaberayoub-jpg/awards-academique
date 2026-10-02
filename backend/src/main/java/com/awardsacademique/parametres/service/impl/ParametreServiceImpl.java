package com.awardsacademique.parametres.service.impl;

import com.awardsacademique.parametres.Repository.ParametreRepository;
import com.awardsacademique.parametres.dto.response.ParametreResponse;
import com.awardsacademique.parametres.entity.Parametre;
import com.awardsacademique.parametres.exception.ParametreException;
import com.awardsacademique.parametres.service.interfaces.ParametreService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ParametreServiceImpl implements ParametreService {

    public static final String PLATFORM_PERCENTAGE_KEY = "platform_percentage";
    public static final String INSTRUCTOR_PERCENTAGE_KEY = "instructor_percentage";

    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final ParametreRepository repository;

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getPlatformPercentage() {
        return getRevenueSplit().platformPercentage();
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getInstructorPercentage() {
        return getRevenueSplit().instructorPercentage();
    }

    @Override
    @Transactional(readOnly = true)
    public RevenueSplit getRevenueSplit() {
        RevenueSplit split = new RevenueSplit(
                readPercentage(PLATFORM_PERCENTAGE_KEY),
                readPercentage(INSTRUCTOR_PERCENTAGE_KEY));
        validateRevenueSplit(split, 500);
        return split;
    }

    @Override
    @Transactional(readOnly = true)
    public String getValue(String key) {
        return repository.findByKey(key)
                .map(Parametre::getValue)
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ParametreResponse> getAll() {
        return repository.findAllByOrderByIdAsc().stream()
                .map(ParametreServiceImpl::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ParametreResponse getByKey(String key) {
        return toResponse(load(key));
    }

    @Override
    @Transactional
    public ParametreResponse updateValue(String key, String value, String description) {
        if (key == null || key.isBlank()) {
            throw new ParametreException("La clé du paramètre est obligatoire.", 400);
        }
        if (value == null || value.isBlank()) {
            throw new ParametreException("La valeur du paramètre est obligatoire.", 400);
        }
        Parametre param = load(key);
        String cleaned = value.trim();

        if (PLATFORM_PERCENTAGE_KEY.equals(key) || INSTRUCTOR_PERCENTAGE_KEY.equals(key)) {
            // Administrator request: reject the pair with a 400 when it does not
            // sum to exactly 100 (the load path uses 500 for server misconfiguration).
            validateRevenueSplit(updatedPair(key, cleaned), 400);
        }

        param.setValue(cleaned);
        if (description != null) {
            param.setDescription(description);
        }
        return toResponse(repository.save(param));
    }

    @Override
    @Transactional
    public List<ParametreResponse> updateRevenueSplit(BigDecimal platformPercentage,
                                                      BigDecimal instructorPercentage) {
        if (platformPercentage == null || instructorPercentage == null
                || platformPercentage.compareTo(ZERO) < 0
                || instructorPercentage.compareTo(ZERO) < 0) {
            throw new ParametreException(
                    "Configuration de revenus invalide : les pourcentages plateforme et instructeur doivent être positifs ou nuls et sont obligatoires.",
                    400);
        }
        BigDecimal total = platformPercentage.add(instructorPercentage);
        if (total.compareTo(HUNDRED) != 0) {
            throw new ParametreException(
                    "Configuration de revenus invalide : la répartition doit totaliser 100% (reçu "
                            + format(platformPercentage) + "% plateforme + " + format(instructorPercentage)
                            + "% instructeur = " + format(total) + "%).",
                    400);
        }

        // Single UPDATE statement -> both rows are locked and written atomically,
        // so a concurrent request can never observe a torn split (e.g. 30+80).
        int updated = repository.updateRevenueSplit(
                PLATFORM_PERCENTAGE_KEY, platformPercentage.toPlainString(),
                INSTRUCTOR_PERCENTAGE_KEY, instructorPercentage.toPlainString());

        if (updated != 2) {
            throw new ParametreException(
                    "Configuration de revenus manquante : les paramètres '" + PLATFORM_PERCENTAGE_KEY
                            + "' et '" + INSTRUCTOR_PERCENTAGE_KEY + "' doivent tous les deux exister.",
                    404);
        }

        return repository.findAllByOrderByIdAsc().stream()
                .map(ParametreServiceImpl::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Builds the hypothetical split after applying the new value to one key,
     * reading the sibling percentage from the database. Used to enforce
     * {@code platform_percentage + instructor_percentage = 100} before saving.
     */
    private RevenueSplit updatedPair(String key, String newValue) {
        BigDecimal newPct = parsePercentage(newValue, key);
        String siblingKey = INSTRUCTOR_PERCENTAGE_KEY.equals(key)
                ? PLATFORM_PERCENTAGE_KEY
                : INSTRUCTOR_PERCENTAGE_KEY;
        BigDecimal siblingPct = readPercentage(siblingKey);
        return INSTRUCTOR_PERCENTAGE_KEY.equals(key)
                ? new RevenueSplit(siblingPct, newPct)
                : new RevenueSplit(newPct, siblingPct);
    }

    /**
     * Fails safely when the configured split is unusable: a wrong total (or a
     * negative percentage) must never silently produce an incorrect revenue
     * distribution.
     */
    private void validateRevenueSplit(RevenueSplit split, int status) {
        BigDecimal platform = split.platformPercentage();
        BigDecimal instructor = split.instructorPercentage();
        if (platform == null || instructor == null
                || platform.compareTo(ZERO) < 0
                || instructor.compareTo(ZERO) < 0) {
            throw new ParametreException(
                    "Configuration de revenus invalide : les pourcentages plateforme et instructeur doivent être positifs ou nuls.",
                    status);
        }
        BigDecimal total = platform.add(instructor);
        if (total.compareTo(HUNDRED) != 0) {
            throw new ParametreException(
                    "Configuration de revenus invalide : la répartition doit totaliser 100% (actuellement "
                            + format(platform) + "% plateforme + " + format(instructor)
                            + "% instructeur = " + format(total) + "%).",
                    status);
        }
    }

    private BigDecimal readPercentage(String key) {
        String raw = getValue(key);
        if (raw == null) {
            throw new ParametreException(
                    "Configuration de revenus manquante : le paramètre '" + key + "' n'existe pas.",
                    500);
        }
        return parsePercentage(raw, key);
    }

    private BigDecimal parsePercentage(String raw, String key) {
        try {
            return new BigDecimal(raw.trim());
        } catch (NumberFormatException ex) {
            throw new ParametreException(
                    "La valeur du paramètre '" + key + "' n'est pas un nombre valide : '" + raw + "'.",
                    400);
        }
    }

    private Parametre load(String key) {
        return repository.findByKey(key)
                .orElseThrow(() -> new ParametreException("Paramètre introuvable : '" + key + "'.", 404));
    }

    private static String format(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }

    private static ParametreResponse toResponse(Parametre p) {
        return new ParametreResponse(
                p.getId(),
                p.getKey(),
                p.getValue(),
                p.getDescription(),
                p.getCreatedAt(),
                p.getUpdatedAt());
    }
}