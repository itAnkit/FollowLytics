package com.followlytics.service;

import com.followlytics.controller.AuthController;
import com.followlytics.dto.ChatProcessRequest;
import com.followlytics.dto.ChatProcessResponse;
import com.followlytics.dto.GeminiExtractionResult;
import com.followlytics.entity.*;
import com.followlytics.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ChatAiService {

    private final VendorRepository vendorRepository;
    private final ProductRepository productRepository;
    private final CustomerDealRepository customerDealRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final DemandLogRepository demandLogRepository;
    private final GeminiService geminiService;

    public ChatAiService(VendorRepository vendorRepository,
                         ProductRepository productRepository,
                         CustomerDealRepository customerDealRepository,
                         ChatMessageRepository chatMessageRepository,
                         DemandLogRepository demandLogRepository,
                         GeminiService geminiService) {
        this.vendorRepository = vendorRepository;
        this.productRepository = productRepository;
        this.customerDealRepository = customerDealRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.demandLogRepository = demandLogRepository;
        this.geminiService = geminiService;
    }

    @Transactional
    public ChatProcessResponse processIncomingMessage(ChatProcessRequest request) {
        // 1. Resolve Vendor
        Vendor vendor = resolveVendor(request.getVendorId(), request.getVendorPhone(), true);

        // 2. Resolve Customer Deal
        String custPhone = (request.getCustomerPhone() != null && !request.getCustomerPhone().isBlank()) 
                ? request.getCustomerPhone() 
                : "Unknown Customer";
        String custName = (request.getCustomerName() != null && !request.getCustomerName().isBlank()) 
                ? request.getCustomerName() 
                : custPhone;

        final Vendor finalVendor = vendor;
        CustomerDeal deal = customerDealRepository.findByVendorIdAndCustomerPhone(vendor.getId(), custPhone)
                .orElseGet(() -> {
                    CustomerDeal d = new CustomerDeal(finalVendor.getId(), custPhone, custName);
                    return customerDealRepository.save(d);
                });

        // 3. Save incoming customer message
        ChatMessage userMsg = new ChatMessage(deal.getId(), "CUSTOMER", request.getMessage());
        chatMessageRepository.save(userMsg);

        // 4. Retrieve Catalog & Recent Chat History for AI Context
        List<Product> catalog = productRepository.findByVendorId(vendor.getId());
        List<ChatMessage> history = chatMessageRepository.findByDealIdOrderByTimestampAsc(deal.getId());
        StringBuilder historyText = new StringBuilder();
        int startIndex = Math.max(0, history.size() - 8);
        for (int i = startIndex; i < history.size(); i++) {
            ChatMessage m = history.get(i);
            historyText.append(m.getSender()).append(": ").append(m.getContent()).append("\n");
        }

        // 5. Call Gemini AI Engine
        GeminiExtractionResult aiResult = geminiService.processCustomerMessage(
                vendor, catalog, historyText.toString(), request.getMessage());

        // 6. Save AI's generated response
        ChatMessage aiMsg = new ChatMessage(deal.getId(), "AI", aiResult.getCustomerReply());
        chatMessageRepository.save(aiMsg);

        // 7. Update Customer Deal State & Analytics
        if (aiResult.getDetectedStage() != null) {
            try {
                deal.setStage(DealStage.valueOf(aiResult.getDetectedStage().toUpperCase()));
            } catch (Exception ignored) {}
        }
        if (aiResult.getEstimatedDealValue() != null && aiResult.getEstimatedDealValue().compareTo(BigDecimal.ZERO) > 0) {
            deal.setDealValue(aiResult.getEstimatedDealValue());
        }
        if (aiResult.getLeakedRevenueReason() != null) {
            try {
                deal.setLeakedReason(LeakedReason.valueOf(aiResult.getLeakedRevenueReason().toUpperCase()));
            } catch (Exception ignored) {}
        }
        if (aiResult.getProductMentioned() != null && !aiResult.getProductMentioned().isBlank()) {
            deal.setProductMentioned(aiResult.getProductMentioned());
            recordDemand(vendor.getId(), aiResult.getProductMentioned(), true);
        }
        if (aiResult.getUnmetDemandItem() != null && !aiResult.getUnmetDemandItem().isBlank()) {
            recordDemand(vendor.getId(), aiResult.getUnmetDemandItem(), false);
        }
        if (aiResult.getIsDealClosed() != null) {
            deal.setIsClosed(aiResult.getIsDealClosed());
            if (aiResult.getIsDealClosed()) {
                deal.setStage(DealStage.SOLD);
            }
        }

        String shortMsg = request.getMessage().length() > 60 ? request.getMessage().substring(0, 57) + "..." : request.getMessage();
        if (Boolean.TRUE.equals(aiResult.getNeedsHumanAttention())) {
            deal.setNeedsAction(true);
            deal.setSummary("⚠️ Action Needed: " + shortMsg);
        } else {
            deal.setSummary("Latest: " + shortMsg);
        }
        deal.setLastInteractionAt(LocalDateTime.now());
        customerDealRepository.save(deal);

        // 8. Construct response for Chrome Extension
        ChatProcessResponse response = new ChatProcessResponse();
        response.setDealId(deal.getId());
        response.setReplyText(aiResult.getCustomerReply());
        response.setStage(deal.getStage());
        response.setDealValue(deal.getDealValue());
        response.setLeakedReason(deal.getLeakedReason());
        response.setProductMentioned(deal.getProductMentioned());
        response.setSummary(deal.getSummary());
        response.setDealClosed(Boolean.TRUE.equals(deal.getIsClosed()));
        response.setNeedsHumanAttention(Boolean.TRUE.equals(aiResult.getNeedsHumanAttention()));

        return response;
    }

    @Transactional
    public CustomerDeal trackCustomer(String vendorPhone, Long vendorId, String customerPhone, String customerName, boolean isTracked, String recentContext) {
        // 1. Resolve Vendor
        Vendor vendor = resolveVendor(vendorId, vendorPhone, true);

        String custPhone = (customerPhone != null && !customerPhone.isBlank()) ? customerPhone : "Unknown Contact";
        String custName = (customerName != null && !customerName.isBlank()) ? customerName : custPhone;

        final Vendor finalVendor = vendor;
        CustomerDeal deal = customerDealRepository.findByVendorIdAndCustomerPhone(vendor.getId(), custPhone)
                .orElseGet(() -> {
                    CustomerDeal d = new CustomerDeal(finalVendor.getId(), custPhone, custName);
                    return customerDealRepository.save(d);
                });

        deal.setCustomerName(custName);
        deal.setIsTracked(isTracked);
        deal.setLastInteractionAt(LocalDateTime.now());

        // If tracked and there is recent context, extract/analyze context if deal has no summary yet
        if (isTracked && recentContext != null && !recentContext.isBlank()) {
            deal.setSummary("WhatsApp: " + (recentContext.length() > 60 ? recentContext.substring(0, 57) + "..." : recentContext));
            ChatMessage msg = new ChatMessage(deal.getId(), "CUSTOMER", recentContext);
            chatMessageRepository.save(msg);
            try {
                List<Product> catalog = productRepository.findByVendorId(vendor.getId());
                GeminiExtractionResult aiResult = geminiService.processCustomerMessage(vendor, catalog, "", recentContext);
                if (aiResult.getDetectedStage() != null) {
                    try { deal.setStage(DealStage.valueOf(aiResult.getDetectedStage().toUpperCase())); } catch (Exception ignored) {}
                }
                if (aiResult.getEstimatedDealValue() != null && aiResult.getEstimatedDealValue().compareTo(BigDecimal.ZERO) > 0) {
                    deal.setDealValue(aiResult.getEstimatedDealValue());
                }
                if (aiResult.getProductMentioned() != null && !aiResult.getProductMentioned().isBlank()) {
                    deal.setProductMentioned(aiResult.getProductMentioned());
                    recordDemand(vendor.getId(), aiResult.getProductMentioned(), true);
                }
            } catch (Exception ignored) {}
        }

        return customerDealRepository.save(deal);
    }

    public Optional<CustomerDeal> getDealByCustomer(String vendorPhone, Long vendorId, String customerPhone) {
        Vendor vendor = resolveVendor(vendorId, vendorPhone, false);
        if (vendor == null || customerPhone == null) return Optional.empty();
        return customerDealRepository.findByVendorIdAndCustomerPhone(vendor.getId(), customerPhone);
    }

    /** Resolves vendor by explicit ID, explicit phone, active logged-in session, or database fallback. */
    private Vendor resolveVendor(Long vendorId, String vendorPhone, boolean createIfMissing) {
        Vendor vendor = null;
        if (vendorId != null) {
            vendor = vendorRepository.findById(vendorId).orElse(null);
        }
        if (vendor == null && vendorPhone != null && !vendorPhone.isBlank()) {
            vendor = vendorRepository.findByPhone(vendorPhone.trim()).orElse(null);
        }
        if (vendor == null) {
            Vendor active = AuthController.getCurrentActiveVendor();
            if (active != null && active.getId() != null) {
                vendor = vendorRepository.findById(active.getId()).orElse(active);
            }
        }
        if (vendor == null) {
            List<Vendor> all = vendorRepository.findAll();
            if (!all.isEmpty()) {
                vendor = all.get(0);
            } else if (createIfMissing) {
                vendor = createDefaultVendor(vendorPhone);
            }
        }
        return vendor;
    }

    private void recordDemand(Long vendorId, String productName, boolean carriedInCatalog) {
        if (productName == null || productName.trim().length() < 3) return;
        String clean = productName.trim();
        demandLogRepository.findByVendorIdAndProductNameIgnoreCase(vendorId, clean)
                .ifPresentOrElse(log -> {
                    log.setInquiryCount(log.getInquiryCount() + 1);
                    log.setLastInquiredAt(LocalDateTime.now());
                    demandLogRepository.save(log);
                }, () -> {
                    DemandLog log = new DemandLog(vendorId, clean, carriedInCatalog);
                    demandLogRepository.save(log);
                });
    }

    private Vendor createDefaultVendor(String phone) {
        String p = (phone != null && !phone.isBlank()) ? phone : "+919876543210";
        Vendor v = new Vendor(p, "My WhatsApp Store", "store@okaxis", "Standard 1-2 day delivery. UPI & Cash accepted.");
        return vendorRepository.save(v);
    }
}
