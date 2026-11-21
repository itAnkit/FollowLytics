package com.followlytics.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "customer_deals")
public class CustomerDeal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long vendorId;

    @Column(nullable = false)
    private String customerPhone;

    private String customerName;

    @Enumerated(EnumType.STRING)
    private DealStage stage = DealStage.INQUIRY;

    @Column(precision = 10, scale = 2)
    private BigDecimal dealValue = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    private LeakedReason leakedReason = LeakedReason.NONE;

    private String productMentioned;

    @Column(length = 2000)
    private String summary;

    private Boolean isClosed = false;
    private Boolean isDelivered = false;
    private Boolean isTracked = true;
    private Boolean needsAction = false;

    @Transient
    private Long messageCount = 0L;

    private LocalDateTime lastInteractionAt;
    private LocalDateTime createdAt;

    public CustomerDeal() {
    }

    public CustomerDeal(Long vendorId, String customerPhone, String customerName) {
        this.vendorId = vendorId;
        this.customerPhone = customerPhone;
        this.customerName = customerName;
        this.stage = DealStage.INQUIRY;
        this.dealValue = BigDecimal.ZERO;
        this.leakedReason = LeakedReason.NONE;
        this.isClosed = false;
        this.createdAt = LocalDateTime.now();
        this.lastInteractionAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (lastInteractionAt == null) {
            lastInteractionAt = LocalDateTime.now();
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

    public String getCustomerPhone() {
        return customerPhone;
    }

    public void setCustomerPhone(String customerPhone) {
        this.customerPhone = customerPhone;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public DealStage getStage() {
        return stage;
    }

    public void setStage(DealStage stage) {
        this.stage = stage;
    }

    public BigDecimal getDealValue() {
        return dealValue;
    }

    public void setDealValue(BigDecimal dealValue) {
        this.dealValue = dealValue;
    }

    public LeakedReason getLeakedReason() {
        return leakedReason;
    }

    public void setLeakedReason(LeakedReason leakedReason) {
        this.leakedReason = leakedReason;
    }

    public String getProductMentioned() {
        return productMentioned;
    }

    public void setProductMentioned(String productMentioned) {
        this.productMentioned = productMentioned;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public Boolean getIsClosed() {
        return isClosed;
    }

    public void setIsClosed(Boolean isClosed) {
        this.isClosed = isClosed;
    }

    public Boolean getIsDelivered() {
        return Boolean.TRUE.equals(isDelivered);
    }

    public void setIsDelivered(Boolean isDelivered) {
        this.isDelivered = isDelivered;
    }

    public Long getMessageCount() {
        return messageCount != null ? messageCount : 0L;
    }

    public void setMessageCount(Long messageCount) {
        this.messageCount = messageCount;
    }

    public Boolean getIsTracked() {
        return isTracked != null ? isTracked : true;
    }

    public void setIsTracked(Boolean isTracked) {
        this.isTracked = isTracked;
    }

    public Boolean getNeedsAction() {
        return Boolean.TRUE.equals(needsAction);
    }

    public void setNeedsAction(Boolean needsAction) {
        this.needsAction = needsAction;
    }

    public LocalDateTime getLastInteractionAt() {
        return lastInteractionAt;
    }

    public void setLastInteractionAt(LocalDateTime lastInteractionAt) {
        this.lastInteractionAt = lastInteractionAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
