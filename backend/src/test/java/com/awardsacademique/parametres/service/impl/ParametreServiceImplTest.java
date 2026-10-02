package com.awardsacademique.parametres.service.impl;

import com.awardsacademique.parametres.Repository.ParametreRepository;
import com.awardsacademique.parametres.dto.response.ParametreResponse;
import com.awardsacademique.parametres.entity.Parametre;
import com.awardsacademique.parametres.exception.ParametreException;
import com.awardsacademique.parametres.service.interfaces.ParametreService;
import com.awardsacademique.parametres.service.interfaces.ParametreService.RevenueSplit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The {@code parametres} table is the single source of the revenue split. The
 * service validates the two percentages (>= 0, sum = 100) before any money
 * calculation can use them, and rejects invalid configurations saved by admins.
 */
@ExtendWith(MockitoExtension.class)
class ParametreServiceImplTest {

    @Mock
    private ParametreRepository repository;

    private ParametreServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ParametreServiceImpl(repository);
    }

    private Parametre param(String key, String value) {
        return Parametre.builder().key(key).value(value).build();
    }

    private void stubSplit(String platform, String instructor) {
        when(repository.findByKey(ParametreServiceImpl.PLATFORM_PERCENTAGE_KEY))
                .thenReturn(Optional.of(param(ParametreServiceImpl.PLATFORM_PERCENTAGE_KEY, platform)));
        when(repository.findByKey(ParametreServiceImpl.INSTRUCTOR_PERCENTAGE_KEY))
                .thenReturn(Optional.of(param(ParametreServiceImpl.INSTRUCTOR_PERCENTAGE_KEY, instructor)));
    }

    @Test
    void revenueSplit_returnsConfiguredPercentages() {
        stubSplit("20", "80");

        RevenueSplit split = service.getRevenueSplit();
        assertEquals(0, new BigDecimal("20").compareTo(split.platformPercentage()));
        assertEquals(0, new BigDecimal("80").compareTo(split.instructorPercentage()));
        assertEquals(0, new BigDecimal("20").compareTo(service.getPlatformPercentage()));
        assertEquals(0, new BigDecimal("80").compareTo(service.getInstructorPercentage()));
    }

    @Test
    void revenueSplit_rejectsTotalBelow100() {
        stubSplit("20", "70");

        ParametreException ex = assertThrows(ParametreException.class, service::getRevenueSplit);
        assertEquals(500, ex.getStatus());
        assertEquals(true, ex.getMessage().contains("100%"));
    }

    @Test
    void revenueSplit_rejectsTotalAbove100() {
        stubSplit("60", "60");

        assertThrows(ParametreException.class, service::getRevenueSplit);
    }

    @Test
    void revenueSplit_rejectsNegativePercentages() {
        stubSplit("-10", "110");

        ParametreException ex = assertThrows(ParametreException.class, service::getRevenueSplit);
        assertEquals(500, ex.getStatus());
        assertEquals(true, ex.getMessage().contains("positifs"));
    }

    @Test
    void revenueSplit_failsSafely_whenKeyIsMissing() {
        when(repository.findByKey(ParametreServiceImpl.PLATFORM_PERCENTAGE_KEY)).thenReturn(Optional.empty());

        ParametreException ex = assertThrows(ParametreException.class, service::getRevenueSplit);
        assertEquals(500, ex.getStatus());
        assertEquals(true, ex.getMessage().contains("n'existe pas"));
    }

    @Test
    void getValue_returnsStoredValueOrNull() {
        when(repository.findByKey("platform_name")).thenReturn(Optional.of(param("platform_name", "Awards Académique")));
        when(repository.findByKey("missing")).thenReturn(Optional.empty());

        assertEquals("Awards Académique", service.getValue("platform_name"));
        assertNull(service.getValue("missing"));
    }

    @Test
    void updateValue_acceptsPairSummingTo100() {
        stubSplit("20", "70");
        when(repository.save(org.mockito.ArgumentMatchers.any(Parametre.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ParametreResponse updated = service.updateValue(
                ParametreServiceImpl.PLATFORM_PERCENTAGE_KEY, "30", null);

        assertEquals("30", updated.value());
        assertEquals(0, new BigDecimal("100").compareTo(
                new BigDecimal(updated.value())
                        .add(new BigDecimal(service.getValue(ParametreServiceImpl.INSTRUCTOR_PERCENTAGE_KEY)))));
    }

    @Test
    void updateValue_rejectsPairNotSummingTo100() {
        stubSplit("20", "80");

        // 25 + 80 = 105
        ParametreException ex = assertThrows(ParametreException.class,
                () -> service.updateValue(ParametreServiceImpl.PLATFORM_PERCENTAGE_KEY, "25", null));
        assertEquals(400, ex.getStatus());
        assertEquals(true, ex.getMessage().contains("totaliser 100%"));

        // 20 + 70 = 90
        assertThrows(ParametreException.class,
                () -> service.updateValue(ParametreServiceImpl.INSTRUCTOR_PERCENTAGE_KEY, "70", null));

        verify(repository, never()).save(org.mockito.ArgumentMatchers.any(Parametre.class));
    }

    @Test
    void updateValue_unknownKey_returns404() {
        when(repository.findByKey("unknown")).thenReturn(Optional.empty());

        ParametreException ex = assertThrows(ParametreException.class,
                () -> service.updateValue("unknown", "1", null));
        assertEquals(404, ex.getStatus());
    }

    @Test
    void updateValue_rejectsNonNumericPercentage() {
        when(repository.findByKey(ParametreServiceImpl.PLATFORM_PERCENTAGE_KEY))
                .thenReturn(Optional.of(param(ParametreServiceImpl.PLATFORM_PERCENTAGE_KEY, "20")));

        ParametreException ex = assertThrows(ParametreException.class,
                () -> service.updateValue(ParametreServiceImpl.PLATFORM_PERCENTAGE_KEY, "abc", null));
        assertEquals(400, ex.getStatus());
        assertEquals(true, ex.getMessage().contains("n'est pas un nombre"));
    }

    @Test
    void updateValue_rejectsBlankKeyOrValue() {
        assertThrows(ParametreException.class,
                () -> service.updateValue(" ", "20", null));
        assertThrows(ParametreException.class,
                () -> service.updateValue(ParametreServiceImpl.PLATFORM_PERCENTAGE_KEY, "  ", null));
    }

    @Test
    void updateRevenueSplit_atomicallyUpdatesBothRows() {
        when(repository.updateRevenueSplit(
                ParametreServiceImpl.PLATFORM_PERCENTAGE_KEY, "30",
                ParametreServiceImpl.INSTRUCTOR_PERCENTAGE_KEY, "70")).thenReturn(2);
        when(repository.findAllByOrderByIdAsc()).thenReturn(List.of(
                param(ParametreServiceImpl.PLATFORM_PERCENTAGE_KEY, "30"),
                param(ParametreServiceImpl.INSTRUCTOR_PERCENTAGE_KEY, "70")));

        List<ParametreResponse> result = service.updateRevenueSplit(
                new BigDecimal("30"), new BigDecimal("70"));

        assertEquals(2, result.size());
        assertEquals("30", result.get(0).value());
        assertEquals("70", result.get(1).value());
        verify(repository).updateRevenueSplit(
                ParametreServiceImpl.PLATFORM_PERCENTAGE_KEY, "30",
                ParametreServiceImpl.INSTRUCTOR_PERCENTAGE_KEY, "70");
    }

    @Test
    void updateRevenueSplit_rejectsPairNotSummingTo100() {
        ParametreException below = assertThrows(ParametreException.class,
                () -> service.updateRevenueSplit(new BigDecimal("20"), new BigDecimal("70")));
        assertEquals(400, below.getStatus());
        assertEquals(true, below.getMessage().contains("100%"));

        ParametreException above = assertThrows(ParametreException.class,
                () -> service.updateRevenueSplit(new BigDecimal("25"), new BigDecimal("80")));
        assertEquals(400, above.getStatus());

        verify(repository, never()).updateRevenueSplit(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void updateRevenueSplit_rejectsNegativeOrNullPercentages() {
        assertThrows(ParametreException.class,
                () -> service.updateRevenueSplit(new BigDecimal("-10"), new BigDecimal("110")));
        assertThrows(ParametreException.class,
                () -> service.updateRevenueSplit(new BigDecimal("20"), new BigDecimal("-50")));
        assertThrows(ParametreException.class,
                () -> service.updateRevenueSplit(null, new BigDecimal("100")));
        assertThrows(ParametreException.class,
                () -> service.updateRevenueSplit(new BigDecimal("100"), null));

        verify(repository, never()).updateRevenueSplit(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void updateRevenueSplit_fails404_whenRowsMissing() {
        // Only one row matched -> the split cannot be considered saved atomically.
        when(repository.updateRevenueSplit(anyString(), anyString(), anyString(), anyString())).thenReturn(1);

        ParametreException ex = assertThrows(ParametreException.class,
                () -> service.updateRevenueSplit(new BigDecimal("30"), new BigDecimal("70")));
        assertEquals(404, ex.getStatus());
        assertEquals(true, ex.getMessage().contains("doivent tous les deux exister"));
    }
}