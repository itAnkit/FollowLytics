package com.followlytics.controller;

import com.followlytics.dto.ProductDto;
import com.followlytics.entity.Product;
import com.followlytics.entity.StockStatus;
import com.followlytics.repository.ProductRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

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
}
