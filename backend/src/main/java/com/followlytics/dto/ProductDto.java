package com.followlytics.dto;

import com.followlytics.entity.StockStatus;
import java.math.BigDecimal;

public class ProductDto {
    private Long id;
    private Long vendorId;
    private String name;
    private String sku;
    private String category;
    private BigDecimal price;
    private String imageUrl;
    private StockStatus stockStatus = StockStatus.IN_STOCK;
    private String description;
    private String usageInstructions;

    public ProductDto() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getVendorId() { return vendorId; }
    public void setVendorId(Long vendorId) { this.vendorId = vendorId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public StockStatus getStockStatus() { return stockStatus; }
    public void setStockStatus(StockStatus stockStatus) { this.stockStatus = stockStatus; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getUsageInstructions() { return usageInstructions; }
    public void setUsageInstructions(String usageInstructions) { this.usageInstructions = usageInstructions; }
}
