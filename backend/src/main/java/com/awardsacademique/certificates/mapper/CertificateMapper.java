package com.awardsacademique.certificates.mapper;

import com.awardsacademique.certificates.dto.response.CertificateResponse;
import com.awardsacademique.certificates.dto.response.CertificateVerificationResponse;
import com.awardsacademique.certificates.entity.Certificate;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

/**
 * Mapper for converting between Certificate entities and DTOs.
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface CertificateMapper {

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "userName", expression = "java(certificate.getUser() != null ? certificate.getUser().getFirstName() + \" \" + certificate.getUser().getLastName() : null)")
    @Mapping(target = "userEmail", source = "user.email")
    @Mapping(target = "courseId", source = "course.id")
    @Mapping(target = "courseTitle", source = "course.title")
    @Mapping(target = "issuedAt", source = "issuedAt", qualifiedByName = "localToOffset")
    @Mapping(target = "createdAt", source = "createdAt", qualifiedByName = "localToOffset")
    CertificateResponse toResponse(Certificate certificate);

    @Mapping(target = "valid", constant = "true")
    @Mapping(target = "holderName", expression = "java(certificate.getUser() != null ? certificate.getUser().getFirstName() + \" \" + certificate.getUser().getLastName() : null)")
    @Mapping(target = "courseTitle", source = "course.title")
    @Mapping(target = "issuedAt", source = "issuedAt", qualifiedByName = "localToOffset")
    CertificateVerificationResponse toVerificationResponse(Certificate certificate);

    @Named("localToOffset")
    default OffsetDateTime localToOffset(LocalDateTime localDateTime) {
        if (localDateTime == null) {
            return null;
        }
        return localDateTime.atOffset(ZoneOffset.UTC);
    }
}
