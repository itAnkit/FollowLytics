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

import java.io.InputStream;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static class SimpleHttpResponse {
        final int statusCode;
        final String body;
        SimpleHttpResponse(int statusCode, String body) {
            this.statusCode = statusCode;
            this.body = body;
        }
        int statusCode() { return statusCode; }
        String body() { return body; }
    }

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent}")
    private String apiUrl;

    public GeminiExtractionResult processCustomerMessage(Vendor vendor, List<Product> catalog, String chatHistory, String incomingMessage) {
        String effectiveKey = (vendor.getGeminiApiKey() != null && !vendor.getGeminiApiKey().trim().isEmpty())
                ? vendor.getGeminiApiKey().trim()
                : (apiKey != null ? apiKey.trim() : "");

        if (!effectiveKey.isEmpty()) {
            try {
                return callLiveGeminiApi(effectiveKey, vendor, catalog, chatHistory, incomingMessage);
            } catch (Exception e) {
                log.error("Error calling Gemini API: {}. Falling back to built-in multilingual engine.", e.getMessage());
            }
        } else {
            log.info("No GEMINI_API_KEY set. Utilizing intelligent built-in multilingual engine.");
        }
        return simulateIntelligentResponse(vendor, catalog, incomingMessage);
    }

    private GeminiExtractionResult callLiveGeminiApi(String effectiveKey, Vendor vendor, List<Product> catalog, String chatHistory, String incomingMessage) throws Exception {
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

        String lowerMsg = incomingMessage.toLowerCase();
        boolean customerSentHindiScript = incomingMessage.chars().anyMatch(c -> c >= 0x0900 && c <= 0x097F);
        boolean customerSentHinglish = !customerSentHindiScript && (
                lowerMsg.contains("kya") || lowerMsg.contains("hai") || lowerMsg.contains("kitne") || lowerMsg.contains("kitna")
                || lowerMsg.contains("bhaiya") || lowerMsg.contains("bhai") || lowerMsg.contains("batao") || lowerMsg.contains("chahiye")
                || lowerMsg.contains("milega") || lowerMsg.contains("bhej") || lowerMsg.contains("karo") || lowerMsg.contains("mehenga")
                || lowerMsg.contains("sasta") || lowerMsg.contains("lena") || lowerMsg.contains("kar do") || lowerMsg.contains("namaste")
                || lowerMsg.contains("aapke") || lowerMsg.contains("pass") || lowerMsg.contains("haan") || lowerMsg.contains("nahi")
                || lowerMsg.contains("iska") || lowerMsg.contains("uska") || lowerMsg.contains("bhejo") || lowerMsg.contains("dena")
        );
        String scriptDirective = customerSentHindiScript
                ? "Customer used Hindi Devanagari script -> Reply ONLY in Hindi Devanagari script."
                : (customerSentHinglish
                    ? "Customer wrote in HINGLISH (Hindi words in Roman A-Z script). You MUST reply strictly in friendly HINGLISH using ONLY Roman A-Z letters (example: 'Haan ji, Cutter available hai!'), NEVER pure English and STRICTLY FORBIDDEN to use Hindi Devanagari script (अ-ह). Ignore older chatHistory language."
                    : "Customer wrote in ENGLISH -> Reply strictly in clear, polite English only.");

        String systemPrompt = """
            You are FollowLytics AI, a polite store assistant for '%s'.
            Currency: %s
            Store Policies: %s
            Payment UPI: %s

            STORE CATALOG:
            %s

            TASK:
            1. LANGUAGE & SCRIPT RULE: %s
            2. LENGTH RULE: Keep customerReply VERY concise — MAXIMUM 1 to 2 short lines (under 25 words). Never repeat sentences.
            3. PRICING RULE: Do NOT mention the product's price unless the customer explicitly asks about price/rate/cost (e.g. "price", "rate", "kitne ka", "how much", "cost"). If they only ask availability (e.g. "Kya cutter available hai"), ONLY confirm availability without quoting any price.
            4. UPI / PAYMENT RULE: Do NOT mention UPI ID or ask for payment/screenshot unless the customer explicitly asks to pay (e.g. "send payment link/QR/UPI") or confirms they want to place/pay for the order right now. If Payment UPI is 'NOT_CONFIGURED', say payment details will be shared shortly.
            5. HUMAN HANDOFF / ESCALATION RULE: If the customer is rude, arrogant, angry, abusive, complaining, or asks to have a 1-on-1 conversation / call with the owner/human (e.g. "talk to owner", "call me", "1-1 baat", "bakwas", "stupid", "scam", "fraud"), set "needsHumanAttention": true and reply in the matching language: "Allow some moment, will discuss in sometime." (English), "Thoda samay dijiye, hum aapse thodi der mein baat karte hain." (Hinglish), or "कृपया थोड़ा समय दें, हम आपसे थोड़ी देर में बात करेंगे।" (Hindi).
            6. Extract analytical metadata into the required JSON schema.

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
                (vendor.getUpiId() != null && !vendor.getUpiId().isBlank() && !vendor.getUpiId().equalsIgnoreCase("sharmahardware@upi" )) || vendor.getStoreName().toLowerCase().contains("sharma")
                        ? (vendor.getUpiId() != null && !vendor.getUpiId().isBlank() ? vendor.getUpiId() : "NOT_CONFIGURED")
                        : "NOT_CONFIGURED",
                catalogText.toString(),
                scriptDirective
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
        List<String> modelsToTry = buildModelOrder(vendor.getGeminiModel());
        SimpleHttpResponse response = null;
        String usedModel = null;

        for (String model : modelsToTry) {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent";
            response = sendGeminiRequest(url, effectiveKey, jsonBody);
            if (response.statusCode() == 200) {
                usedModel = model;
                break;
            }
            log.warn("Gemini model {} returned HTTP {}: {}", model, response.statusCode(), response.body());
            if (response.statusCode() == 400 || response.statusCode() == 401 || response.statusCode() == 403) {
                break; // Key/payload error, don't retry other models
            }
        }

        if (response != null && response.statusCode() == 200) {
            JsonNode root = objectMapper.readTree(response.body());
            String text = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
            text = cleanJsonString(text);
            log.info("Live Gemini AI response generated successfully using model: {}", usedModel);
            return objectMapper.readValue(text, GeminiExtractionResult.class);
        } else {
            int code = response != null ? response.statusCode() : 500;
            String body = response != null ? response.body() : "No response";
            throw new RuntimeException("Gemini HTTP " + code + ": " + body);
        }
    }

    private List<String> buildModelOrder(String preferredModel) {
        List<String> defaults = List.of(
                "gemini-3.5-flash-lite",
                "gemini-2.5-flash-lite",
                "gemini-2.5-flash",
                "gemini-flash-latest"
        );
        if (preferredModel == null || preferredModel.isBlank() || preferredModel.equalsIgnoreCase("auto")) {
            return defaults;
        }
        java.util.List<String> ordered = new java.util.ArrayList<>();
        ordered.add(preferredModel.trim());
        for (String d : defaults) {
            if (!d.equals(preferredModel.trim())) {
                ordered.add(d);
            }
        }
        return ordered;
    }

    private SimpleHttpResponse sendGeminiRequest(String urlStr, String key, String jsonBody) throws Exception {
        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
        conn.setRequestProperty("x-goog-api-key", key);
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(20000);
        conn.setDoOutput(true);

        try (OutputStream os = conn.getOutputStream()) {
            os.write(jsonBody.getBytes(StandardCharsets.UTF_8));
        }

        int code = conn.getResponseCode();
        InputStream is = (code >= 200 && code < 300) ? conn.getInputStream() : conn.getErrorStream();
        String body = is != null ? new String(is.readAllBytes(), StandardCharsets.UTF_8) : "";
        conn.disconnect();
        return new SimpleHttpResponse(code, body);
    }

    public Map<String, Object> testApiKey(String key, String preferredModel) {
        if (key == null || key.trim().isEmpty()) {
            return Map.of("valid", false, "message", "API key cannot be empty");
        }
        try {
            String jsonBody = objectMapper.writeValueAsString(Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", "Reply with OK"))))
            ));
            List<String> modelsToTry = buildModelOrder(preferredModel);
            SimpleHttpResponse lastResp = null;
            for (String model : modelsToTry) {
                String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent";
                lastResp = sendGeminiRequest(url, key.trim(), jsonBody);
                if (lastResp.statusCode() == 200) {
                    return Map.of("valid", true, "model", model, "message", "Connected successfully to " + model);
                }
                if (lastResp.statusCode() == 400 || lastResp.statusCode() == 401 || lastResp.statusCode() == 403) {
                    break;
                }
            }
            int code = lastResp != null ? lastResp.statusCode() : 500;
            String body = lastResp != null ? lastResp.body() : "No response";
            return Map.of("valid", false, "message", "Google API returned HTTP " + code + ": " + body);
        } catch (Exception e) {
            return Map.of("valid", false, "message", "Connection error: " + e.getMessage());
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

        // Detect Language: HINDI (Devanagari), HINGLISH, or ENGLISH
        boolean isHindiScript = incomingMessage.chars().anyMatch(c -> c >= 0x0900 && c <= 0x097F);
        boolean isHinglish = !isHindiScript && (
                lower.contains("kya") || lower.contains("hai") || lower.contains("kitne") || lower.contains("kitna")
                || lower.contains("bhaiya") || lower.contains("bhai") || lower.contains("batao") || lower.contains("chahiye")
                || lower.contains("milega") || lower.contains("bhej") || lower.contains("karo") || lower.contains("mehenga")
                || lower.contains("sasta") || lower.contains("lena") || lower.contains("kar do") || lower.contains("namaste")
                || lower.contains("ji") || lower.contains("nahi") || lower.contains("haan")
        );

        // 0. Check for arrogant, rude, abusive, or 1-on-1 human escalation requests
        if (lower.contains("rude") || lower.contains("stupid") || lower.contains("idiot") || lower.contains("fraud")
                || lower.contains("scam") || lower.contains("cheat") || lower.contains("bakwas") || lower.contains("bekar")
                || lower.contains("ghatiya") || lower.contains("useless") || lower.contains("owner") || lower.contains("manager")
                || lower.contains("call me") || lower.contains("talk to") || lower.contains("1-1") || lower.contains("1 on 1")
                || lower.contains("one to one") || lower.contains("baat karni") || lower.contains("call karo")
                || incomingMessage.contains("बकवास") || incomingMessage.contains("बात करनी") || incomingMessage.contains("कॉल करो")) {
            res.setDetectedStage("NEGOTIATING");
            res.setNeedsHumanAttention(true);
            res.setLeakedRevenueReason("NONE");
            if (isHindiScript) {
                res.setCustomerReply("कृपया थोड़ा समय दें, हम आपसे थोड़ी देर में बात करेंगे।");
            } else if (isHinglish) {
                res.setCustomerReply("Thoda samay dijiye, hum aapse thodi der mein baat karte hain.");
            } else {
                res.setCustomerReply("Allow some moment, will discuss in sometime.");
            }
            return res;
        }

        // 1. Check for confirmed purchase (English + Hinglish + Hindi)
        if (lower.contains("order") || lower.contains("send it") || lower.contains("pack") || lower.contains("paid")
                || lower.contains("confirm") || lower.contains("buy") || lower.contains("bhej do") || lower.contains("bhejo")
                || lower.contains("le lunga") || lower.contains("lena hai") || lower.contains("kar do")
                || incomingMessage.contains("ऑर्डर") || incomingMessage.contains("भेज दो") || incomingMessage.contains("लेना है") || incomingMessage.contains("पैक")) {
            Product matched = findBestMatchingProduct(catalog, lower);
            BigDecimal val = matched != null ? matched.getPrice() : BigDecimal.valueOf(500);
            res.setDetectedStage("SOLD");
            res.setIsDealClosed(true);
            res.setEstimatedDealValue(val);
            res.setProductMentioned(matched != null ? matched.getName() : "Item Order");
            res.setLeakedRevenueReason("NONE");
            String upi = (vendor.getUpiId() != null && !vendor.getUpiId().isBlank()) ? vendor.getUpiId().trim() : null;
            String upiPartEn = upi != null ? " UPI ID: " + upi + "." : "";
            String upiPartHi = upi != null ? " UPI ID: " + upi + " |" : "";
            if (isHindiScript) {
                res.setCustomerReply("धन्यवाद! आपका ऑर्डर कन्फर्म हो गया है।" + upiPartHi + " कुल राशि: " + cur + val + "।");
            } else if (isHinglish) {
                res.setCustomerReply("Shukriya! Aapka order confirm ho gaya hai." + upiPartHi + " Total: " + cur + val + ".");
            } else {
                res.setCustomerReply("Thank you! Order confirmed. Total: " + cur + val + "." + upiPartEn);
            }
            return res;
        }

        // 2. Check for lost deal / price objection (English + Hinglish + Hindi)
        if (lower.contains("too expensive") || lower.contains("costly") || lower.contains("high price")
                || lower.contains("discount") || lower.contains("budget") || lower.contains("mehenga")
                || lower.contains("mahanga") || lower.contains("kam karo") || lower.contains("jyada")
                || incomingMessage.contains("महंगा") || incomingMessage.contains("कम") || incomingMessage.contains("डिस्काउंट")) {
            Product matched = findBestMatchingProduct(catalog, lower);
            BigDecimal val = matched != null ? matched.getPrice() : BigDecimal.valueOf(450);
            res.setDetectedStage("LOST");
            res.setLeakedRevenueReason("PRICE_HIGH");
            res.setEstimatedDealValue(val);
            res.setProductMentioned(matched != null ? matched.getName() : "General Product");
            if (isHindiScript) {
                res.setCustomerReply("हम आपकी बात समझते हैं! हमारे प्रोडक्ट्स 100% असली और वारंटी के साथ आते हैं। अगर आप 2 या अधिक आइटम लेते हैं, तो हम 5% अतिरिक्त छूट दे सकते हैं। क्या यह ठीक रहेगा?");
            } else if (isHinglish) {
                res.setCustomerReply("Hum samajhte hain! Hamare products 100% genuine aur warranty ke saath aate hain. Agar aap 2 ya zyada pieces lete hain toh hum 5% extra discount de sakte hain. Kya ye chalega?");
            } else {
                res.setCustomerReply("We understand! Our prices reflect 100% genuine quality and warranty. If you order 2 or more, we can offer an additional 5% discount. Would that work?");
            }
            return res;
        }

        // 3. Check for product match in catalog
        Product matched = findBestMatchingProduct(catalog, lower);
        if (matched != null) {
            res.setProductMentioned(matched.getName());
            res.setEstimatedDealValue(matched.getPrice());

            if (matched.getStockStatus().name().equals("OUT_OF_STOCK")) {
                res.setDetectedStage("LOST");
                res.setLeakedRevenueReason("OUT_OF_STOCK");
                if (isHindiScript) {
                    res.setCustomerReply("नमस्ते! फिलहाल " + matched.getName() + " स्टॉक में नहीं है। नया स्टॉक 2 दिनों में आ रहा है। क्या हम आपके लिए 1 पीस रिज़र्व कर दें?");
                } else if (isHinglish) {
                    res.setCustomerReply("Namaste! Abhi " + matched.getName() + " out of stock hai. Naya stock 2 din mein aa raha hai. Kya aapke liye reserve kar dein?");
                } else {
                    res.setCustomerReply("Hello! Currently " + matched.getName() + " is temporarily out of stock. Fresh batch arrives in 2 days. Would you like us to reserve one for you?");
                }
            } else {
                boolean askedPrice = lower.contains("price") || lower.contains("rate") || lower.contains("cost")
                        || lower.contains("kitne") || lower.contains("kitna") || lower.contains("bhav")
                        || lower.contains("how much") || incomingMessage.contains("कितने")
                        || incomingMessage.contains("भाव") || incomingMessage.contains("कीमत") || incomingMessage.contains("दाम");

                if (askedPrice) {
                    res.setDetectedStage("PRICE_QUOTED");
                    if (isHindiScript) {
                        res.setCustomerReply("जी हाँ, " + matched.getName() + " उपलब्ध है। कीमत: " + cur + matched.getPrice() + "।");
                    } else if (isHinglish) {
                        res.setCustomerReply("Haan ji, " + matched.getName() + " available hai. Price: " + cur + matched.getPrice() + ".");
                    } else {
                        res.setCustomerReply("Yes, " + matched.getName() + " is available for " + cur + matched.getPrice() + ".");
                    }
                } else {
                    res.setDetectedStage("INQUIRY");
                    if (isHindiScript) {
                        res.setCustomerReply("नमस्ते! जी हाँ, " + matched.getName() + " स्टॉक में उपलब्ध है। क्या आप इसकी कीमत या विवरण जानना चाहेंगे?");
                    } else if (isHinglish) {
                        res.setCustomerReply("Namaste! Haan ji, " + matched.getName() + " stock mein available hai. Kya aapko iska price ya details chahiye?");
                    } else {
                        res.setCustomerReply("Hello! Yes, " + matched.getName() + " is in stock. Would you like its price or details?");
                    }
                }
            }
            return res;
        }

        // 4. Unmet demand / inquiry
        if (lower.contains("have") || lower.contains("available") || lower.contains("price") || lower.contains("do you")
                || lower.contains("kitne") || lower.contains("rate") || lower.contains("milega") || lower.contains("chahiye")
                || incomingMessage.contains("कितने") || incomingMessage.contains("मिलेगा") || incomingMessage.contains("चाहिए") || incomingMessage.contains("है क्या")) {
            res.setDetectedStage("INQUIRY");
            res.setUnmetDemandItem(incomingMessage.replaceAll("(?i)(do you have|available|price of|is there|kya|hai|milega)", "").trim());
            if (isHindiScript) {
                res.setCustomerReply("नमस्ते! " + vendor.getStoreName() + " में आपका स्वागत है। कृपया थोड़ा विवरण या फोटो भेजें ताकि हम गोदाम में स्टॉक चेक कर सकें?");
            } else if (isHinglish) {
                res.setCustomerReply("Namaste! " + vendor.getStoreName() + " mein aapka swagat hai. Kya aap thoda detail ya photo bhej sakte hain taaki hum warehouse mein check kar sakein?");
            } else {
                res.setCustomerReply("Hello! Thanks for reaching out to " + vendor.getStoreName() + ". Could you share a quick photo or model name so we can check if it is in our warehouse?");
            }
            return res;
        }

        // 5. Default greeting
        res.setDetectedStage("INQUIRY");
        if (isHindiScript) {
            res.setCustomerReply("नमस्ते! " + vendor.getStoreName() + " में आपका स्वागत है। बताइए आज हम आपकी क्या मदद कर सकते हैं?");
        } else if (isHinglish) {
            res.setCustomerReply("Namaste! " + vendor.getStoreName() + " mein aapka swagat hai. Bataiye aaj hum aapki kya help kar sakte hain?");
        } else {
            res.setCustomerReply("Hello! Welcome to " + vendor.getStoreName() + ". How can we help you today with our products and pricing?");
        }
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
        return null;
    }
}
