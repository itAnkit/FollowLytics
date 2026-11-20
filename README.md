# ⚡ FollowLytics

> **Conversational Commerce Intelligence & Analytics for WhatsApp Merchants**

FollowLytics converts WhatsApp into a structured sales engine for shopkeepers and small businesses:
1. **In-Chat AI Copilot & Autopilot**: Recommends instant answers to customer questions about product pricing, availability, and usage instructions directly on WhatsApp Web.
2. **Conversation Tracker & Deal Extraction**: Classifies the buyer journey (`Inquiry` $\rightarrow$ `Quoted` $\rightarrow$ `Negotiating` $\rightarrow$ `Won / Sold` $\rightarrow$ `Lost`) and extracts transaction values.
3. **Leaked Revenue Diagnosis**: Pinpoints exactly why deals dropped off (price objection, out of stock, unserviceable location, or ghosted).
4. **Demand Radar**: Aggregates top customer requests and surfaces unmet market demand (products customers ask for that you don't carry yet).

---

## 🏗️ Architecture

* **Backend (`/backend`)**: Java 21, Spring Boot 3, Spring Data JPA, H2 file database, and Google Gemini 2.5 Flash API with intelligent local fallback.
* **Web App (`/frontend`)**: React 18, Vite, Tailwind CSS, Lucide Icons.
* **Chrome Extension (`/extension`)**: Manifest V3 Content Script & Background Worker injecting clean badges and copilot cards into WhatsApp Web (`web.whatsapp.com`).

---

## 🚀 Quick Start Guide

### 1. Run the Java Backend
```bash
# Terminal 1
cd backend
mvn spring-boot:run
```
*API runs on `http://localhost:8080` (H2 database console available at `http://localhost:8080/h2-console`).*

### 2. Run the React Web Dashboard
```bash
# Terminal 2
cd frontend
npm install
npm run dev
```
*Dashboard opens at `http://localhost:5173`.*

### 3. Load the Chrome Extension into WhatsApp Web
1. Open Google Chrome or Brave and navigate to `chrome://extensions`.
2. Toggle on **Developer mode** (top-right).
3. Click **"Load unpacked"** and choose the `extension/` folder from this repo:
   `E:\JSB\FollowLytics\extension`
4. Open [web.whatsapp.com](https://web.whatsapp.com).
5. Open any customer conversation and click **`✨ Track Customer`** in the chat header!

---

## 🎯 Key Features

* **Interactive WhatsApp AI Simulator**: Test responses and watch live dashboard updates right inside the web app before opening WhatsApp Web.
* **Product Catalog & AI Guidance**: Set product prices, stock status, and custom usage instructions that the AI communicates to customers.
* **Leaked Revenue Diagnostic**: Monitor monetary losses classified by reason.
* **Dual Operation Modes**:
  * **Copilot Mode**: Generates 1-click draft cards above WhatsApp composer for vendor review.
  * **Autopilot Mode**: Sends natural AI replies automatically after a 2-second delay.
