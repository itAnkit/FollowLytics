package com.followlytics.controller;

import com.followlytics.dto.ChatProcessRequest;
import com.followlytics.dto.ChatProcessResponse;
import com.followlytics.entity.ChatMessage;
import com.followlytics.entity.CustomerDeal;
import com.followlytics.entity.DealStage;
import com.followlytics.entity.LeakedReason;
import com.followlytics.repository.ChatMessageRepository;
import com.followlytics.repository.CustomerDealRepository;
import com.followlytics.service.ChatAiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatAiController {

    private static final Logger log = LoggerFactory.getLogger(ChatAiController.class);
    private final ChatAiService chatAiService;
    private final CustomerDealRepository customerDealRepository;
    private final ChatMessageRepository chatMessageRepository;

    public ChatAiController(ChatAiService chatAiService,
                            CustomerDealRepository customerDealRepository,
                            ChatMessageRepository chatMessageRepository) {
        this.chatAiService = chatAiService;
        this.customerDealRepository = customerDealRepository;
        this.chatMessageRepository = chatMessageRepository;
    }

    @PostMapping("/process")
    public ResponseEntity<ChatProcessResponse> processMessage(@RequestBody ChatProcessRequest request) {
        log.info("[ChatAI] Processing message from customerPhone={} ({}) for vendorPhone={}: {}",
                request.getCustomerPhone(), request.getCustomerName(), request.getVendorPhone(), request.getMessage());
        ChatProcessResponse response = chatAiService.processIncomingMessage(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/track-customer")
    public ResponseEntity<Map<String, Object>> trackCustomer(@RequestBody Map<String, Object> body) {
        String vendorPhone = body.get("vendorPhone") != null ? body.get("vendorPhone").toString() : null;
        Long vendorId = body.get("vendorId") != null ? Long.valueOf(body.get("vendorId").toString()) : null;
        String customerPhone = body.get("customerPhone") != null ? body.get("customerPhone").toString() : null;
        String customerName = body.get("customerName") != null ? body.get("customerName").toString() : null;
        boolean isTracked = body.containsKey("isTracked") ? Boolean.parseBoolean(body.get("isTracked").toString()) : true;
        String recentContext = body.get("recentContext") != null ? body.get("recentContext").toString() : null;

        log.info("[TrackCustomer] customerPhone={}, name={}, isTracked={}, vendorPhone={}", customerPhone, customerName, isTracked, vendorPhone);

        CustomerDeal deal = chatAiService.trackCustomer(vendorPhone, vendorId, customerPhone, customerName, isTracked, recentContext);
        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("isTracked", Boolean.TRUE.equals(deal.getIsTracked()));
        resp.put("deal", deal);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/track-status")
    public ResponseEntity<Map<String, Object>> getTrackStatus(
            @RequestParam(required = false) String vendorPhone,
            @RequestParam(required = false) Long vendorId,
            @RequestParam String customerPhone) {
        return chatAiService.getDealByCustomer(vendorPhone, vendorId, customerPhone)
                .map(deal -> {
                    Map<String, Object> resp = new HashMap<>();
                    resp.put("isTracked", Boolean.TRUE.equals(deal.getIsTracked()));
                    resp.put("deal", deal);
                    return ResponseEntity.ok(resp);
                })
                .orElseGet(() -> ResponseEntity.ok(Map.of("isTracked", false)));
    }

    @GetMapping("/deals")
    public ResponseEntity<List<CustomerDeal>> getDeals(@RequestParam Long vendorId) {
        return ResponseEntity.ok(customerDealRepository.findByVendorIdOrderByLastInteractionAtDesc(vendorId));
    }

    @GetMapping("/deals/{id}/messages")
    public ResponseEntity<List<ChatMessage>> getMessages(@PathVariable Long id) {
        return ResponseEntity.ok(chatMessageRepository.findByDealIdOrderByTimestampAsc(id));
    }

    @PatchMapping("/deals/{id}/stage")
    public ResponseEntity<CustomerDeal> updateDealStage(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return customerDealRepository.findById(id)
                .map(deal -> {
                    if (body.containsKey("stage") && body.get("stage") != null) {
                        deal.setStage(DealStage.valueOf(body.get("stage").toString().toUpperCase()));
                        if (deal.getStage() == DealStage.SOLD) {
                            deal.setIsClosed(true);
                            deal.setNeedsAction(false);
                        }
                    }
                    if (body.containsKey("needsAction") && body.get("needsAction") != null) {
                        deal.setNeedsAction(Boolean.parseBoolean(body.get("needsAction").toString()));
                    }
                    if (body.containsKey("dealValue") && body.get("dealValue") != null) {
                        deal.setDealValue(new BigDecimal(body.get("dealValue").toString()));
                    }
                    if (body.containsKey("leakedReason")) {
                        deal.setLeakedReason(LeakedReason.valueOf(body.get("leakedReason").toString().toUpperCase()));
                    }
                    deal.setLastInteractionAt(LocalDateTime.now());
                    return ResponseEntity.ok(customerDealRepository.save(deal));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/deals/{id}")
    public ResponseEntity<Void> deleteDeal(@PathVariable Long id) {
        if (!customerDealRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        List<ChatMessage> msgs = chatMessageRepository.findByDealIdOrderByTimestampAsc(id);
        if (!msgs.isEmpty()) {
            chatMessageRepository.deleteAll(msgs);
        }
        customerDealRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
