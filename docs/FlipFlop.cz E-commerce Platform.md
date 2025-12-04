# **Technical Specification: flipflop.statex.cz E-commerce Platform**

## **Project Overview**

Create a modern, fully automated e-commerce platform for selling diverse product categories in the Czech Republic (<https://flipflop.statex.cz/>). The platform will integrate with multiple wholesale suppliers via APIs, automatically synchronize product data, process orders, and handle the entire customer journey from product discovery to delivery with minimal human intervention.

**Primary Goal**: Maximize conversion rates and encourage repeat purchases through automation, speed, user-friendly design, and high-quality product presentation.

**Key Principle**: Every detail in this specification is critical and must be implemented. Nothing should be omitted or overlooked.

---

## **1\. Business Model & Core Functionality**

### **1.1 Product Management**

* Support for diverse product categories: footwear, textiles, equipment, entertainment, toys, and any other product types  
* All products organized into distinct categories  
* Dynamic product synchronization with wholesale suppliers via API  
* Automatic order forwarding to suppliers when customers purchase  
* Support for product variants (colors, sizes, etc.)  
* Comprehensive product parameters stored in database (extensive columns for detailed filtering)  
* Product groups and categories  
* Manufacturer and brand information  
* Planned restocks/arrivals  
* Product reviews with ratings (star system)  
* Photos and videos for each product  
* Related products, alternative products, and product bundles  
* Popular products and best deals sections  
* Wishlist/favorites functionality with social media sharing capabilities  
* Product comparison feature

### **1.2 Pricing & Profitability**

* Configurable profit margin percentages for each product type  
* Individual price editing capability for:  
  * Single products  
  * Product groups  
  * Products from specific suppliers  
* Real-time profit and expense calculation per:  
  * Individual product  
  * User/customer  
  * Product category  
  * Supplier  
* Margin tracking for every completed order  
* Price drop alerts/notifications for customers (price watch feature)

### **1.3 Order Management**

* Complete order tracking in customer accounts  
* Admin dashboard for order monitoring  
* Order history and status tracking at all stages  
* Automated order processing from placement to delivery  
* Zero manual intervention required  
* Proforma invoices in Czech language at checkout  
* Final invoices after payment and shipment  
* Invoice delivery through customer's preferred communication channel

### **1.4 Supplier Integration**

* API connections with multiple wholesale suppliers  
* Supplier list management  
* Track which products come from which suppliers  
* Monitor supplier performance and product sales by supplier

---

## **2\. Customer Journey & User Experience**

### **2.1 User Flow**

1. Customer arrives on site  
2. Searches for product using search or menu navigation  
3. Adds product to cart  
4. Views recommended/complementary products  
5. Proceeds to checkout  
6. Enters delivery address  
7. Completes payment  
8. Order created automatically  
9. Notifications sent to customers via chosen channel (email, Telegram, WhatsApp, etc.)  
10. Complete package tracking until delivery

### **2.2 Minimal Actions Principle**

* Minimize clicks, scrolls, and user actions required for purchase  
* Streamlined checkout process  
* One-click purchase options where possible  
* Sticky header on product page with:  
  * Product photo  
  * Product name  
  * Star rating  
  * Price  
  * "Add to cart" button  
  * "Buy now and pay" button  
  * "Add to favorites" button

### **2.3 Personalization**

* IP-based geolocation to determine delivery region in Czech Republic  
* For returning customers:  
  * Auto-select last used delivery method  
  * Auto-select last used payment method  
  * Pre-filled delivery addresses

---

## **3\. Frontend & Design Requirements**

### **3.1 Design Philosophy**

* Modern, contemporary design aesthetic  
* Focus on visual impact and "wow factor"  
* Responsive design \- perfect display on mobile devices  
* Maximum image quality and size  
* Minimal text, maximum visuals  
* Inspiration: Amazon, AliExpress, eBay product presentation  
* Copy successful design patterns from top-performing e-commerce platforms

### **3.2 Product Display**

**Product Cards (Grid View):**

* Product visible with variant previews without clicking  
* Example: For sneakers, show main image plus small thumbnails of color variants  
* Display key information: name, benefits (free delivery), price, reviews, color options

**Product Page (Landing Page Style):**

* Full-width card utilizing all available screen space  
* All available product information displayed  
* Maximum possible description for SEO and AI agent indexing  
* High-quality, high-resolution product photos  
* Zoom capability (like AliExpress, Amazon, eBay)  
* Product videos  
* Large, prominent text  
* Detailed descriptions  
* Emphasis on savings: use words like "sleva" (discount), "ušetři" (save), etc.  
* Star ratings and user reviews prominently displayed  
* Multiple photos and videos

### **3.3 Performance**

* Extremely fast loading  
* All pages cached for maximum content delivery speed  
* Optimized for speed and usability  
* High readability of texts  
* Convenient viewing of high-quality images  
* Image zoom and gallery features

### **3.4 Filtering & Search**

* Comprehensive filtering system  
* Multiple parameters for precise product filtering  
* Advanced search functionality  
* Filter by all product attributes stored in database

### **3.5 Mobile Optimization**

* Fully responsive design  
* Touch-optimized interface  
* Fast mobile performance  
* Perfect display on all mobile devices

---

## **4\. AI & Automation Features**

### **4.1 AI Shopping Assistant**

* Voice and text-based product consultation  
* AI agent helps customers choose products  
* Guides customers through the site  
* Assists with purchase completion  
* Natural language product search

### **4.2 AI-Friendly Architecture**

* Markdown version of every page for AI agents  
* "AI Version" link on each page  
* Auto-generated Markdown on demand via API  
* Structured data for AI indexing

### **4.3 Content Generation**

* Aggregate maximum text descriptions from:  
  * Heureka.cz  
  * Google first-page search results  
  * Seznam.cz first-page results  
* SEO-optimized product descriptions  
* Rich content for search engine and AI agent indexing

---

## **5\. SEO Requirements**

### **5.1 SEO Optimization**

* Configurable SEO settings for:  
  * Individual products  
  * Product categories  
  * Brands and manufacturers  
* SEO interface in admin dashboard  
* Rich product descriptions optimized for search engines  
* Structured data implementation  
* Fast loading times for better rankings

### **5.2 Czech Language**

* Entire site in Czech language  
* Czech-specific keywords and terminology  
* Localized content for Czech market

---

## **6\. User Accounts & Dashboards**

### **6.1 Customer Account**

* Order history  
* Profile settings  
* Saved delivery addresses  
* Personal discounts  
* Favorites/wishlist  
* Tracked products (price alerts)

### **6.2 Admin Dashboard**

**Product Management:**

* Add new product sources/suppliers  
* Edit existing products  
* Inventory management  
* Warehouse settings  
* Stock levels

**Order Management:**

* Package creation  
* Package tracking  
* Order status at all stages  
* Customer communication

**User Management:**

* User list  
* User settings  
* Customer data

**Statistics & Analytics:**

* Sales volume visualization (total, by category, by product, by supplier)  
* Revenue structure (by customers, suppliers, products)  
* Expense structure  
* Transaction history  
* Performance reports  
* Margin analysis per order

**Financial Management:**

* Orders  
* Invoices  
* Proforma invoices  
* Returns  
* Corrected tax documents  
* Returned payments  
* Packages  
* Complaints/claims  
* Purchase cancellations  
* Financial transactions  
* Bank statements  
* Tax reports

**Notifications:**

* Notification settings  
* Multi-channel notification management

**Payment & Delivery:**

* Payment gateway configuration  
* Multiple Czech payment gateways  
* Delivery service settings  
* Shipping provider integrations  
* Tracking module integration

**Marketing Tools:**

* Discount certificates/vouchers  
* Discount management system  
* Gift options  
* Price bonuses  
* Loyalty programs  
* Daily offers  
* Promotional campaigns  
* Marketing tool suite

**Claims & Returns:**

* Complaint management  
* Return processing  
* Refund handling

### **6.3 Statistics & Visualization**

* Visual data representation  
* Sales performance charts  
* Transaction monitoring  
* Category performance  
* Product performance  
* Supplier performance  
* Real-time dashboards

---

## **7\. Integration & Third-Party Services**

### **7.1 Supplier APIs**

* Dynamic product synchronization  
* Automatic order forwarding  
* Real-time inventory updates  
* Price synchronization

### **7.2 Logistics Integration**

* Shipping provider API connections  
* Package tracking  
* Tracking number generation  
* Delivery status updates

### **7.3 Payment Gateways**

* Multiple Czech payment gateway integrations  
* Secure payment processing  
* Payment confirmation automation

### **7.4 Marketplace Export**

* Export all data to maximum number of marketplaces:  
  * Allegro  
  * Heureka  
  * Zbozi  
  * Aukro  
  * Bazos  
  * And others

### **7.5 Advertising Networks**

* Facebook Marketplace integration  
* WhatsApp sales integration  
* Other advertising network connections

---

## **8\. Technical Requirements**

### **8.1 Infrastructure**

* Production environment using Docker containers  
* Microservices architecture:  
  * **External Shared Production Microservices** (used by multiple applications):
    * `nginx-microservice` - Reverse proxy, SSL termination, and blue/green deployment management
    * `database-server` - Shared PostgreSQL and Redis server
    * `notifications-microservice` - Multi-channel notification service (Email, Telegram, WhatsApp)
    * `logging-microservice` - Centralized logging service
  * These services are managed separately and must be running before deploying this application
  * Additional microservices as needed

### **8.2 SSL & Security**

* SSL certificates via Certbot and Let's Encrypt  
* Automated certificate renewal  
* Secure data transmission

### **8.3 Data Persistence**

* Docker Volumes mounted to local server filesystem  
* Data persistence across Docker restarts and volume recreation  
* SSL certificates preserved  
* Database persistence

### **8.4 Deployment**

* Blue/Green deployment scripts  
* Automated deployment process  
* Zero-downtime deployments

### **8.5 Configuration Management**

* NO hardcoded values  
* All variables in .env file  
* Additional settings configurable in:  
  * Admin interface  
  * User interface  
  * Configuration files

### **8.6 Database**

* **External Shared Production Microservice**: `database-server`
* Shared PostgreSQL and Redis server used by multiple applications
* Already running in separate Docker container (`db-server-postgres`, `db-server-redis`)
* Not part of this project deployment
* Accessible via Docker network (`db-server-postgres:5432`) or SSH tunnel for local development
* Used by multiple applications: e-commerce, statex.cz, crypto-ai-agent, etc.

### **8.7 Nginx**

* **External Shared Production Microservice**: `nginx-microservice`
* Reverse proxy, SSL termination, and blue/green deployment management
* Shared service used by multiple applications (statex.cz, flipflop.statex.cz, crypto-ai-agent.statex.cz, etc.)
* Already running in separate Docker container
* Project only provides configuration files for this application's domain
* Configuration files transferred to existing Nginx server
* Manages SSL certificates via Let's Encrypt/Certbot

### **8.8 Logging**

**External Shared Production Microservice**: `logging-microservice`

**Centralized Logging System:**

* **External Shared Service**: `https://logging.statex.cz` (production) or `http://logging-microservice:3367` (Docker network)
* Shared logging service used by multiple applications
* Logger utility for all services acts as a client/wrapper for the external service
* Logs are sent to the centralized service AND written locally as backup
* Configuration via .env:  
  * `LOG_LEVEL`  
  * `LOG_TIMESTAMP_FORMAT`  
  * `LOGGING_SERVICE_URL` (defaults to `https://logging.statex.cz` in production)
  * Other logging parameters

**Logging Requirements:**

* All logs include date and time  
* Standardized output format  
* Debug logging enabled  
* Intensive logging throughout development \- NO EXCEPTIONS  
* Logs stored in `./logs` directory (local backup)
* All logs also sent to centralized logging microservice

### **8.9 Documentation**

* All documentation stored in `/docs` directory  
* Comprehensive technical documentation  
* API documentation  
* Deployment guides  
* Architecture documentation

---

## **9\. Development Phases & MVP Strategy**

### **9.1 Phase 1: Minimum Viable Product (MVP)**

**Core Features Required for Launch:**

1. **Basic Product Display**  
   * Product listing page  
   * Basic product card with image, name, price  
   * Simple product detail page  
   * Basic filtering (category)  
2. **Essential E-commerce Functions**  
   * Shopping cart  
   * Basic checkout process  
   * Single payment gateway integration  
   * Order creation  
   * Email notifications  
3. **Minimal Admin Dashboard**  
   * Product management (add/edit/delete)  
   * Order list view  
   * Basic order status updates  
   * Simple inventory tracking  
4. **Single Supplier Integration**  
   * API connection to one test supplier  
   * Basic product sync  
   * Manual order forwarding (to test integration)  
5. **Basic Infrastructure**  
   * Docker containerization  
   * Database connection  
   * Nginx configuration  
   * SSL certificates  
   * Basic logging  
6. **Customer Account Basic**  
   * Registration/login  
   * Order history view  
   * Profile settings

**MVP Success Criteria:**

* Customer can browse products, add to cart, and complete purchase  
* Admin can manage products and view orders  
* Basic automation works (product sync, notifications)  
* Site loads quickly and displays correctly on mobile

### **9.2 Phase 2: Enhanced Functionality**

1. **Advanced Product Features**  
   * Product variants (colors, sizes)  
   * Product reviews and ratings  
   * Product videos  
   * Image zoom functionality  
   * Related products  
   * Product comparison  
2. **Multiple Supplier Integration**  
   * Connect additional suppliers  
   * Automated order forwarding  
   * Supplier management interface  
3. **Enhanced Checkout**  
   * Multiple payment gateways  
   * Multiple delivery options  
   * Geolocation-based defaults  
   * Proforma invoices  
4. **Logistics Integration**  
   * Shipping provider APIs  
   * Package tracking  
   * Tracking notifications  
5. **Advanced Filtering**  
   * Multiple filter parameters  
   * Advanced search  
   * Price range filters

### **9.3 Phase 3: Marketing & Optimization**

1. **Marketing Tools**  
   * Discount system  
   * Vouchers/certificates  
   * Loyalty programs  
   * Daily offers  
   * Promotional campaigns  
2. **AI Shopping Assistant**  
   * Voice/text consultation  
   * Product recommendations  
   * Guided shopping  
3. **SEO Enhancement**  
   * AI-friendly Markdown pages  
   * Rich content generation  
   * Structured data  
   * SEO management interface  
4. **Wishlist & Social**  
   * Favorites functionality  
   * Social sharing  
   * Gift registry features

### **9.4 Phase 4: Advanced Analytics & Marketplace**

1. **Advanced Analytics**  
   * Visual dashboards  
   * Profit/margin analysis  
   * Detailed reporting  
   * Performance metrics  
2. **Marketplace Integration**  
   * Export to Allegro, Heureka, Zbozi, etc.  
   * Multi-channel sales management  
3. **Advertising Networks**  
   * Facebook Marketplace  
   * WhatsApp integration  
4. **Advanced Features**  
   * Price drop alerts  
   * Product bundles  
   * Alternative product suggestions  
   * Sticky product header

### **9.5 Phase 5: Polish & Optimization**

1. **Performance Optimization**  
   * Advanced caching  
   * Image optimization  
   * Database optimization  
   * Load testing and optimization  
2. **UX Refinement**  
   * A/B testing  
   * Conversion optimization  
   * Mobile experience enhancement  
   * One-click purchase  
3. **Advanced Admin Features**  
   * Financial reports  
   * Tax reports  
   * Bank statement integration  
   * Advanced inventory management  
4. **Claims & Returns**  
   * Complaint management  
   * Return processing  
   * Refund automation

---

## **10\. Technology Stack Selection**

### **10.1 Decision Required: Architecture**

**Options to evaluate:**

* Monolithic vs Microservices  
* Server-side rendering vs Client-side rendering vs Hybrid  
* Traditional backend vs Serverless components

**Considerations:**

* Scalability requirements  
* Development speed vs long-term maintenance  
* Team expertise  
* Hosting costs  
* Performance requirements

### **10.2 Decision Required: Frontend**

**Options to evaluate:**

* React / Next.js  
* Vue.js / Nuxt.js  
* Svelte / SvelteKit  
* Other modern framework

**Requirements:**

* Fast rendering  
* SEO-friendly  
* Easy to generate Markdown versions  
* Mobile-optimized

### **10.3 Decision Required: Backend**

**Options to evaluate:**

* Node.js (Express, Fastify, NestJS)  
* Python (Django, FastAPI, Flask)  
* PHP (Laravel, Symfony)  
* Go  
* Other

**Requirements:**

* API development capability  
* Easy supplier API integration  
* Good performance  
* Docker-compatible

### **10.4 Decision Required: Database**

**Note:** Database is already running separately **Need to know:**

* Which database system is currently running?  
* PostgreSQL, MySQL, MongoDB, etc.?

### **10.5 Decision Required: Caching**

**Options to evaluate:**

* Redis  
* Memcached  
* In-memory caching  
* CDN integration

### **10.6 Decision Required: Search**

**Options to evaluate:**

* Elasticsearch  
* Algolia  
* Database full-text search  
* Meilisearch  
* TypeSense

### **10.7 Decision Required: AI Integration**

**For AI Shopping Assistant:**

* OpenAI API  
* Anthropic Claude API  
* Open-source LLM (self-hosted)  
* Other AI services

### **10.8 Decision Required: Notification Service**

**Multi-channel notifications:**

* Email service (SendGrid, Mailgun, AWS SES, etc.)  
* Telegram Bot API  
* WhatsApp Business API  
* SMS service  
* Push notifications

### **10.9 Required: Payment Gateways (Czech)**

**Popular options in Czech Republic:**

* GoPay  
* ComGate  
* PayU  
* Stripe  
* Others to be specified

### **10.10 Required: Logging Solution**

* Winston (Node.js)  
* Python logging module  
* Custom logging service  
* ELK Stack (Elasticsearch, Logstash, Kibana)  
* Other centralized logging solution

---

## **11\. Module Breakdown for Development**

### **11.1 Core Modules**

1. **Product Module**  
   * Product CRUD operations  
   * Category management  
   * Variant management  
   * Inventory tracking  
2. **Supplier Integration Module**  
   * API connector framework  
   * Product sync engine  
   * Order forwarding system  
   * Supplier management  
3. **Cart & Checkout Module**  
   * Shopping cart functionality  
   * Checkout process  
   * Payment integration  
   * Order creation  
4. **User Management Module**  
   * Authentication  
   * Authorization  
   * User profiles  
   * Customer accounts  
5. **Order Management Module**  
   * Order processing  
   * Status tracking  
   * Invoice generation  
   * Notification triggers  
6. **Notification Module (External Shared Microservice)**  
   * **External Shared Production Microservice**: `notifications-microservice` (`https://notifications.statex.cz`)
   * Multi-channel notification system (Email, Telegram, WhatsApp, SMS)
   * Shared service used by multiple applications  
   * Notification templates  
   * Delivery tracking  
7. **Logistics Module**  
   * Shipping provider integration  
   * Package tracking  
   * Delivery management  
8. **Admin Dashboard Module**  
   * Product management interface  
   * Order management interface  
   * User management interface  
   * Statistics and analytics  
9. **Marketing Module**  
   * Discount management  
   * Voucher system  
   * Loyalty programs  
   * Promotional campaigns  
10. **SEO & Content Module**  
    * SEO settings interface  
    * Markdown generation  
    * Content aggregation  
    * Sitemap generation  
11. **AI Assistant Module**  
    * Chatbot interface  
    * NLP integration  
    * Product recommendation engine  
    * Conversation management  
12. **Analytics Module**  
    * Data collection  
    * Reporting engine  
    * Visualization  
    * Profit/margin calculation  
13. **Marketplace Export Module**  
    * Data export API  
    * Marketplace integrations  
    * Sync management

### **11.2 Supporting Modules**

1. **Logging Module**  
    * Centralized logging service  
    * Log collection
    * Log storage
    * Log viewer
2. **Configuration Module**  
    * Environment variable management  
    * Dynamic settings  
    * Feature flags  
3. **Cache Module**  
    * Page caching  
    * Data caching  
    * Cache invalidation  
4. **Search Module**  
    * Full-text search  
    * Filtering engine  
    * Search suggestions  
5. **Media Module**  
    * Image upload and management  
    * Image optimization  
    * Video management  
    * CDN integration

---

## **12\. Critical Implementation Notes**

### **12.1 Automation Priority**

* Every process must be automated  
* Zero manual intervention required for normal operation  
* From product discovery to delivery \- fully automated

### **12.2 Speed Priority**

* Fast loading is critical success factor  
* All pages must be cached  
* Optimize all queries  
* Minimize JavaScript bundle size  
* Lazy loading where appropriate

### **12.3 No Detail Left Behind**

* Every requirement in this document is essential  
* Nothing should be considered "nice to have" \- everything is mandatory  
* Question any omission during development

### **12.4 Czech Market Specifics**

* All text in Czech language  
* Czech payment gateways  
* Czech shipping providers  
* Czech marketplace integrations  
* Czech tax and invoice requirements

### **12.5 Conversion Optimization**

* Design decisions should maximize conversion  
* Study and copy successful patterns from Amazon, AliExpress, eBay  
* Minimize friction in purchase process  
* High-quality product presentation

### **12.6 Scalability Considerations**

* Architecture must support:  
  * Thousands of products  
  * Multiple suppliers  
  * High traffic volumes  
  * Rapid growth

---

## **13\. Success Metrics**

### **13.1 Technical Metrics**

* Page load time \< 2 seconds  
* 99.9% uptime  
* Zero data loss  
* API response time \< 500ms

### **13.2 Business Metrics**

* Conversion rate (to be optimized)  
* Average order value  
* Customer retention rate  
* Order processing time (fully automated)  
* Customer satisfaction

### **13.3 User Experience Metrics**

* Mobile usability score  
* SEO ranking positions  
* Number of clicks to purchase  
* Cart abandonment rate (to be minimized)

---

## **14\. Deliverables**

### **14.1 Code Deliverables**

* Complete source code with intensive logging  
* Docker configuration files  
* Nginx configuration files  
* Deployment scripts (Blue/Green)  
* .env template file

### **14.2 Documentation Deliverables**

* Architecture documentation  
* API documentation  
* Deployment guide  
* User manual (admin)  
* Configuration guide  
* Supplier integration guide

### **14.3 Configuration Deliverables**

* Environment variables list  
* SSL certificate setup guide  
* Database schema  
* Docker Volumes configuration

---

## **15\. Development Approach**

### **15.1 Iterative Development**

* Start with MVP (Phase 1\)  
* Validate core functionality  
* Add features in subsequent phases  
* Continuous testing and optimization

### **15.2 Testing Strategy**

* Unit tests for all critical functions  
* Integration tests for API connections  
* End-to-end tests for user flows  
* Performance testing  
* Security testing

### **15.3 Code Quality**

* Clean, readable code  
* Consistent coding standards  
* Comprehensive commenting  
* Intensive logging throughout  
* Version control (Git)

---

1. Initiate current project with <git@github.com>:speakASAP/e-commerce.git repository
2. create separate microservice as notification service in separate project in ../notification-microservice and initiate it with <git@github.com>:speakASAP/notification-microservice.git repository
3. create separate logging-microservice in separate project in ../logging-microservice and initiate it with <git@github.com>:speakASAP/logging-microservice.git repository
4. Use existing microservices ../nginx-microservice and ../database-server to connect there.
5. @tasks.md (3-16) Check if Certbot and Let's Encrypt realized in ../nginx-microservice already
6. Email Notification Setup should be realized in separate project in ../notification-microservice
7. Move testing phase to the final stage

## **Final Notes**

This specification represents a complete, feature-rich e-commerce platform. Every detail has been preserved from the original requirements. The development should proceed in phases, starting with MVP functionality and progressively adding advanced features.

**Key Success Factors:**

1. Automation above all  
2. Speed and performance  
3. User experience and conversion optimization  
4. Comprehensive functionality  
5. Scalability and maintainability

**Remember:** Not a single requirement should be omitted. Every sentence, every feature, every detail in this specification is critical to the project's success.
