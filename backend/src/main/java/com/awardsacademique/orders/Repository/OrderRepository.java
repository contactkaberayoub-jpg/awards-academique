package com.awardsacademique.orders.Repository;

import com.awardsacademique.courses.entity.CurrencyEnum;
import com.awardsacademique.orders.entity.Order;
import com.awardsacademique.orders.entity.OrderStatusEnum;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {

    @EntityGraph(attributePaths = {"user", "course"})
    List<Order> findByUserIdOrderByCreatedAtDesc(UUID userId);

    @EntityGraph(attributePaths = {"user", "course"})
    List<Order> findByCourseIdOrderByCreatedAtDesc(UUID courseId);

    @EntityGraph(attributePaths = {"user", "course"})
    List<Order> findByCourseIdInOrderByCreatedAtDesc(Collection<UUID> courseIds);

    @EntityGraph(attributePaths = {"user", "course"})
    List<Order> findAllByOrderByCreatedAtDesc();

    /**
     * Paid-order revenue grouped by currency for one instructor. This is the
     * exclusive source of truth for the instructor's earnings; pending,
     * cancelled and refunded orders never contribute a cent.
     *
     * <p>The order status is passed as a bind parameter (never as a JPQL enum
     * literal): Hibernate renders literals as {@code 'paid'::OrderStatusEnum},
     * but the PostgreSQL type is named {@code order_status_enum}.
     */
    @Query("select o.currency as currency, " +
            "count(o) as orderCount, coalesce(sum(o.totalAmount), 0) as totalAmount " +
            "from Order o join o.course c " +
            "where c.instructor.id = :instructorId " +
            "and o.status = :status " +
            "group by o.currency")
    List<PaidRevenueAggregate> aggregatePaidByInstructor(@Param("instructorId") UUID instructorId,
                                                         @Param("status") OrderStatusEnum status);

    /** Per-course paid-revenue for one instructor, grouped by course and currency. */
    @Query("select c.id as courseId, c.title as courseTitle, o.currency as currency, " +
            "count(o) as orderCount, coalesce(sum(o.totalAmount), 0) as totalAmount " +
            "from Order o join o.course c " +
            "where c.instructor.id = :instructorId " +
            "and o.status = :status " +
            "group by c.id, c.title, o.currency " +
            "order by c.title asc")
    List<CourseRevenueAggregate> aggregatePaidByCourseAndInstructor(@Param("instructorId") UUID instructorId,
                                                                    @Param("status") OrderStatusEnum status);

    /** Global revenue summary per currency across every order (pending/paid/cancelled/refunded). */
    @Query("select o.currency as currency, " +
            "count(o) as orderCount, coalesce(sum(o.totalAmount), 0) as totalAmount, " +
            "sum(case when o.status = :paid then 1 else 0 end) as paidCount, " +
            "sum(case when o.status = :paid then coalesce(o.totalAmount, 0) else 0 end) as paidAmount, " +
            "sum(case when o.status = :pending then 1 else 0 end) as pendingCount, " +
            "sum(case when o.status in (:cancelled, :refunded) then 1 else 0 end) as failedCount " +
            "from Order o group by o.currency")
    List<RevenueAggregate> aggregateRevenueByCurrency(@Param("paid") OrderStatusEnum paid,
                                                      @Param("pending") OrderStatusEnum pending,
                                                      @Param("cancelled") OrderStatusEnum cancelled,
                                                      @Param("refunded") OrderStatusEnum refunded);

    /** Per-instructor paid revenue per currency, for the admin instructor-earnings view. */
    @Query("select c.instructor.id as instructorId, c.instructor.firstName as instructorFirstName, " +
            "c.instructor.lastName as instructorLastName, c.instructor.email as instructorEmail, " +
            "o.currency as currency, count(o) as orderCount, coalesce(sum(o.totalAmount), 0) as totalAmount " +
            "from Order o join o.course c " +
            "where o.status = :status " +
            "group by c.instructor.id, c.instructor.firstName, c.instructor.lastName, c.instructor.email, o.currency " +
            "order by c.instructor.lastName asc, c.instructor.firstName asc, o.currency asc")
    List<InstructorRevenueAggregate> aggregatePaidForAllInstructors(@Param("status") OrderStatusEnum status);

    interface PaidRevenueAggregate {
        CurrencyEnum getCurrency();

        Long getOrderCount();

        BigDecimal getTotalAmount();
    }

    interface CourseRevenueAggregate {
        UUID getCourseId();

        String getCourseTitle();

        CurrencyEnum getCurrency();

        Long getOrderCount();

        BigDecimal getTotalAmount();
    }

    interface RevenueAggregate {
        CurrencyEnum getCurrency();

        Long getOrderCount();

        BigDecimal getTotalAmount();

        Long getPaidCount();

        BigDecimal getPaidAmount();

        Long getPendingCount();

        Long getFailedCount();
    }

    interface InstructorRevenueAggregate {
        UUID getInstructorId();

        String getInstructorFirstName();

        String getInstructorLastName();

        String getInstructorEmail();

        CurrencyEnum getCurrency();

        Long getOrderCount();

        BigDecimal getTotalAmount();
    }
}