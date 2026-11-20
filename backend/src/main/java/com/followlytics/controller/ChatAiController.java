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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatAiController {

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
        ChatProcessResponse response = chatAiService.processIncomingMessage(request);
        return ResponseEntity.ok(response);
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
                    if (body.containsKey("stage")) {
                        deal.setStage(DealStage.valueOf(body.get("stage").toString().toUpperCase()));
                        if (deal.getStage() == DealStage.SOLD) {
                            deal.setIsClosed(true);
                        }
                    }
                    if (body.containsKey("dealValue")) {
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
}
