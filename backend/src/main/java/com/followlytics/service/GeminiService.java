package com.followlytics.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followlytics.dto.GeminiExtractionResult;
import com.followlytics.entity.Product;
import com.followlytics.entity.Vendor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private HttpClient httpClient;

    private synchronized HttpClient getHttpClient() {
        if (httpClient == null) {
            httpClient = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();
        }
        return httpClient;
    }

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent}")
    private String apiUrl;

    public GeminiExtractionResult processCustomerMessage(Vendor vendor, List<Product> catalog, String chatHistory, String incomingMessage) {
        if (apiKey != null && !apiKey.trim().isEmpty()) {
            try {
                return callLiveGeminiApi(vendor, catalog, chatHistory, incomingMessage);
            } catch (Exception e) {
                log.error("Error calling Gemini API: {}. Falling back to rule-based engine.", e.getMessage());
            }
        } else {
            log.info("No GEMINI_API_KEY set. Utilizing intelligent built-in conversational engine.");
        }
        return simulateIntelligentResponse(vendor, catalog, incomingMessage);
    }

    private GeminiExtractionResult callLiveGeminiApi(Vendor vendor, List<Product> catalog, String chatHistory, String incomingMessage) throws Exception {
        String endpoint = apiUrl + "?key=" + apiKey.trim();

        // Build prompt with catalog context
        StringBuilder catalogText = new StringBuilder();
        for (Product p : catalog) {
            catalogText.append("- ").append(p.getName())
                    .append(" | Price: ").append(vendor.getCurrency()).append(p.getPrice())
                    .append(" | Status: ").append(p.getStockStatus())
                    .append(" | Specs: ").append(p.getDescription())
                    .append(" | Usage: ").append(p.getUsageInstructions())
                    .append("\n");
        }

        String systemPrompt = """
            You are FollowLytics AI, an intelligent, polite, and persuasive store assistant for '%s'.
            Currency: %s
            Store Policies: %s
            Payment UPI: %s

            STORE CATALOG:
            %s

            TASK:
            1. Generate a natural, helpful reply to the customer in clear English or natural Hinglish (if customer speaks Hindi/Hinglish).
               Be polite, quote exact prices, clarify usage, and encourage the sale.
            2. Extract analytical metadata into the required JSON schema.

            JSON Schema to return:
            {
              "customerReply": "Text to reply to customer",
              "intent": "INQUIRY / PRICING / USAGE / CONFIRM_ORDER / REJECTION / COMPLAINT",
              "productMentioned": "Exact product name or null",
              "detectedStage": "INQUIRY / PRICE_QUOTED / NEGOTIATING / SOLD / LOST",
              "estimatedDealValue": 0.00,
              "isDealClosed": true/false,
              "leakedRevenueReason": "PRICE_HIGH / OUT_OF_STOCK / UNSERVICEABLE_LOCATION / GHOSTED / COMPETITOR / NONE",
              "unmetDemandItem": "Item name if customer asked for something NOT in catalog, else null",
              "needsHumanAttention": true/false
            }

            Strictly output only raw valid JSON without markdown fences.
            """.formatted(
                vendor.getStoreName(),
                vendor.getCurrency(),
                vendor.getStorePolicies() != null ? vendor.getStorePolicies() : "Standard delivery, UPI/Cash accepted.",
                vendor.getUpiId() != null ? vendor.getUpiId() : "Available on request",
                catalogText.toString()
        );

        Map<String, Object> payload = Map.of(
            "contents", List.of(
                Map.of(
                    "role", "user",
                    "parts", List.of(
                        Map.of("text", systemPrompt + "\n\nRecent Conversation History:\n" + chatHistory + "\nLatest Customer Message:\n" + incomingMessage)
                    )
                )
            ),
            "generationConfig", Map.of(
                "temperature", 0.2,
                "responseMimeType", "application/json"
            )
        );

        String jsonBody = objectMapper.writeValueAsString(payload);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .timeout(Duration.ofSeconds(15))
                .build();

        HttpResponse<String> response = getHttpClient().send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 200) {
            JsonNode root = objectMapper.readTree(response.body());
            String text = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
            text = cleanJsonString(text);
            return objectMapper.readValue(text, GeminiExtractionResult.class);
        } else {
            throw new RuntimeException("Gemini HTTP " + response.statusCode() + ": " + response.body());
        }
    }

    private String cleanJsonString(String text) {
        text = text.trim();
        if (text.startsWith("```json")) {
            text = text.substring(7);
        } else if (text.startsWith("```")) {
            text = text.substring(3);
        }
        if (text.endsWith("```")) {
            text = text.substring(0, text.length() - 3);
        }
        return text.trim();
    }

    /**
     * Intelligent built-in rule and semantic simulation when API key is not configured.
     * Ensures instant zero-config out-of-the-box demoing.
     */
    public GeminiExtractionResult simulateIntelligentResponse(Vendor vendor, List<Product> catalog, String incomingMessage) {
        String lower = incomingMessage.toLowerCase().trim();
        GeminiExtractionResult res = new GeminiExtractionResult();
        String cur = vendor.getCurrency() != null ? vendor.getCurrency() : "₹";

        // Check for confirmed purchase
        if (lower.contains("order") || lower.contains("send it") || lower.contains("pack") || lower.contains("paid") || lower.contains("confirm") || lower.contains("buy")) {
            Product matched = findBestMatchingProduct(catalog, lower);
            BigDecimal val = matched != null ? matched.getPrice() : BigDecimal.valueOf(500);
            res.setDetectedStage("SOLD");
            res.setIsDealClosed(true);
            res.setEstimatedDealValue(val);
            res.setProductMentioned(matched != null ? matched.getName() : "Item Order");
            res.setLeakedRevenueReason("NONE");
            res.setCustomerReply("Thank you! Order confirmed. We are packing your item right away. UPI ID: " + (vendor.getUpiId() != null ? vendor.getUpiId() : "9876543210@upi") + ". Total: " + cur + val + ".");
            return res;
        }

        // Check for lost deal / objection
        if (lower.contains("too expensive") || lower.contains("costly") || lower.contains("high price") || lower.contains("discount") || lower.contains("budget")) {
            Product matched = findBestMatchingProduct(catalog, lower);
            BigDecimal val = matched != null ? matched.getPrice() : BigDecimal.valueOf(450);
            res.setDetectedStage("LOST");
            res.setLeakedRevenueReason("PRICE_HIGH");
            res.setEstimatedDealValue(val);
            res.setProductMentioned(matched != null ? matched.getName() : "General Product");
            res.setCustomerReply("We understand! Our prices reflect 100% genuine quality and warranty. If you order 2 or more, we can offer an additional 5% discount. Would that work?");
            return res;
        }

        // Check for out of stock / catalog match
        Product matched = findBestMatchingProduct(catalog, lower);
        if (matched != null) {
            res.setProductMentioned(matched.getName());
            res.setEstimatedDealValue(matched.getPrice());

            if (matched.getStockStatus().name().equals("OUT_OF_STOCK")) {
                res.setDetectedStage("LOST");
                res.setLeakedRevenueReason("OUT_OF_STOCK");
                res.setCustomerReply("Hello! Currently " + matched.getName() + " is temporarily out of stock. Fresh batch arrives in 2 days. Would you like us to reserve one for you?");
            } else {
                res.setDetectedStage("PRICE_QUOTED");
                res.setCustomerReply("Hello! Yes, " + matched.getName() + " is in stock for " + cur + matched.getPrice() + ". " + 
                        (matched.getDescription() != null ? matched.getDescription() : "") + ". Shall we reserve one for you?");
            }
            return res;
        }

        // Unmet demand (something not in catalog)
        if (lower.contains("have") || lower.contains("available") || lower.contains("price") || lower.contains("do you")) {
            res.setDetectedStage("INQUIRY");
            res.setUnmetDemandItem(incomingMessage.replaceAll("(?i)(do you have|available|price of|is there)", "").trim());
            res.setCustomerReply("Hello! Thanks for reaching out to " + vendor.getStoreName() + ". Could you share a quick photo or model name so we can check if it is in our warehouse?");
            return res;
        }

        // Default greeting
        res.setDetectedStage("INQUIRY");
        res.setCustomerReply("Hello! Welcome to " + vendor.getStoreName() + ". How can we help you today with our products and pricing?");
        return res;
    }

    private Product findBestMatchingProduct(List<Product> catalog, String text) {
        if (catalog == null || catalog.isEmpty()) return null;
        for (Product p : catalog) {
            if (text.contains(p.getName().toLowerCase())) {
                return p;
            }
        }
        for (Product p : catalog) {
            String[] words = p.getName().toLowerCase().split("\\s+");
            for (String w : words) {
                if (w.length() > 3 && text.contains(w)) {
                    return p;
                }
            }
        }
        return catalog.get(0);
    }
}
