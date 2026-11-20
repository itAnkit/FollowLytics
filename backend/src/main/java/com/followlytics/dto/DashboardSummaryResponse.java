package com.followlytics.dto;

import com.followlytics.entity.CustomerDeal;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class DashboardSummaryResponse {
    private Long vendorId;
    private String storeName;
    private String currency = "₹";

    private BigDecimal totalSalesToday = BigDecimal.ZERO;
    private BigDecimal totalLeakedRevenue = BigDecimal.ZERO;
    private long totalTrackedCustomers = 0;
    private double conversionRatePercent = 0.0;

    // Stage counts
    private long inquiryCount = 0;
    private long priceQuotedCount = 0;
    private long negotiatingCount = 0;
    private long soldCount = 0;
    private long lostCount = 0;

    private List<LeakedCategoryDto> leakedBreakdown = new ArrayList<>();
    private List<DemandStatDto> topDemandedProducts = new ArrayList<>();
    private List<DemandStatDto> unmetDemand = new ArrayList<>();
    private List<CustomerDeal> recentDeals = new ArrayList<>();

    public DashboardSummaryResponse() {
    }

    public static class LeakedCategoryDto {
        private String reason;
        private long count;
        private BigDecimal totalAmount;

        public LeakedCategoryDto() {}

        public LeakedCategoryDto(String reason, long count, BigDecimal totalAmount) {
            this.reason = reason;
            this.count = count;
            this.totalAmount = totalAmount;
        }

        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
        public long getCount() { return count; }
        public void setCount(long count) { this.count = count; }
        public BigDecimal getTotalAmount() { return totalAmount; }
        public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    }

    public static class DemandStatDto {
        private String productName;
        private int count;
        private boolean carriedInCatalog;

        public DemandStatDto() {}

        public DemandStatDto(String productName, int count, boolean carriedInCatalog) {
            this.productName = productName;
            this.count = count;
            this.carriedInCatalog = carriedInCatalog;
        }

        public String getProductName() { return productName; }
        public void setProductName(String productName) { this.productName = productName; }
        public int getCount() { return count; }
        public void setCount(int count) { this.count = count; }
        public boolean isCarriedInCatalog() { return carriedInCatalog; }
        public void setCarriedInCatalog(boolean carriedInCatalog) { this.carriedInCatalog = carriedInCatalog; }
    }

    public Long getVendorId() { return vendorId; }
    public void setVendorId(Long vendorId) { this.vendorId = vendorId; }
    public String getStoreName() { return storeName; }
    public void setStoreName(String storeName) { this.storeName = storeName; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public BigDecimal getTotalSalesToday() { return totalSalesToday; }
    public void setTotalSalesToday(BigDecimal totalSalesToday) { this.totalSalesToday = totalSalesToday; }
    public BigDecimal getTotalLeakedRevenue() { return totalLeakedRevenue; }
    public void setTotalLeakedRevenue(BigDecimal totalLeakedRevenue) { this.totalLeakedRevenue = totalLeakedRevenue; }
    public long getTotalTrackedCustomers() { return totalTrackedCustomers; }
    public void setTotalTrackedCustomers(long totalTrackedCustomers) { this.totalTrackedCustomers = totalTrackedCustomers; }
    public double getConversionRatePercent() { return conversionRatePercent; }
    public void setConversionRatePercent(double conversionRatePercent) { this.conversionRatePercent = conversionRatePercent; }
    public long getInquiryCount() { return inquiryCount; }
    public void setInquiryCount(long inquiryCount) { this.inquiryCount = inquiryCount; }
    public long getPriceQuotedCount() { return priceQuotedCount; }
    public void setPriceQuotedCount(long priceQuotedCount) { this.priceQuotedCount = priceQuotedCount; }
    public long getNegotiatingCount() { return negotiatingCount; }
    public void setNegotiatingCount(long negotiatingCount) { this.negotiatingCount = negotiatingCount; }
    public long getSoldCount() { return soldCount; }
    public void setSoldCount(long soldCount) { this.soldCount = soldCount; }
    public long getLostCount() { return lostCount; }
    public void setLostCount(long lostCount) { this.lostCount = lostCount; }
    public List<LeakedCategoryDto> getLeakedBreakdown() { return leakedBreakdown; }
    public void setLeakedBreakdown(List<LeakedCategoryDto> leakedBreakdown) { this.leakedBreakdown = leakedBreakdown; }
    public List<DemandStatDto> getTopDemandedProducts() { return topDemandedProducts; }
    public void setTopDemandedProducts(List<DemandStatDto> topDemandedProducts) { this.topDemandedProducts = topDemandedProducts; }
    public List<DemandStatDto> getUnmetDemand() { return unmetDemand; }
    public void setUnmetDemand(List<DemandStatDto> unmetDemand) { this.unmetDemand = unmetDemand; }
    public List<CustomerDeal> getRecentDeals() { return recentDeals; }
    public void setRecentDeals(List<CustomerDeal> recentDeals) { this.recentDeals = recentDeals; }
}
