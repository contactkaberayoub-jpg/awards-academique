package com.awardsacademique.authentification.Repository;

import com.awardsacademique.authentification.entity.InstructorStatusEnum;
import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.authentification.entity.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for managing {@link User} persistence operations.
 */
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByRole_NameAndDeletedAtIsNull(RoleName name);

    long countByRole_NameAndDeletedAtIsNull(RoleName name);

    long countByRole_NameAndInstructorStatusAndDeletedAtIsNull(RoleName name, InstructorStatusEnum instructorStatus);

    List<User> findByRole_NameAndInstructorStatusAndDeletedAtIsNull(RoleName name, InstructorStatusEnum instructorStatus);

    Optional<User> findByRole_NameAndDeletedAtIsNullAndEmail(RoleName name, String email);

    @Query(value = """
            SELECT u.* FROM users u
            JOIN roles r ON r.id = u.role_id
            WHERE u.deleted_at IS NULL
              AND u.is_active = true
              AND (CAST(:q AS text) IS NULL OR LOWER(u.first_name::text) LIKE LOWER('%' || CAST(:q AS text) || '%')
                         OR LOWER(u.last_name::text) LIKE LOWER('%' || CAST(:q AS text) || '%'))
              AND (CAST(:role AS varchar) IS NULL OR r.name::text = CAST(:role AS varchar))
            ORDER BY u.first_name, u.last_name
            """, nativeQuery = true)
    List<User> searchByName(@Param("q") String q, @Param("role") String role);
}