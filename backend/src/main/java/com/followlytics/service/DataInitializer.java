package com.followlytics.service;

import com.followlytics.entity.*;
import com.followlytics.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final VendorRepository vendorRepository;
    private final ProductRepository productRepository;
    private final CustomerDealRepository customerDealRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final DemandLogRepository demandLogRepository;

    public DataInitializer(VendorRepository vendorRepository,
                           ProductRepository productRepository,
                           CustomerDealRepository customerDealRepository,
                           ChatMessageRepository chatMessageRepository,
                           DemandLogRepository demandLogRepository) {
        this.vendorRepository = vendorRepository;
        this.productRepository = productRepository;
        this.customerDealRepository = customerDealRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.demandLogRepository = demandLogRepository;
    }

    @Override
    public void run(String... args) {
        if (vendorRepository.count() > 0) {
            log.info("Database already initialized with vendor data.");
            return;
        }

        log.info("Seeding initial FollowLytics demo store and analytics data...");

        // 1. Create Demo Vendor
        Vendor vendor = new Vendor(
                "+919876543210",
                "Sharma Hardware & Electricals",
                "sharmahardware@upi",
                "Standard same-day local delivery for orders above ₹500. 100% genuine products with manufacturer warranty. UPI, NetBanking & Cash accepted."
        );
        vendor.setIsOnboarded(true);
        vendor = vendorRepository.save(vendor);
        Long vId = vendor.getId();

        // 2. Create Products
        Product p1 = new Product(vId, "Heavy Duty Adhesive Tape 50m", "Tapes & Adhesives", BigDecimal.valueOf(240), StockStatus.IN_STOCK,
                "Industrial strength double-sided waterproof tape. Holds up to 15kg/m.",
                "Clean surface thoroughly before sticking. Press firmly for 30 seconds. Full cure in 2 hours.");
        Product p2 = new Product(vId, "Waterproof Silicone Sealant 300ml", "Chemicals & Sealants", BigDecimal.valueOf(320), StockStatus.IN_STOCK,
                "Clear RTV acetic silicone for bathrooms, kitchens, and glass joints. Anti-fungal.",
                "Apply with standard caulking gun. Skins over in 10 mins, fully cured in 24 hours.");
        Product p3 = new Product(vId, "Professional Impact Drill 650W", "Power Tools", BigDecimal.valueOf(2150), StockStatus.IN_STOCK,
                "Variable speed reversible rotary hammer drill with 13mm keyed chuck and depth gauge.",
                "Use hammer mode for masonry/concrete and rotary mode for wood/metal. Wear safety goggles.");
        Product p4 = new Product(vId, "Outdoor LED Flood Light 50W", "Electricals", BigDecimal.valueOf(890), StockStatus.IN_STOCK,
                "IP66 weatherproof aluminium die-cast casing, 5000 Lumens cool day light.",
                "Mount securely on wall or pole. Connect to standard 220V AC with earthing.");
        Product p5 = new Product(vId, "Stainless Steel Door Hinges (Pack of 6)", "Hardware & Fixtures", BigDecimal.valueOf(480), StockStatus.IN_STOCK,
                "Grade 304 anti-rust bearing hinges, 4-inch length, includes stainless screws.",
                "Ideal for main doors and heavy internal wooden doors. Lubricate annually with light oil.");
        Product p6 = new Product(vId, "Smart WiFi MCB Switch 32A", "Smart Home", BigDecimal.valueOf(1450), StockStatus.OUT_OF_STOCK,
                "Tuya / Smart Life compatible smart breaker with energy monitoring and timer.",
                "Requires 2.4GHz WiFi connection and neutral line. Install inside distribution box.");
        Product p7 = new Product(vId, "Laser Distance Meter 40m", "Measuring Tools", BigDecimal.valueOf(1850), StockStatus.LOW_STOCK,
                "Handheld digital laser rangefinder with Pythagorean area & volume calculation, backlit LCD.",
                "Keep laser aperture clean. Avoid aiming directly into eyes. Runs on 2x AAA batteries.");

        productRepository.save(p1);
        productRepository.save(p2);
        productRepository.save(p3);
        productRepository.save(p4);
        productRepository.save(p5);
        productRepository.save(p6);
        productRepository.save(p7);

        // 3. Seed Realistic Deals
        createDeal(vId, "+919820011223", "Rahul Verma", DealStage.SOLD, BigDecimal.valueOf(2150),
                LeakedReason.NONE, "Professional Impact Drill 650W", "Confirmed purchase of 650W drill via UPI payment", true);

        createDeal(vId, "+919830022334", "Priya Builders", DealStage.SOLD, BigDecimal.valueOf(3560),
                LeakedReason.NONE, "Outdoor LED Flood Light 50W", "Purchased 4x 50W LED floodlights for site work", true);

        createDeal(vId, "+919840033445", "Amit Patel", DealStage.SOLD, BigDecimal.valueOf(240),
                LeakedReason.NONE, "Heavy Duty Adhesive Tape 50m", "Ordered 1 roll of adhesive tape for pickup", true);

        createDeal(vId, "+919850044556", "Vikram Singh", DealStage.LOST, BigDecimal.valueOf(1450),
                LeakedReason.PRICE_HIGH, "Smart WiFi MCB Switch 32A", "Found price too expensive compared to standard non-smart MCB", false);

        createDeal(vId, "+919860055667", "Deepak Joshi", DealStage.LOST, BigDecimal.valueOf(1450),
                LeakedReason.OUT_OF_STOCK, "Smart WiFi MCB Switch 32A", "Needed smart MCB urgently but item was out of stock", false);

        createDeal(vId, "+919870066778", "Rajesh Motors", DealStage.LOST, BigDecimal.valueOf(1850),
                LeakedReason.GHOSTED, "Laser Distance Meter 40m", "Ghosted after price and specs were shared", false);

        createDeal(vId, "+919880077889", "Sandeep Kumar", DealStage.PRICE_QUOTED, BigDecimal.valueOf(320),
                LeakedReason.NONE, "Waterproof Silicone Sealant 300ml", "Inquired about bathroom sealant price and cure time", false);

        createDeal(vId, "+919890088990", "Ananya Gupta", DealStage.INQUIRY, BigDecimal.valueOf(480),
                LeakedReason.NONE, "Stainless Steel Door Hinges", "Asked whether screws are included with the hinge set", false);

        // 4. Seed Demand Logs
        demandLogRepository.save(new DemandLog(vId, "Professional Impact Drill 650W", true));
        DemandLog dl1 = demandLogRepository.save(new DemandLog(vId, "Heavy Duty Adhesive Tape 50m", true));
        dl1.setInquiryCount(14);
        demandLogRepository.save(dl1);

        DemandLog dl2 = demandLogRepository.save(new DemandLog(vId, "Waterproof Silicone Sealant 300ml", true));
        dl2.setInquiryCount(9);
        demandLogRepository.save(dl2);

        DemandLog dl3 = demandLogRepository.save(new DemandLog(vId, "Smart WiFi MCB Switch 32A", true));
        dl3.setInquiryCount(7);
        demandLogRepository.save(dl3);

        // Unmet demand (items customers asked for that store doesn't have)
        DemandLog ud1 = new DemandLog(vId, "Cordless Screwdriver 12V", false);
        ud1.setInquiryCount(8);
        demandLogRepository.save(ud1);

        DemandLog ud2 = new DemandLog(vId, "Solar Inverter 2.5kVA", false);
        ud2.setInquiryCount(5);
        demandLogRepository.save(ud2);

        DemandLog ud3 = new DemandLog(vId, "Epoxy Tile Grout 5kg", false);
        ud3.setInquiryCount(4);
        demandLogRepository.save(ud3);

        log.info("FollowLytics sample data successfully seeded!");
    }

    private void createDeal(Long vendorId, String phone, String name, DealStage stage, BigDecimal value,
                            LeakedReason leakedReason, String product, String summary, boolean closed) {
        CustomerDeal deal = new CustomerDeal(vendorId, phone, name);
        deal.setStage(stage);
        deal.setDealValue(value);
        deal.setLeakedReason(leakedReason);
        deal.setProductMentioned(product);
        deal.setSummary(summary);
        deal.setIsClosed(closed);
        deal.setLastInteractionAt(LocalDateTime.now().minusHours((long) (Math.random() * 24)));
        deal = customerDealRepository.save(deal);

        chatMessageRepository.save(new ChatMessage(deal.getId(), "CUSTOMER", "Hi, is " + product + " available?"));
        chatMessageRepository.save(new ChatMessage(deal.getId(), "AI", "Yes! It is available at Sharma Hardware. Quoted: ₹" + value));
    }
}
