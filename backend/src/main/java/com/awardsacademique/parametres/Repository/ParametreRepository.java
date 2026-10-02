package com.awardsacademique.parametres.Repository;

import com.awardsacademique.parametres.entity.Parametre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParametreRepository extends JpaRepository<Parametre, Long> {

    @Query("select p from Parametre p where p.key = :key")
    Optional<Parametre> findByKey(@Param("key") String key);

    List<Parametre> findAllByOrderByIdAsc();

    /**
     * Atomically updates the two revenue-split rows in a single statement.
     * Postgres locks both matching rows for the duration of the transaction, so
     * concurrent admin requests can never leave platform_percentage and
     * instructor_percentage in a torn, mid-update state. Returns the number of
     * rows actually updated (must be 2 for a successful save).
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Parametre p
               set p.value = case
                       when p.key = :platformKey then :platformValue
                       when p.key = :instructorKey then :instructorValue
                       else p.value
                   end,
                   p.updatedAt = CURRENT_TIMESTAMP
             where p.key in (:platformKey, :instructorKey)
            """)
    int updateRevenueSplit(@Param("platformKey") String platformKey,
                           @Param("platformValue") String platformValue,
                           @Param("instructorKey") String instructorKey,
                           @Param("instructorValue") String instructorValue);
}