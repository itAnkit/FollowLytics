package com.followlytics.repository;

import com.followlytics.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByVendorId(Long vendorId);
    List<Product> findByVendorIdAndNameContainingIgnoreCase(Long vendorId, String query);
}
