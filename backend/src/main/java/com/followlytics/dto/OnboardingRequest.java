package com.followlytics.dto;

import java.util.List;

public class OnboardingRequest {
    private Long vendorId;
    private String storeName;
    private String upiId;
    private String storePolicies;
    private List<ProductDto> products;

    public OnboardingRequest() {
    }

    public Long getVendorId() { return vendorId; }
    public void setVendorId(Long vendorId) { this.vendorId = vendorId; }
    public String getStoreName() { return storeName; }
    public void setStoreName(String storeName) { this.storeName = storeName; }
    public String getUpiId() { return upiId; }
    public void setUpiId(String upiId) { this.upiId = upiId; }
    public String getStorePolicies() { return storePolicies; }
    public void setStorePolicies(String storePolicies) { this.storePolicies = storePolicies; }
    public List<ProductDto> getProducts() { return products; }
    public void setProducts(List<ProductDto> products) { this.products = products; }
}
