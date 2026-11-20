package com.followlytics.dto;

import java.math.BigDecimal;

public class GeminiExtractionResult {
    private String customerReply;
    private String intent;
    private String productMentioned;
    private String detectedStage; // INQUIRY, PRICE_QUOTED, NEGOTIATING, SOLD, LOST
    private BigDecimal estimatedDealValue;
    private Boolean isDealClosed = false;
    private String leakedRevenueReason; // PRICE_HIGH, OUT_OF_STOCK, etc.
    private String unmetDemandItem;
    private Boolean needsHumanAttention = false;

    public GeminiExtractionResult() {
    }

    public String getCustomerReply() {
        return customerReply;
    }

    public void setCustomerReply(String customerReply) {
        this.customerReply = customerReply;
    }

    public String getIntent() {
        return intent;
    }

    public void setIntent(String intent) {
        this.intent = intent;
    }

    public String getProductMentioned() {
        return productMentioned;
    }

    public void setProductMentioned(String productMentioned) {
        this.productMentioned = productMentioned;
    }

    public String getDetectedStage() {
        return detectedStage;
    }

    public void setDetectedStage(String detectedStage) {
        this.detectedStage = detectedStage;
    }

    public BigDecimal getEstimatedDealValue() {
        return estimatedDealValue;
    }

    public void setEstimatedDealValue(BigDecimal estimatedDealValue) {
        this.estimatedDealValue = estimatedDealValue;
    }

    public Boolean getIsDealClosed() {
        return isDealClosed;
    }

    public void setIsDealClosed(Boolean dealClosed) {
        isDealClosed = dealClosed;
    }

    public String getLeakedRevenueReason() {
        return leakedRevenueReason;
    }

    public void setLeakedRevenueReason(String leakedRevenueReason) {
        this.leakedRevenueReason = leakedRevenueReason;
    }

    public String getUnmetDemandItem() {
        return unmetDemandItem;
    }

    public void setUnmetDemandItem(String unmetDemandItem) {
        this.unmetDemandItem = unmetDemandItem;
    }

    public Boolean getNeedsHumanAttention() {
        return needsHumanAttention;
    }

    public void setNeedsHumanAttention(Boolean needsHumanAttention) {
        this.needsHumanAttention = needsHumanAttention;
    }
}
