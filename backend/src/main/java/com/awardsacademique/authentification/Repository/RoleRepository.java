package com.awardsacademique.authentification.Repository;

import com.awardsacademique.authentification.entity.Role;
import com.awardsacademique.authentification.entity.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository for managing {@link Role} persistence operations.
 */
@Repository
public interface RoleRepository extends JpaRepository<Role, UUID> {
    Optional<Role> findByName(RoleName name);
}