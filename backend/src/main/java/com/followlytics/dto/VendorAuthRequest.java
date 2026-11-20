package com.followlytics.dto;

public class VendorAuthRequest {
    private String phone;
    private String storeName;
    private String upiId;
    private String storePolicies;

    public VendorAuthRequest() {
    }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getStoreName() { return storeName; }
    public void setStoreName(String storeName) { this.storeName = storeName; }
    public String getUpiId() { return upiId; }
    public void setUpiId(String upiId) { this.upiId = upiId; }
    public String getStorePolicies() { return storePolicies; }
    public void setStorePolicies(String storePolicies) { this.storePolicies = storePolicies; }
}
