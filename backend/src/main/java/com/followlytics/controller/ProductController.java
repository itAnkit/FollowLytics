package com.followlytics.controller;

import com.followlytics.dto.ProductDto;
import com.followlytics.entity.Product;
import com.followlytics.entity.StockStatus;
import com.followlytics.repository.ProductRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductRepository productRepository;

    public ProductController(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @GetMapping
    public ResponseEntity<List<Product>> getProducts(@RequestParam Long vendorId,
                                                     @RequestParam(required = false) String search) {
        if (search != null && !search.isBlank()) {
            return ResponseEntity.ok(productRepository.findByVendorIdAndNameContainingIgnoreCase(vendorId, search.trim()));
        }
        return ResponseEntity.ok(productRepository.findByVendorId(vendorId));
    }

    @PostMapping
    public ResponseEntity<Product> createProduct(@RequestBody ProductDto dto) {
        Product p = new Product(
                dto.getVendorId(),
                dto.getName(),
                dto.getCategory() != null ? dto.getCategory() : "General",
                dto.getPrice(),
                dto.getStockStatus() != null ? dto.getStockStatus() : StockStatus.IN_STOCK,
                dto.getDescription(),
                dto.getUsageInstructions()
        );
        p.setSku(dto.getSku());
        p.setImageUrl(dto.getImageUrl());
        return ResponseEntity.ok(productRepository.save(p));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Product> updateProduct(@PathVariable Long id, @RequestBody ProductDto dto) {
        return productRepository.findById(id)
                .map(p -> {
                    if (dto.getName() != null) p.setName(dto.getName());
                    if (dto.getCategory() != null) p.setCategory(dto.getCategory());
                    if (dto.getPrice() != null) p.setPrice(dto.getPrice());
                    if (dto.getStockStatus() != null) p.setStockStatus(dto.getStockStatus());
                    if (dto.getDescription() != null) p.setDescription(dto.getDescription());
                    if (dto.getUsageInstructions() != null) p.setUsageInstructions(dto.getUsageInstructions());
                    if (dto.getSku() != null) p.setSku(dto.getSku());
                    if (dto.getImageUrl() != null) p.setImageUrl(dto.getImageUrl());
                    return ResponseEntity.ok(productRepository.save(p));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        if (productRepository.existsById(id)) {
            productRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/bulk")
    public ResponseEntity<List<Product>> bulkAddProducts(@RequestParam Long vendorId, @RequestBody List<ProductDto> list) {
        List<Product> saved = new ArrayList<>();
        for (ProductDto dto : list) {
            Product p = new Product(
                    vendorId,
                    dto.getName(),
                    dto.getCategory() != null ? dto.getCategory() : "General",
                    dto.getPrice(),
                    dto.getStockStatus() != null ? dto.getStockStatus() : StockStatus.IN_STOCK,
                    dto.getDescription(),
                    dto.getUsageInstructions()
            );
            p.setSku(dto.getSku());
            p.setImageUrl(dto.getImageUrl());
            saved.add(productRepository.save(p));
        }
        return ResponseEntity.ok(saved);
    }

    @PostMapping(value = "/upload-csv", consumes = {"text/plain", "text/csv", "application/json", "*/*"})
    public ResponseEntity<Map<String, Object>> uploadCsv(@RequestParam Long vendorId, @RequestBody String csvContent) {
        if (csvContent == null || csvContent.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "CSV content cannot be empty"));
        }

        List<Product> saved = new ArrayList<>();
        String[] lines = csvContent.split("\\r?\\n");
        if (lines.length <= 1) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "CSV has no data rows"));
        }

        // Header mapping
        String[] headers = parseCsvLine(lines[0]);
        Map<String, Integer> colMap = new HashMap<>();
        for (int i = 0; i < headers.length; i++) {
            colMap.put(headers[i].trim().toLowerCase(), i);
        }

        for (int i = 1; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) continue;
            String[] cols = parseCsvLine(line);

            String name = getColVal(cols, colMap, "name", "title", "product");
            if (name == null || name.isBlank()) continue;

            String priceStr = getColVal(cols, colMap, "price", "mrp", "rate");
            BigDecimal price = BigDecimal.valueOf(100);
            if (priceStr != null) {
                try {
                    price = new BigDecimal(priceStr.replaceAll("[^0-9.]", ""));
                } catch (Exception ignored) {}
            }

            String category = getColVal(cols, colMap, "category", "type");
            if (category == null || category.isBlank()) category = "General";

            String stockStr = getColVal(cols, colMap, "stockstatus", "stock", "status");
            StockStatus status = StockStatus.IN_STOCK;
            if (stockStr != null) {
                String upper = stockStr.toUpperCase();
                if (upper.contains("OUT")) status = StockStatus.OUT_OF_STOCK;
                else if (upper.contains("LOW")) status = StockStatus.LOW_STOCK;
            }

            String desc = getColVal(cols, colMap, "description", "desc");
            String usage = getColVal(cols, colMap, "usageinstructions", "usage", "instructions");
            String sku = getColVal(cols, colMap, "sku", "code");
            String imageUrl = getColVal(cols, colMap, "imageurl", "image", "photo");

            Product p = new Product(vendorId, name, category, price, status, desc, usage);
            p.setSku(sku);
            p.setImageUrl(imageUrl);
            saved.add(productRepository.save(p));
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("importedCount", saved.size());
        resp.put("products", saved);
        return ResponseEntity.ok(resp);
    }

    private String[] parseCsvLine(String line) {
        List<String> list = new ArrayList<>();
        boolean inQuotes = false;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '\"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                list.add(sb.toString().trim());
                sb.setLength(0);
            } else {
                sb.append(c);
            }
        }
        list.add(sb.toString().trim());
        return list.toArray(new String[0]);
    }

    private String getColVal(String[] cols, Map<String, Integer> colMap, String... keys) {
        for (String k : keys) {
            Integer idx = colMap.get(k.toLowerCase());
            if (idx != null && idx < cols.length) {
                String val = cols[idx].trim();
                if (val.startsWith("\"") && val.endsWith("\"") && val.length() >= 2) {
                    val = val.substring(1, val.length() - 1).trim();
                }
                if (!val.isBlank()) return val;
            }
        }
        return null;
    }
}
