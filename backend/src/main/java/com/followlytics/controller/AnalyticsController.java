package com.followlytics.controller;

import com.followlytics.dto.DashboardSummaryResponse;
import com.followlytics.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardSummaryResponse> getDashboard(@RequestParam(defaultValue = "1") Long vendorId) {
        DashboardSummaryResponse summary = analyticsService.getDashboardSummary(vendorId);
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "FollowLytics Intelligence Backend",
                "engine", "Java 21 Spring Boot + Gemini AI"
        ));
    }
}
