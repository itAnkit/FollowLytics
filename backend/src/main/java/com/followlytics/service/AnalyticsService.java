package com.followlytics.service;

import com.followlytics.dto.DashboardSummaryResponse;
import com.followlytics.dto.DashboardSummaryResponse.DemandStatDto;
import com.followlytics.dto.DashboardSummaryResponse.LeakedCategoryDto;
import com.followlytics.entity.CustomerDeal;
import com.followlytics.entity.DealStage;
import com.followlytics.entity.DemandLog;
import com.followlytics.entity.Vendor;
import com.followlytics.repository.CustomerDealRepository;
import com.followlytics.repository.DemandLogRepository;
import com.followlytics.repository.VendorRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
public class AnalyticsService {

    private final VendorRepository vendorRepository;
    private final CustomerDealRepository customerDealRepository;
    private final DemandLogRepository demandLogRepository;

    public AnalyticsService(VendorRepository vendorRepository,
                            CustomerDealRepository customerDealRepository,
                            DemandLogRepository demandLogRepository) {
        this.vendorRepository = vendorRepository;
        this.customerDealRepository = customerDealRepository;
        this.demandLogRepository = demandLogRepository;
    }

    public DashboardSummaryResponse getDashboardSummary(Long vendorId) {
        Vendor vendor = vendorRepository.findById(vendorId)
                .orElseGet(() -> vendorRepository.findAll().stream().findFirst().orElse(null));

        DashboardSummaryResponse res = new DashboardSummaryResponse();
        if (vendor == null) {
            return res;
        }

        res.setVendorId(vendor.getId());
        res.setStoreName(vendor.getStoreName());
        res.setCurrency(vendor.getCurrency() != null ? vendor.getCurrency() : "₹");

        long totalDeals = customerDealRepository.countTotalTrackedByVendor(vendor.getId());
        res.setTotalTrackedCustomers(totalDeals);

        long soldCount = customerDealRepository.countByVendorIdAndStage(vendor.getId(), DealStage.SOLD);
        long lostCount = customerDealRepository.countByVendorIdAndStage(vendor.getId(), DealStage.LOST);
        long inqCount = customerDealRepository.countByVendorIdAndStage(vendor.getId(), DealStage.INQUIRY);
        long quotedCount = customerDealRepository.countByVendorIdAndStage(vendor.getId(), DealStage.PRICE_QUOTED);
        long negCount = customerDealRepository.countByVendorIdAndStage(vendor.getId(), DealStage.NEGOTIATING);

        res.setSoldCount(soldCount);
        res.setLostCount(lostCount);
        res.setInquiryCount(inqCount);
        res.setPriceQuotedCount(quotedCount);
        res.setNegotiatingCount(negCount);

        BigDecimal totalSales = customerDealRepository.sumClosedSalesByVendor(vendor.getId());
        BigDecimal totalLeaked = customerDealRepository.sumLeakedRevenueByVendor(vendor.getId());

        res.setTotalSalesToday(totalSales != null ? totalSales : BigDecimal.ZERO);
        res.setTotalLeakedRevenue(totalLeaked != null ? totalLeaked : BigDecimal.ZERO);

        if (totalDeals > 0) {
            double rate = ((double) soldCount / totalDeals) * 100.0;
            res.setConversionRatePercent(BigDecimal.valueOf(rate).setScale(1, RoundingMode.HALF_UP).doubleValue());
        }

        // Leaked revenue breakdown
        List<Object[]> leakedRaw = customerDealRepository.getLeakedRevenueBreakdown(vendor.getId());
        List<LeakedCategoryDto> leakedList = new ArrayList<>();
        for (Object[] row : leakedRaw) {
            String reason = row[0] != null ? row[0].toString() : "OTHER";
            long count = ((Number) row[1]).longValue();
            BigDecimal amount = (BigDecimal) row[2];
            leakedList.add(new LeakedCategoryDto(reason, count, amount));
        }
        res.setLeakedBreakdown(leakedList);

        // Top demanded products
        List<DemandLog> carried = demandLogRepository.findByVendorIdAndIsCarriedInCatalogOrderByInquiryCountDesc(vendor.getId(), true);
        List<DemandStatDto> topDemanded = carried.stream()
                .limit(5)
                .map(d -> new DemandStatDto(d.getProductName(), d.getInquiryCount(), true))
                .toList();
        res.setTopDemandedProducts(topDemanded);

        // Unmet demand (items not in catalog)
        List<DemandLog> unmet = demandLogRepository.findByVendorIdAndIsCarriedInCatalogOrderByInquiryCountDesc(vendor.getId(), false);
        List<DemandStatDto> unmetList = unmet.stream()
                .limit(5)
                .map(d -> new DemandStatDto(d.getProductName(), d.getInquiryCount(), false))
                .toList();
        res.setUnmetDemand(unmetList);

        // Recent customer deals
        List<CustomerDeal> recent = customerDealRepository.findByVendorIdOrderByLastInteractionAtDesc(vendor.getId());
        res.setRecentDeals(recent.stream().limit(10).toList());

        return res;
    }
}
