package com.followlytics.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "vendors")
public class Vendor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String phone;

    @Column(nullable = false)
    private String storeName;

    private String upiId;

    private String currency = "₹";

    @Column(length = 1000)
    private String storePolicies;

    private Boolean isOnboarded = false;

    private LocalDateTime createdAt;

    public Vendor() {
    }

    public Vendor(String phone, String storeName, String upiId, String storePolicies) {
        this.phone = phone;
        this.storeName = storeName;
        this.upiId = upiId;
        this.storePolicies = storePolicies;
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getStoreName() {
        return storeName;
    }

    public void setStoreName(String storeName) {
        this.storeName = storeName;
    }

    public String getUpiId() {
        return upiId;
    }

    public void setUpiId(String upiId) {
        this.upiId = upiId;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getStorePolicies() {
        return storePolicies;
    }

    public void setStorePolicies(String storePolicies) {
        this.storePolicies = storePolicies;
    }

    public Boolean getIsOnboarded() {
        return isOnboarded;
    }

    public void setIsOnboarded(Boolean isOnboarded) {
        this.isOnboarded = isOnboarded;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
