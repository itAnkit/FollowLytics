package com.followlytics.controller;

import com.followlytics.dto.OnboardingRequest;
import com.followlytics.dto.ProductDto;
import com.followlytics.dto.VendorAuthRequest;
import com.followlytics.entity.Product;
import com.followlytics.entity.StockStatus;
import com.followlytics.entity.Vendor;
import com.followlytics.repository.ProductRepository;
import com.followlytics.repository.VendorRepository;
import com.followlytics.service.GeminiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final VendorRepository vendorRepository;
    private final ProductRepository productRepository;
    private final GeminiService geminiService;
    // In-memory freeware OTP store (phone -> OTP)
    private final Map<String, String> otpStore = new ConcurrentHashMap<>();
    // Tracks current active merchant session for extension sync
    private static volatile Vendor currentActiveVendor = null;

    public static Vendor getCurrentActiveVendor() {
        return currentActiveVendor;
    }

    public AuthController(VendorRepository vendorRepository, ProductRepository productRepository, GeminiService geminiService) {
        this.vendorRepository = vendorRepository;
        this.productRepository = productRepository;
        this.geminiService = geminiService;
    }

    @PostMapping("/send-otp")
    public ResponseEntity<Map<String, Object>> sendOtp(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        if (phone == null || phone.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Phone number is required"));
        }
        phone = phone.trim();

        // Generate 4-digit OTP (e.g. 4826 or 1234)
        String otp = "4826";
        otpStore.put(phone, otp);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "OTP sent successfully to " + phone);
        resp.put("otp", otp); // Returned for instant testing & demo display
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/check-phone")
    public ResponseEntity<Map<String, Object>> checkPhone(@RequestParam String phone) {
        if (phone == null || phone.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("exists", false, "isRegistered", false, "isOnboarded", false));
        }
        String cleanPhone = phone.trim();
        java.util.Optional<Vendor> opt = vendorRepository.findByPhone(cleanPhone);
        if (opt.isPresent()) {
            Vendor v = opt.get();
            long productCount = productRepository.findByVendorId(v.getId()).size();
            boolean hasOnboarded = Boolean.TRUE.equals(v.getIsOnboarded())
                    || productCount > 0
                    || (v.getStoreName() != null && !v.getStoreName().equals("My Business") && !v.getStoreName().isBlank());
            Map<String, Object> resp = new HashMap<>();
            resp.put("exists", true);
            resp.put("isRegistered", true);
            resp.put("isOnboarded", hasOnboarded);
            resp.put("storeName", v.getStoreName() != null ? v.getStoreName() : "My Business");
            resp.put("phone", v.getPhone());
            resp.put("vendorId", v.getId());
            return ResponseEntity.ok(resp);
        } else {
            return ResponseEntity.ok(Map.of("exists", false, "isRegistered", false, "isOnboarded", false));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, Object>> verifyOtp(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        String otp = body.get("otp");

        if (phone == null || otp == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Phone and OTP are required"));
        }
        phone = phone.trim();
        otp = otp.trim();

        String expected = otpStore.getOrDefault(phone, "4826");
        // Accept generated OTP or universal testing OTP "1234" / "4826"
        if (!otp.equals(expected) && !otp.equals("1234") && !otp.equals("4826")) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid OTP. Use demo OTP: 4826"));
        }

        // Check if vendor exists
        final String cleanPhone = phone;
        Vendor vendor = vendorRepository.findByPhone(cleanPhone)
                .orElseGet(() -> {
                    Vendor newV = new Vendor(cleanPhone, "My Business", "", "");
                    newV.setIsOnboarded(false);
                    return vendorRepository.save(newV);
                });

        long productCount = productRepository.findByVendorId(vendor.getId()).size();
        boolean alreadyOnboarded = Boolean.TRUE.equals(vendor.getIsOnboarded())
                || productCount > 0
                || (vendor.getStoreName() != null && !vendor.getStoreName().equals("My Business") && !vendor.getStoreName().isBlank());

        if (alreadyOnboarded && !Boolean.TRUE.equals(vendor.getIsOnboarded())) {
            vendor.setIsOnboarded(true);
            vendor = vendorRepository.save(vendor);
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("vendor", vendor);
        resp.put("isOnboarded", alreadyOnboarded);
        currentActiveVendor = vendor;
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout() {
        currentActiveVendor = null;
        return ResponseEntity.ok(Map.of("success", true, "message", "Logged out successfully"));
    }

    @PostMapping("/onboarding")
    public ResponseEntity<Map<String, Object>> completeOnboarding(@RequestBody OnboardingRequest req) {
        Vendor vendor = vendorRepository.findById(req.getVendorId()).orElse(null);
        if (vendor == null) {
            return ResponseEntity.notFound().build();
        }

        if (req.getStoreName() != null && !req.getStoreName().isBlank()) {
            vendor.setStoreName(req.getStoreName().trim());
        }
        if (req.getUpiId() != null) {
            vendor.setUpiId(req.getUpiId().trim());
        }
        if (req.getStorePolicies() != null) {
            vendor.setStorePolicies(req.getStorePolicies().trim());
        }
        vendor.setIsOnboarded(true);
        vendor = vendorRepository.save(vendor);

        // Save catalog products
        if (req.getProducts() != null && !req.getProducts().isEmpty()) {
            for (ProductDto dto : req.getProducts()) {
                if (dto.getName() != null && !dto.getName().isBlank() && dto.getPrice() != null) {
                    Product p = new Product(
                            vendor.getId(),
                            dto.getName().trim(),
                            dto.getCategory() != null ? dto.getCategory().trim() : "General",
                            dto.getPrice(),
                            dto.getStockStatus() != null ? dto.getStockStatus() : StockStatus.IN_STOCK,
                            dto.getDescription(),
                            dto.getUsageInstructions()
                    );
                    p.setImageUrl(dto.getImageUrl());
                    p.setSku(dto.getSku());
                    productRepository.save(p);
                }
            }
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("vendor", vendor);
        currentActiveVendor = vendor;
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/current")
    public ResponseEntity<Vendor> getCurrentVendor() {
        if (currentActiveVendor != null) {
            return ResponseEntity.ok(currentActiveVendor);
        }
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/current")
    public ResponseEntity<Vendor> setCurrentVendor(@RequestBody Map<String, Object> body) {
        if (body.containsKey("vendorId")) {
            Long vId = Long.valueOf(body.get("vendorId").toString());
            vendorRepository.findById(vId).ifPresent(v -> currentActiveVendor = v);
        } else if (body.containsKey("phone")) {
            vendorRepository.findByPhone(body.get("phone").toString()).ifPresent(v -> currentActiveVendor = v);
        }
        return currentActiveVendor != null ? ResponseEntity.ok(currentActiveVendor) : ResponseEntity.notFound().build();
    }

    @PostMapping("/register")
    public ResponseEntity<Vendor> register(@RequestBody VendorAuthRequest req) {
        return vendorRepository.findByPhone(req.getPhone())
                .map(existing -> {
                    existing.setStoreName(req.getStoreName());
                    if (req.getUpiId() != null) existing.setUpiId(req.getUpiId());
                    if (req.getStorePolicies() != null) existing.setStorePolicies(req.getStorePolicies());
                    return ResponseEntity.ok(vendorRepository.save(existing));
                })
                .orElseGet(() -> {
                    Vendor v = new Vendor(req.getPhone(), req.getStoreName(), req.getUpiId(), req.getStorePolicies());
                    return ResponseEntity.ok(vendorRepository.save(v));
                });
    }

    @PostMapping("/login")
    public ResponseEntity<Vendor> login(@RequestBody VendorAuthRequest req) {
        return vendorRepository.findByPhone(req.getPhone())
                .map(ResponseEntity::ok)
                .orElseGet(() -> {
                    Vendor v = new Vendor(req.getPhone(),
                            req.getStoreName() != null ? req.getStoreName() : "My WhatsApp Store",
                            req.getUpiId(),
                            req.getStorePolicies());
                    return ResponseEntity.ok(vendorRepository.save(v));
                });
    }

    @GetMapping("/vendors")
    public ResponseEntity<List<Vendor>> getAllVendors() {
        return ResponseEntity.ok(vendorRepository.findAll());
    }

    @GetMapping("/vendor/{id}")
    public ResponseEntity<Vendor> getVendorById(@PathVariable Long id) {
        return vendorRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/vendor/{id}")
    public ResponseEntity<Vendor> updateVendor(@PathVariable Long id, @RequestBody VendorAuthRequest req) {
        return vendorRepository.findById(id)
                .map(v -> {
                    if (req.getStoreName() != null) v.setStoreName(req.getStoreName());
                    if (req.getUpiId() != null) v.setUpiId(req.getUpiId());
                    if (req.getStorePolicies() != null) v.setStorePolicies(req.getStorePolicies());
                    if (req.getGeminiApiKey() != null) v.setGeminiApiKey(req.getGeminiApiKey().trim());
                    if (req.getGeminiModel() != null) v.setGeminiModel(req.getGeminiModel().trim());
                    Vendor saved = vendorRepository.save(v);
                    currentActiveVendor = saved;
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/test-gemini")
    public ResponseEntity<Map<String, Object>> testGemini(@RequestBody Map<String, String> body) {
        String key = body.get("apiKey");
        String model = body.getOrDefault("model", "auto");
        return ResponseEntity.ok(geminiService.testApiKey(key, model));
    }
}
