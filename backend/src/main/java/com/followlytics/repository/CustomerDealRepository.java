package com.followlytics.repository;

import com.followlytics.entity.CustomerDeal;
import com.followlytics.entity.DealStage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerDealRepository extends JpaRepository<CustomerDeal, Long> {

    List<CustomerDeal> findByVendorIdOrderByLastInteractionAtDesc(Long vendorId);

    Optional<CustomerDeal> findByVendorIdAndCustomerPhone(Long vendorId, String customerPhone);

    List<CustomerDeal> findByVendorIdAndStage(Long vendorId, DealStage stage);

    @Query("SELECT COUNT(d) FROM CustomerDeal d WHERE d.vendorId = :vendorId")
    long countTotalDealsByVendor(@Param("vendorId") Long vendorId);

    @Query("SELECT COUNT(d) FROM CustomerDeal d WHERE d.vendorId = :vendorId AND d.stage = :stage")
    long countByVendorIdAndStage(@Param("vendorId") Long vendorId, @Param("stage") DealStage stage);

    @Query("SELECT COALESCE(SUM(d.dealValue), 0) FROM CustomerDeal d WHERE d.vendorId = :vendorId AND d.stage = 'SOLD'")
    BigDecimal sumClosedSalesByVendor(@Param("vendorId") Long vendorId);

    @Query("SELECT COALESCE(SUM(d.dealValue), 0) FROM CustomerDeal d WHERE d.vendorId = :vendorId AND d.stage = 'LOST'")
    BigDecimal sumLeakedRevenueByVendor(@Param("vendorId") Long vendorId);

    @Query("SELECT d.leakedReason, COUNT(d), COALESCE(SUM(d.dealValue), 0) FROM CustomerDeal d " +
           "WHERE d.vendorId = :vendorId AND d.stage = 'LOST' GROUP BY d.leakedReason")
    List<Object[]> getLeakedRevenueBreakdown(@Param("vendorId") Long vendorId);
}
