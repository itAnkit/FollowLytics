package com.followlytics.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "demand_logs")
public class DemandLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long vendorId;

    @Column(nullable = false)
    private String productName;

    private Integer inquiryCount = 1;

    private Boolean isCarriedInCatalog = true;

    private LocalDateTime lastInquiredAt;

    public DemandLog() {
    }

    public DemandLog(Long vendorId, String productName, Boolean isCarriedInCatalog) {
        this.vendorId = vendorId;
        this.productName = productName;
        this.isCarriedInCatalog = isCarriedInCatalog;
        this.inquiryCount = 1;
        this.lastInquiredAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (lastInquiredAt == null) {
            lastInquiredAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getVendorId() {
        return vendorId;
    }

    public void setVendorId(Long vendorId) {
        this.vendorId = vendorId;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public Integer getInquiryCount() {
        return inquiryCount;
    }

    public void setInquiryCount(Integer inquiryCount) {
        this.inquiryCount = inquiryCount;
    }

    public Boolean getIsCarriedInCatalog() {
        return isCarriedInCatalog;
    }

    public void setIsCarriedInCatalog(Boolean isCarriedInCatalog) {
        this.isCarriedInCatalog = isCarriedInCatalog;
    }

    public LocalDateTime getLastInquiredAt() {
        return lastInquiredAt;
    }

    public void setLastInquiredAt(LocalDateTime lastInquiredAt) {
        this.lastInquiredAt = lastInquiredAt;
    }
}
