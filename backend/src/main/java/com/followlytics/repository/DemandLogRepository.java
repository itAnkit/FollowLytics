package com.followlytics.repository;

import com.followlytics.entity.DemandLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DemandLogRepository extends JpaRepository<DemandLog, Long> {

    List<DemandLog> findByVendorIdOrderByInquiryCountDesc(Long vendorId);

    Optional<DemandLog> findByVendorIdAndProductNameIgnoreCase(Long vendorId, String productName);

    List<DemandLog> findByVendorIdAndIsCarriedInCatalogOrderByInquiryCountDesc(Long vendorId, Boolean isCarriedInCatalog);
}
