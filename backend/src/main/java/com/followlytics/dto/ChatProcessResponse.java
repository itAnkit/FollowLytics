package com.followlytics.dto;

import com.followlytics.entity.DealStage;
import com.followlytics.entity.LeakedReason;
import java.math.BigDecimal;

public class ChatProcessResponse {
    private Long dealId;
    private String replyText;
    private DealStage stage;
    private BigDecimal dealValue;
    private LeakedReason leakedReason;
    private String productMentioned;
    private String summary;
    private boolean needsHumanAttention;
    private boolean isDealClosed;

    public ChatProcessResponse() {
    }

    public Long getDealId() {
        return dealId;
    }

    public void setDealId(Long dealId) {
        this.dealId = dealId;
    }

    public String getReplyText() {
        return replyText;
    }

    public void setReplyText(String replyText) {
        this.replyText = replyText;
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

    public boolean isNeedsHumanAttention() {
        return needsHumanAttention;
    }

    public void setNeedsHumanAttention(boolean needsHumanAttention) {
        this.needsHumanAttention = needsHumanAttention;
    }

    public boolean isDealClosed() {
        return isDealClosed;
    }

    public void setDealClosed(boolean dealClosed) {
        isDealClosed = dealClosed;
    }
}
