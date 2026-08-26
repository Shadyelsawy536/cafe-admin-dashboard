# WHITE-LABEL MULTI-TENANT RESTAURANT PLATFORM

## Complete Product, Architecture & Implementation Specification

You are working on a production-ready **White-Label Multi-Tenant Restaurant Ordering SaaS Platform**.

The platform consists of four main products:

1. **Customer Mobile Application** — Flutter  
2. **Restaurant Admin Dashboard** — React  
3. **Master Platform Dashboard** — React
4. **Customer Ordering Website** — React

The backend must be built using:

- **Supabase**  
- **PostgreSQL**  
- **Supabase Auth**  
- **Supabase Realtime**  
- **Supabase Edge Functions**  
- **PostgreSQL Row Level Security (RLS)**

Do NOT use Firebase.

The system must be designed as a real SaaS platform from the beginning, not as a single-restaurant application.

# **IMPLEMENTATION INSTRUCTION — READ THIS FIRST**

This document is the **MASTER REFERENCE SPECIFICATION** for the platform.

It is NOT a request to implement the entire system in one pass.

The project already contains a significant amount of implemented **Flutter Customer App UI**.

Your first responsibility is NOT to rebuild the application and NOT to immediately implement the backend.

You must first inspect and understand the existing project.

---

# **0\. CURRENT PROJECT STATUS**

The Customer Mobile Application UI has already been implemented.

The current Flutter application may already contain:

* Screens  
* Navigation  
* Widgets  
* Product UI  
* Categories  
* Cart UI  
* Checkout UI  
* Orders UI  
* Profile UI  
* Branding/UI components  
* Models  
* Local state  
* Existing services  
* Existing business logic  
* Other implemented functionality

Some parts may be incomplete, use mock/local data, or not yet be connected to a real backend.

Do NOT assume that anything is missing just because it is described in this specification.

Inspect the actual repository first.

---

# **0.1 THIS DOCUMENT IS THE REFERENCE**

Everything below defines the intended final architecture, functionality, security model, and business requirements.

Treat it as the **source of truth for what the final platform should support**.

However:

**Do NOT implement all of it immediately.**

We will use this specification to compare the desired platform against the existing project.

The implementation will happen incrementally.

---

# **0.2 FIRST TASK — PROJECT AUDIT**

Before making significant code changes:

1. Inspect the entire repository.  
2. Understand the current Flutter architecture.  
3. Identify all existing screens.  
4. Identify all existing navigation.  
5. Identify existing models.  
6. Identify existing services.  
7. Identify existing state management.  
8. Identify existing components/widgets.  
9. Identify existing local/mock data.  
10. Identify existing backend integrations, if any.  
11. Identify existing authentication implementation, if any.  
12. Identify existing database integrations, if any.  
13. Identify existing Supabase/Firebase integrations, if any.  
14. Identify incomplete features.  
15. Identify broken features.  
16. Identify duplicated logic.  
17. Identify architectural problems.  
18. Compare the existing implementation against this specification.

Do not modify large portions of the project during this audit.

---

# **0.3 UI / FUNCTIONALITY GAP ANALYSIS**

After inspecting the repository, create a structured comparison.

Use categories such as:

### **Already Implemented**

Features that already exist and are reasonably aligned with the specification.

### **Partially Implemented**

Features where UI or logic exists but functionality is incomplete.

### **Missing**

Features required by the specification that do not currently exist.

### **Needs Refactoring**

Features that exist but should be changed to support the final architecture.

### **Backend-Dependent**

Features whose UI already exists but require Supabase/backend implementation.

### **Not Required for MVP**

Features described in the specification that should intentionally be postponed.

For every item, explain:

* What currently exists  
* What the specification requires  
* What is missing  
* Whether modification is necessary  
* Whether it belongs to MVP or later phase

---

# **0.4 DO NOT REBUILD EXISTING UI**

If an existing screen already satisfies the requirement:

**Do not rebuild it.**

If an existing component can be reused:

**Reuse it.**

If the existing architecture is acceptable:

**Keep it.**

Do not replace working code simply because you would personally structure it differently.

Only refactor when there is a clear technical reason related to:

* Security  
* Maintainability  
* Scalability  
* Backend integration  
* Multi-tenancy  
* Correctness  
* Performance

---

# **0.5 DO NOT IMPLEMENT THE BACKEND YET**

During the first audit phase:

Do NOT immediately create:

* Complete Supabase schema  
* Complete RLS policies  
* Edge Functions  
* Payment integrations  
* Subscription enforcement  
* Full authentication migration  
* Production database  
* Complete Restaurant Admin  
* Complete Master Dashboard

unless a small change is absolutely necessary to understand the existing architecture.

The first objective is understanding and comparison.

---

# **0.6 AUDIT OUTPUT**

After inspecting the project, provide a report with:

## **A. Current Architecture**

Explain the current application structure.

## **B. Existing Features**

List what is already implemented.

## **C. Missing Features**

List what is required by the specification but missing.

## **D. Partial Features**

List what exists but is incomplete.

## **E. Architecture Problems**

Identify problems that may affect the final SaaS architecture.

## **F. Backend Requirements**

List what the existing UI will eventually require from Supabase and external infrastructure such as Cloudflare R2 for media storage.

## **G. Database Requirements**

List the entities/data currently required by the existing UI.

## **H. Security Requirements**

List the RLS, tenant isolation, authorization, and backend security requirements.

## **I. Recommended Implementation Phases**

Create a practical implementation order based on the actual repository.

---

# **0.7 STOP AFTER THE AUDIT**

After completing the audit:

**STOP.**

Do not start implementing the entire specification automatically.

Wait for approval before making major architectural/backend changes.

The next phase will be selected based on the audit results.

---

# **0.8 IMPLEMENTATION STRATEGY AFTER APPROVAL**

Once the audit is approved, we will implement the platform incrementally.

The general order should be:

### **Phase 1**

Finalize the existing Flutter architecture and fix any critical UI/architecture issues.

### **Phase 2**

Design the Supabase PostgreSQL schema based on the actual existing UI and the reference specification.

### **Phase 3**

Implement:

* Supabase Auth  
* Profiles  
* Restaurants  
* Tenant relationships  
* Roles  
* Permissions  
* RLS  
* Tenant isolation

Then test tenant isolation before continuing.

### **Phase 4**

Connect existing Flutter UI to real Supabase data.

### **Phase 5**

Implement the order engine and server-side calculations.

### **Phase 6**

Implement Restaurant Admin Dashboard.

### **Phase 7**

Implement payments.

### **Phase 8**

Implement subscriptions and tenant lifecycle enforcement.

### **Phase 9**

Implement Master Dashboard.

### **Phase 10**

Implement advanced features.

This order may change after the repository audit.

---

# **0.9 IMPORTANT — DATABASE BEFORE FULL INTEGRATION**

Before connecting the application deeply to Supabase:

1. Finalize the database model.  
2. Create migrations.  
3. Define relationships.  
4. Define indexes.  
5. Define constraints.  
6. Define RLS policies.  
7. Define roles and permissions.  
8. Test Tenant A vs Tenant B isolation.  
9. Test platform admin access.  
10. Test suspended tenant behavior.

Only after the security model is validated should the frontend rely on the production database.

---

# **0.10 DEVELOPMENT RULE**

Always work in small, verifiable phases.

For each phase:

1. Explain what will be changed.  
2. Implement only that phase.  
3. Run/build/test the affected project.  
4. Fix errors.  
5. Verify the result.  
6. Report what was completed.  
7. Then move to the next phase.

Do not make hundreds of unrelated changes in one pass.

---

# **0.11 PRESERVE EXISTING WORK**

The existing project represents work that has already been completed.

Therefore:

**Preserve existing functionality whenever possible.**

Do not:

* Delete working screens  
* Replace the navigation unnecessarily  
* Rewrite the entire Flutter project  
* Replace components without reason  
* Remove existing features  
* Introduce duplicate architecture  
* Create parallel implementations of the same feature

If a change is necessary, explain why before making it.

---

# **0.12 REFERENCE VS TASK**

Important distinction:

This document describes the **final product**.

It does NOT mean:

"Implement everything now."

It means:

"Understand the final target, compare it with the current project, identify the gap, and then implement the missing pieces incrementally."

The existing repository is the starting point.

This specification is the target.

The implementation plan bridges the two.

---

# **0.13 DECISION RULE**

When there is a conflict between the existing implementation and this specification:

1. Identify the conflict.  
2. Explain the technical impact.  
3. Determine whether the existing implementation can be preserved.  
4. Recommend the smallest safe change.  
5. Do not automatically rewrite the feature.

For security-critical requirements such as:

* Tenant isolation  
* RLS  
* Authorization  
* Payment security  
* Subscription enforcement  
* Server-side validation

the specification takes priority over convenience.

---

# **0.14 NO ASSUMPTIONS**

Do not assume that:

* A feature does not exist because it is not obvious from one screen.  
* Backend logic exists because a UI button exists.  
* A payment integration is real because a payment screen exists.  
* Data is secure because the UI hides it.  
* Tenant isolation exists because restaurant\_id is present.  
* Subscription enforcement exists because a subscription page exists.

Verify implementation from the actual source code.

---

# **0.15 FINAL PRINCIPLE**

The project should evolve like this:

EXISTING PROJECT

↓

AUDIT

↓

GAP ANALYSIS

↓

APPROVAL

↓

DATABASE ARCHITECTURE

↓

SUPABASE FOUNDATION

↓

AUTH \+ TENANT ISOLATION \+ RLS

↓

CONNECT EXISTING UI

↓

ORDER ENGINE

↓

PAYMENTS

↓

SUBSCRIPTIONS

↓

RESTAURANT ADMIN

↓

MASTER DASHBOARD

↓

ADVANCED FEATURES

Do not skip the audit.

Do not rebuild working UI.

Do not implement the entire platform in one pass.

Build incrementally toward the architecture defined in this document.

---

# 1\. CORE BUSINESS MODEL

The platform is a **multi-tenant white-label restaurant system**.

One platform can host many restaurants.

Example:

Platform

│

├── Restaurant A

│   ├── Customer App

│   └── Restaurant Admin

│

├── Restaurant B

│   ├── Customer App

│   └── Restaurant Admin

│

├── Restaurant C

│   ├── Customer App

│   └── Restaurant Admin

│

└── Master Dashboard

The platform owner controls all restaurants from the Master Dashboard.

Each restaurant controls only its own:

- Products  
- Categories  
- Orders  
- Customers  
- Offers  
- Coupons  
- Delivery  
- Branding  
- Staff  
- Payment configuration  
- Notifications  
- Reports  
- Features

A restaurant must NEVER be able to access another restaurant's private data.

This must be enforced at the database level using PostgreSQL RLS.

Do not rely only on frontend filtering for security.

---

# 2\. FINAL TECHNOLOGY STACK

## Customer App

Use:

- Flutter  
- Dart  
- Clean Architecture where practical  
- Feature-based folder structure  
- Supabase Flutter SDK  
- Secure local storage where required  
- Firebase Cloud Messaging may be used ONLY as a push notification delivery service if required  
  1. Firebase must NOT be used for:  
     \- Authentication  
     \- Database  
     \- Firestore  
     \- Storage  
     \- Backend logic  
     \- Tenant authorization  
     \- RLS  
     \- Business logic  
     All application backend functionality must remain within Supabase/PostgreSQL/Edge Functions unless a specific external integration is explicitly required.  
       
- Native Android/iOS capabilities when required

The customer app must be reusable as a white-label engine.

Do NOT create separate codebases for every restaurant.

The same Flutter engine should load restaurant-specific configuration dynamically.

---

# 3\. RESTAURANT ADMIN DASHBOARD

Use:

- React  
- TypeScript  
- Vite  
- Supabase client  
- React Router  
- A maintainable component architecture  
- Responsive UI  
- Desktop-first design  
- Tablet support

The dashboard must be tenant-aware.

A restaurant admin can only access its own tenant.

---

# 4\. MASTER DASHBOARD

Use:

- React  
- TypeScript  
- Vite  
- Supabase  
- Responsive design

The Master Dashboard is for the platform owner and authorized platform staff.

It must provide global visibility and management.

---

# 5\. BACKEND

Use Supabase as the central backend.

Supabase components:

### PostgreSQL

Main application database.

### Supabase Auth

Authentication and sessions.

### Cloudflare R2

Object storage for restaurant images and other media assets, including product images, restaurant logos, banners, category images, and other customer-facing visual assets.

Supabase/PostgreSQL stores the metadata and references/URLs needed by the application, while the actual image files are uploaded to Cloudflare R2.

### Supabase Realtime

Real-time order updates and other live events.

### Supabase Edge Functions

### Cloudflare R2 Image Storage Architecture

All customer-facing images and media assets should be uploaded to **Cloudflare R2**, not stored directly in Supabase Storage.

The recommended flow is:

```
Restaurant Admin
      ↓
Secure upload flow
      ↓
Cloudflare R2
      ↓
Stored image URL / object key
      ↓
Supabase PostgreSQL
      ↓
Customer App + Customer Website
```

The database should store the media reference/object key and relevant metadata. Upload authorization, tenant isolation, file validation, and any signed upload/download flow must be enforced securely; R2 credentials must never be exposed to the client.

Sensitive backend logic, payment operations, webhooks, notifications, and integrations.

### PostgreSQL RLS

Mandatory tenant isolation and authorization.

---

# 6\. DO NOT USE REDIS INITIALLY

Do not introduce Redis in the MVP.

The architecture should allow Redis to be added later if the platform requires:

- High-volume caching  
- Queues  
- Rate limiting  
- Background processing  
- Advanced performance optimization

Do not add infrastructure that is not currently required.

---

# 7\. MULTI-TENANT ARCHITECTURE

Every restaurant is a tenant.

Create a central `restaurants` table.

Most restaurant-owned entities must contain:

restaurant\_id

Examples:

products.restaurant\_id

categories.restaurant\_id

orders.restaurant\_id

customers.restaurant\_id

coupons.restaurant\_id

delivery\_zones.restaurant\_id

staff.restaurant\_id

Never depend on frontend filtering for tenant isolation.

RLS policies must enforce tenant boundaries.

---

# 8\. DATABASE ARCHITECTURE

Create a normalized PostgreSQL schema.

The schema should include at minimum:

restaurants

restaurant\_settings

restaurant\_branding

restaurant\_features

profiles

restaurant\_users

roles

permissions

role\_permissions

categories

products

product\_variants

modifier\_groups

modifiers

product\_modifier\_groups

orders

order\_items

order\_item\_modifiers

order\_status\_history

customers

customer\_addresses

customer\_favorites

coupons

coupon\_redemptions

offers

delivery\_zones

delivery\_settings

payments

payment\_transactions

payment\_webhooks

payment\_providers

subscriptions

plans

plan\_features

notifications

notification\_campaigns

audit\_logs

platform\_users

platform\_roles

app\_configurations

app\_versions

support\_tickets

feature\_flags

media\_assets

Do not blindly create unnecessary tables.

Normalize the schema where appropriate while keeping queries understandable.

---

# 9\. RESTAURANTS TABLE

The restaurant record should contain information such as:

id

name

slug

description

logo\_url

cover\_image\_url

phone

email

address

latitude

longitude

status

subscription\_id

created\_at

updated\_at

Restaurant status may include:

trial

active

suspended

inactive

Do not delete restaurants permanently by default.

Use soft deletion where appropriate.

---

# 10\. RESTAURANT BRANDING

Each restaurant must have independent branding.

Configuration may include:

logo

cover image

primary color

secondary color

accent color

background color

text color

button style

font configuration

app name

splash configuration

home layout

The Flutter application must load branding dynamically.

Example:

Restaurant A

Primary Color \= Red

Restaurant B

Primary Color \= Green

The same application engine must support both.

---

# 11. CUSTOMER ORDERING WEBSITE

The platform must also include a customer-facing **Restaurant Ordering Website** in addition to the Flutter Customer Mobile Application.

The website is a first-class white-label product and must use the **same restaurant configuration, Supabase backend, PostgreSQL database, business logic, menu data, pricing, offers, coupons, delivery zones, customers, orders, payments, and feature entitlements** as the mobile application.

The website must NOT become a separate data source or a separate restaurant system.

Both channels must operate from the same centralized tenant data:

```
                 RESTAURANT TENANT
                        |
              +---------+---------+
              |                   |
         Customer App       Customer Website
              |                   |
              +---------+---------+
                        |
                 Same Backend
                        |
                 Same Database
                        |
                Restaurant Admin
                        |
                  Unified Orders
```

### Website Requirements

The website should provide the same core ordering experience as the mobile application:

- Restaurant branding
- Restaurant logo and name
- Home page
- Menu
- Categories
- Product details
- Variants
- Modifiers / Add-ons
- Search
- Cart
- Coupons
- Delivery / Pickup
- Addresses
- Checkout
- Online payment where enabled
- Order confirmation
- Order status / tracking where enabled
- Customer account
- Favorites where enabled
- Reorder
- Offers and promotional content

### Website Design

The website must visually follow the same design system as the Customer Mobile Application.

The same restaurant branding configuration should control both channels, including where applicable:

- Primary color
- Secondary color
- Accent color
- Background color
- Text color
- Typography / font configuration
- Logo
- Cover / hero imagery
- Button styles
- Product presentation
- Category presentation
- Promotional banners

The website should feel like the **web version of the restaurant's mobile application**, not like a generic template.

### Shared Menu and Content

Restaurant Admin changes must be reflected across both channels.

For example:

- Changing a product price updates the App and Website.
- Disabling a product removes or disables it in both channels.
- Creating a category makes it available in both channels.
- Updating a product image updates both channels.
- Creating an offer can expose it on both channels when the feature is enabled.

There must be one source of truth for restaurant menu and configuration data.

### Unified Orders

Orders created from the Customer App and Customer Website must enter the same Restaurant Admin Orders system.

Every order should retain its source/channel, for example:

- Mobile App
- Website

The Restaurant Admin should be able to filter and analyze orders by source.

The same order lifecycle, validation, server-side pricing calculation, coupon validation, delivery calculation, payment handling, and Realtime status updates must apply regardless of whether the order originated from the App or Website.

### Website Multi-Tenancy

The website must be tenant-aware and load the correct restaurant configuration dynamically.

The same website codebase should serve multiple restaurants without creating separate codebases for every restaurant.

Example:

```
Restaurant A -> restaurant-a website configuration
Restaurant B -> restaurant-b website configuration
Restaurant C -> restaurant-c website configuration

                 Same Website Engine
                        |
                 Same Backend
                        |
                 Tenant Isolation
```

### Website Feature Control

Website functionality must respect the same platform, plan, and restaurant-level feature flags and entitlements used by the rest of the platform.

A feature enabled for the restaurant should be available on the Website where applicable; a disabled feature must not be exposed through the Website UI or trusted backend paths.

---

# 12. CUSTOMER APP


The Customer App is the end-user mobile application.

Main navigation should include:

Home

Menu

Orders

Favorites

Profile

Use a clean and modern restaurant UX.

---

# 13. CUSTOMER APP — HOME

Home should support:

- Restaurant logo  
- Restaurant name  
- Search  
- Categories  
- Featured products  
- Best sellers  
- Promotional banners  
- Offers  
- Recently ordered  
- Reorder  
- Favorites  
- Cart shortcut  
- Restaurant status  
- Opening hours  
- Delivery information

The home layout should be configurable by the restaurant.

The Master Dashboard should also be able to control feature availability.

---

# 14. CUSTOMER APP — SEARCH

Search must support:

- Product name  
- Category  
- Description where appropriate

Provide:

- Search suggestions  
- Empty state  
- Loading state  
- Error state  
- Recent searches if useful

Search must only return products belonging to the current restaurant.

---

# 14\. CUSTOMER APP — MENU

Menu must support:

- Categories  
- Products  
- Product images  
- Description  
- Price  
- Availability  
- Variants  
- Add-ons  
- Modifiers  
- Special instructions

Example:

Burger

Size:

○ Small

○ Medium

● Large

Extras:

☑ Cheese

☐ Mushroom

☑ Extra Sauce

Special Instructions:

"No onions"

---

# 15\. PRODUCT SYSTEM

Products must support:

name

description

base\_price

image

category

availability

featured

best\_seller

sort\_order

Products may have variants.

Example:

Pizza

Small    100

Medium   140

Large    180

Variants must be configurable.

---

# 16\. MODIFIER / ADD-ON SYSTEM

Support modifier groups.

Examples:

Extras

\- Cheese

\- Mushroom

\- Sauce

Each modifier can have:

name

price

availability

max\_quantity

min\_quantity

Modifier groups can define:

minimum selections

maximum selections

required / optional

---

# 17\. CART

Cart must contain:

- Products  
- Variants  
- Modifiers  
- Quantities  
- Special instructions

Calculate:

Subtotal

Discount

Delivery Fee

Tax

Service Fee

Total

Do not trust client-calculated totals.

The final order total must be validated/recalculated server-side.

---

# 18\. CHECKOUT

Checkout should support:

- Delivery  
- Pickup  
- Address  
- Delivery zone  
- Delivery fee  
- Delivery time  
- Payment method  
- Promo code  
- Order notes  
- Order summary

Before creating an order:

Validate:

- Product availability  
- Prices  
- Modifier prices  
- Coupon validity  
- Delivery zone  
- Minimum order  
- Restaurant operating status  
- Payment method availability

Never trust prices sent by the client.

---

# 19\. ORDERS

Order lifecycle:

Pending

Confirmed

Preparing

Ready

Out for Delivery

Delivered

Cancelled

Rejected

Allow restaurant configuration if needed.

Every status transition should be recorded in:

order\_status\_history

Store:

order\_id

old\_status

new\_status

changed\_by

created\_at

---

# 20\. CUSTOMER ORDER SCREEN

Display:

Order \#1827

✓ Confirmed

✓ Preparing

✓ Ready

● Out for Delivery

○ Delivered

Show:

- Order items  
- Quantity  
- Modifiers  
- Price  
- Delivery address  
- Payment status  
- Total  
- Estimated time  
- Order status

---

# 21\. ORDER HISTORY

Customer can see:

- Current orders  
- Previous orders  
- Order details  
- Reorder

Reorder should recreate the cart from current product configuration.

Do not blindly reuse old prices.

---

# 22\. FAVORITES

Support:

- Favorite products  
- Remove favorite  
- Favorite restaurants if the platform eventually supports discovery

Restaurant-specific favorite products must be isolated by customer and tenant.

---

# 23\. CUSTOMER PROFILE

Support:

- Name  
- Phone  
- Email  
- Profile picture  
- Addresses  
- Orders  
- Favorites  
- Notifications  
- Settings  
- Help

---

# 24\. CUSTOMER ADDRESSES

Support multiple addresses.

Example:

Home

Work

Other

Each address may contain:

label

full\_address

latitude

longitude

building

floor

apartment

delivery\_notes

The restaurant must only receive the address required to fulfill the order.

---

# 25\. DELIVERY TRACKING

Design the architecture so delivery tracking can be added.

If enabled:

Driver location

ETA

Order status

Do not implement unnecessary driver infrastructure in MVP unless explicitly required.

---

# 26\. CUSTOMER NOTIFICATIONS

Support:

- Order confirmed  
- Order preparing  
- Order ready  
- Order out for delivery  
- Order delivered  
- Promotional notifications  
- Offers  
- General announcements

Push notifications should be sent through secure backend logic.

---

# 27\. LOYALTY SYSTEM

The architecture must support loyalty.

Potential features:

Points

Rewards

Vouchers

Points history

Redemption

However, loyalty can be disabled through feature flags.

---

# 28\. RESTAURANT ADMIN DASHBOARD

Restaurant Admin should have navigation:

Dashboard

Orders

Menu

Categories

Products

Modifiers

Offers

Coupons

Customers

Delivery

Payments

Notifications

Reports

Staff

Content

Settings

The exact navigation must respect permissions and feature flags.

---

# 29\. RESTAURANT DASHBOARD — OVERVIEW

Show:

Today's Sales

Today's Orders

Average Order Value

Pending Orders

Cancelled Orders

Charts:

- Sales over time  
- Orders over time  
- Best sellers  
- Payment breakdown  
- Delivery vs pickup

Use tenant-specific data only.

---

# 30\. RESTAURANT ORDERS

Order management should support:

New

Confirmed

Preparing

Ready

Out for Delivery

Completed

Cancelled

Rejected

Restaurant staff should be able to perform actions based on their role.

Example:

Accept

Reject

Prepare

Mark Ready

Complete

Cancel

Every action must be logged.

---

# 31\. KITCHEN VIEW

Prepare the architecture for a Kitchen view.

Kitchen users should see:

- New orders  
- Order items  
- Modifiers  
- Notes  
- Preparation time  
- Status

Kitchen users should not have access to payment settings or platform settings.

---

# 32\. MENU MANAGEMENT

Restaurant can manage:

### Categories

- Add  
- Edit  
- Delete  
- Reorder  
- Hide/show

### Products

- Add  
- Edit  
- Delete  
- Price  
- Description  
- Image  
- Category  
- Availability  
- Featured  
- Best seller  
- Variants  
- Modifiers

---

# 33\. PRODUCT AVAILABILITY

Restaurant can quickly switch:

Available

Out of Stock

Hidden

Customer App must update accordingly.

Realtime can be used where useful.

---

# 34\. CONTENT MANAGEMENT

Restaurant controls:

- Logo  
- Cover image  
- Banners  
- Featured sections  
- Promotional banners  
- Featured products  
- About us  
- Contact information  
- Social links

Home page sections should be configurable.

---

# 35\. OFFERS

Support:

- Percentage discount  
- Fixed discount  
- Product-specific offers  
- Category-specific offers  
- Time-based offers  
- Start/end dates  
- Usage limitations

---

# 36\. COUPONS

Coupon fields may include:

code

discount\_type

discount\_value

minimum\_order

maximum\_discount

start\_at

end\_at

usage\_limit

per\_customer\_limit

active

Support restrictions by:

- Product  
- Category  
- Customer  
- First order  
- Minimum order

Validate coupons server-side.

---

# 37\. DELIVERY MANAGEMENT

Restaurant can configure:

Delivery enabled

Pickup enabled

Minimum order

Estimated delivery time

Delivery zones

Delivery fees

Example:

Zone A → 30 EGP

Zone B → 45 EGP

Zone C → 60 EGP

Delivery zone logic must be secure and validated server-side.

---

# 38\. CUSTOMER MANAGEMENT

Restaurant sees:

- Customers  
- Number of orders  
- Total spending  
- Last order  
- Addresses where operationally necessary  
- Loyalty information if enabled

Do not expose unnecessary private information.

---

# 39\. PAYMENTS

The platform must support multiple payment providers.

Example:

Paymob

Kashier

Other providers

The restaurant selects its provider.

The system must NOT expose secret credentials to the Flutter app or frontend.

Payment operations must use Edge Functions/backend logic.

---

# 40\. PAYMENT CONFIGURATION

Restaurant Admin may see:

Payment Provider

\[ Paymob \]

Connection Status

Connected

\[ Test Connection \]

\[ Save \]

Credentials should be masked.

After saving, do not display raw secrets again.

Never expose provider secrets through public API responses.

---

# 41\. PAYMENT FLOW

Recommended architecture:

Customer App

      ↓

Create Order

      ↓

Backend Validation

      ↓

Supabase Edge Function

      ↓

Payment Provider

      ↓

Payment Result

      ↓

Webhook

      ↓

Supabase

      ↓

Update Payment \+ Order

      ↓

Realtime

      ↓

Customer \+ Restaurant

Never mark an order as paid solely because the client says payment succeeded.

Payment status must be verified using provider confirmation/webhooks.

---

# 42\. PAYMENT STATUSES

Support:

pending

processing

paid

failed

cancelled

refunded

partially\_refunded

Store transaction records.

---

# 43\. STAFF & PERMISSIONS

Restaurant staff roles:

Owner

Manager

Cashier

Kitchen

Delivery

Permissions should be granular.

Example:

Manager:

Orders ✓

Menu ✓

Reports ✓

Customers ✓

Staff ✓

Payments settings ✕

Platform settings ✕

Cashier:

Orders ✓

Customers ✓

Payments view ✓

Payment configuration ✕

Staff ✕

App settings ✕

Kitchen:

Orders ✓

Kitchen ✓

Menu view ✓

Payments ✕

Customers ✕

Staff ✕

Do not implement authorization only in React.

Use backend authorization and RLS.

---

# 44\. REPORTS

Restaurant reports:

- Daily sales  
- Weekly sales  
- Monthly sales  
- Orders  
- Average order value  
- Best sellers  
- Cancelled orders  
- Discounts  
- Payment methods  
- Delivery vs pickup

Reports must be tenant-isolated.

---

# 45\. RESTAURANT NOTIFICATIONS

Restaurant can create campaigns.

Audience:

All Customers

Specific Segment

Examples:

20% discount today

New menu item

Special weekend offer

Notification sending should be controlled through backend functions.

Avoid allowing arbitrary clients to send unlimited notifications.

---

# 46\. RESTAURANT SETTINGS

Settings include:

### Restaurant

- Name  
- Address  
- Phone  
- Email  
- Opening hours

### Delivery

- Delivery enabled  
- Pickup enabled  
- Zones  
- Fees  
- Minimum order

### App

- Logo  
- Colors  
- Home configuration  
- Features

### Payments

- Provider  
- Connection status  
- Configuration

### Notifications

- Enabled/disabled

### Account

- Profile  
- Password  
- Staff

---

# 47\. MASTER DASHBOARD

Master Dashboard navigation:

Overview

Restaurants

Create Restaurant

Subscriptions

Plans

Payments

Analytics

Feature Flags

App Management

Platform Users

Notifications

Support

Audit Logs

System Health

Settings

---

# 48\. MASTER OVERVIEW

Display:

Total Restaurants

Active Restaurants

Suspended Restaurants

Trial Restaurants

Orders Today

Platform GMV

Platform Revenue

Active Apps

Charts:

- Restaurant growth  
- Order growth  
- Revenue growth  
- Top restaurants  
- Payment success rate

---

# 49\. RESTAURANT MANAGEMENT

Master Admin can view:

Restaurant name

Status

Subscription

Plan

Orders

Revenue

App version

Last activity

Payment provider

Admin users

Issues

Clicking a restaurant opens its details.

---

# 50\. CREATE RESTAURANT

Master Admin can create:

Restaurant Name

Slug

Logo

Brand Colors

Admin Email

Plan

Subscription

Payment Provider

Creating a tenant should initialize:

Restaurant

Restaurant Settings

Branding

Admin relationship

Feature configuration

Subscription

App configuration

Do not create separate databases for every restaurant unless there is a future enterprise requirement.

Use tenant isolation inside the central PostgreSQL database.

---

\# 51\. RESTAURANT STATUS & TENANT LIFECYCLE CONTROL

The platform must implement a complete tenant lifecycle and subscription enforcement system.

The Master Dashboard must be able to control the lifecycle of every restaurant.

Supported tenant states may include:

trial  
active  
past\_due  
suspended  
inactive  
cancelled  
expired

The tenant status must NOT be controlled only by frontend UI.

The backend/database authorization layer must enforce whether a tenant is allowed to use the platform.

A suspended or expired restaurant must not be able to bypass the restriction by modifying the Flutter or React client.

The platform must distinguish between:

\- Tenant status  
\- Subscription status  
\- Payment status  
\- System health status

These are separate concepts.

Example:

Tenant:  
ACTIVE

Subscription:  
EXPIRED

Payment Provider:  
CONNECTED

Database:  
HEALTHY

The restaurant may still be blocked because its subscription has expired.

Master Admin can:

Activate  
Suspend  
Deactivate  
Reactivate  
Extend Trial  
Extend Subscription  
Change Plan  
Cancel Subscription

Suspending a restaurant must NOT delete its data.

Historical orders, customers, products, transactions, audit logs, and financial records must remain preserved.

Use soft deletion where appropriate.

---

# 52\. SUBSCRIPTIONS

Plans:

Basic

Pro

Premium

Example:

### Basic

- App  
- Ordering  
- Online Payment  
- Coupons

### Pro

Everything in Basic plus:

- Loyalty  
- Advanced Analytics

### Premium

Everything in Pro plus:

- Delivery Tracking  
- Advanced features

The system must be configurable rather than hardcoding these exact plans.

---

\# 52A. SUBSCRIPTION & LICENSE ENFORCEMENT

The platform must implement a real SaaS subscription enforcement system.

This system is mandatory and must be implemented at both:

1\. Frontend level  
2\. Backend/database authorization level

Frontend restrictions are for user experience.

Backend/database restrictions are for actual security and enforcement.

Never rely only on frontend checks.

\---

\# 52B. SUBSCRIPTION LIFECYCLE

A restaurant subscription can move through:

trial  
active  
past\_due  
expired  
suspended  
cancelled

Example lifecycle:

Trial  
   ↓  
Active  
   ↓  
Payment Due  
   ↓  
Past Due  
   ↓  
Grace Period  
   ↓  
Expired  
   ↓  
Suspended

A subscription may also return to:

Suspended  
   ↓  
Payment Completed  
   ↓  
Active

\---

\# 52C. SUBSCRIPTION DATA

The subscription model should support at minimum:

restaurant\_id  
plan\_id  
status  
start\_date  
end\_date  
trial\_start\_date  
trial\_end\_date  
grace\_period\_until  
auto\_renew  
payment\_status  
suspended\_at  
suspension\_reason  
cancelled\_at  
created\_at  
updated\_at

The exact schema may be adjusted according to the final database design.

\---

\# 52D. GRACE PERIOD

The platform must support a configurable grace period after subscription expiration or failed payment.

Example:

Subscription expires:

01 September

Grace period:

7 days

Restaurant remains operational until:

08 September

After the grace period ends:

Tenant becomes suspended.

The grace period should be configurable by the platform owner.

Do not hardcode the grace period into frontend code.

\---

\# 52E. AUTOMATIC SUBSCRIPTION ENFORCEMENT

The platform must automatically evaluate subscriptions.

A scheduled backend process should periodically check:

\- Subscription expiration  
\- Trial expiration  
\- Grace period expiration  
\- Payment status  
\- Suspension status

Example:

Every hour/day:

Check subscriptions  
      ↓  
Is subscription expired?  
      ↓  
YES  
      ↓  
Is grace period still active?  
      ↓  
YES → Keep active / show warning  
      ↓  
NO  
      ↓  
Suspend tenant

This process must run server-side.

Do not depend on the restaurant admin opening the dashboard for subscription enforcement to happen.

\---

\# 52F. SUBSCRIPTION WARNINGS

Before expiration, the Restaurant Admin should receive warnings.

Example:

7 days remaining:

"Your subscription expires in 7 days."

3 days remaining:

"Your subscription expires in 3 days."

1 day remaining:

"Your subscription expires tomorrow."

Past due:

"Your subscription payment is overdue."

During grace period:

"Your subscription has expired. Please renew before your account is suspended."

These notifications may appear through:

\- Dashboard banners  
\- In-app notifications  
\- Push notifications  
\- Email where configured

The exact notification channels should be configurable.

\---

\# 52G. SUSPENDED TENANT BEHAVIOR

When a restaurant is suspended because of:

\- Expired subscription  
\- Failed payment  
\- Manual Master Admin suspension  
\- Terms violation  
\- Administrative action  
\- Other configured reason

the platform must prevent normal tenant usage.

The exact restrictions should be centrally defined.

At minimum, a suspended restaurant should not be able to:

\- Access normal Restaurant Admin functionality  
\- Create new orders  
\- Modify menu  
\- Modify restaurant settings  
\- Send promotional campaigns  
\- Configure payment providers  
\- Manage staff  
\- Use premium platform features

The Customer App should also reflect the suspended state.

Instead of displaying the normal restaurant interface, it may show a controlled maintenance/suspension screen such as:

"Restaurant temporarily unavailable."

The suspension message must not expose sensitive internal information.

\---

\# 52H. BACKEND ENFORCEMENT

Tenant suspension MUST be enforced outside the frontend.

The system must validate tenant status before allowing protected operations.

Conceptually:

Authenticated User  
      ↓  
Identify User  
      ↓  
Identify Restaurant  
      ↓  
Check Tenant Authorization  
      ↓  
Check Tenant Status  
      ↓  
Check Subscription  
      ↓  
Allow / Reject Operation

A restaurant user must not be able to bypass suspension by:

\- Modifying Flutter code  
\- Modifying React code  
\- Calling Supabase APIs directly  
\- Manipulating request payloads  
\- Changing restaurant\_id  
\- Changing subscription fields from the client

Tenant status and subscription status must only be changed by authorized backend/platform operations.

\---

\# 52I. RLS \+ TENANT STATUS

RLS policies must take tenant authorization and tenant status into consideration where appropriate.

Restaurant users must only access records belonging to their authorized restaurant.

A suspended tenant must not regain access simply because the user is authenticated.

Conceptually:

User authenticated  
AND  
User belongs to tenant  
AND  
Tenant is allowed to operate  
      ↓  
Access allowed

Otherwise:

Access denied

The exact RLS implementation must be designed carefully so that:

\- Restaurant users cannot modify their own subscription status  
\- Restaurant users cannot change their tenant status  
\- Restaurant users cannot assign themselves platform roles  
\- Restaurant users cannot access another tenant  
\- Suspended tenants cannot perform protected operations

Platform-level administrators must retain authorized access to suspended tenant data for administration, support, finance, and auditing.

\---

\# 52J. PLATFORM ADMIN OVERRIDE

Master Dashboard users with appropriate permissions must still be able to access suspended restaurants for administrative purposes.

Example:

Restaurant:

SUSPENDED

Restaurant Admin:

BLOCKED

Customer Ordering:

BLOCKED

Master Admin:

ALLOWED

Support:

ALLOWED if authorized

Finance:

ALLOWED if authorized

Developer:

ALLOWED only for permitted technical information

This distinction is mandatory.

Suspension must block the tenant's operational access, not erase or hide the tenant from the platform owner.

\---

\# 52K. SUSPENSION REASONS

Every suspension should have a reason.

Examples:

subscription\_expired  
payment\_failed  
manual\_admin\_action  
terms\_violation  
security\_issue  
restaurant\_requested  
other

Store:

suspension\_reason  
suspended\_at  
suspended\_by

Where appropriate.

\---

\# 52L. MANUAL SUSPENSION

Master Admin can manually suspend a restaurant.

Example:

Restaurant Details:

Status: ACTIVE

\[ Suspend Restaurant \]

Before suspension, require confirmation.

Optional suspension reason:

"Subscription overdue"

or:

"Administrative suspension"

The action must create an audit log.

Example:

Super Admin  
Action: SUSPEND\_TENANT  
Tenant: Karam El Sham  
Reason: Subscription expired  
Timestamp: 10 Aug 2026 19:42

\---

\# 52M. REACTIVATION

Master Admin must be able to reactivate a suspended restaurant.

Example:

Restaurant:

Status: SUSPENDED

\[ Reactivate \]

Before reactivation, validate:

\- Subscription status  
\- Payment status if required  
\- Administrative restrictions  
\- Required configuration

Then:

SUSPENDED  
    ↓  
ACTIVE

The reactivation must be recorded in audit logs.

\---

\# 52N. EXTEND SUBSCRIPTION

Master Admin must be able to extend a restaurant subscription.

Example:

Current expiry:

01 Sep 2026

Admin action:

\[ Extend Subscription \]

Options:

7 days  
30 days  
90 days  
Custom

The backend updates the subscription securely.

The restaurant must not be able to perform this operation through its own client.

\---

\# 52O. TRIAL MANAGEMENT

The platform must support trials.

Master Admin can configure:

\- Trial duration  
\- Trial start date  
\- Trial end date  
\- Features available during trial

Example:

Restaurant created:

01 Aug

Trial:

14 days

Trial expires:

15 Aug

Then:

Trial  
   ↓  
Subscription required  
   ↓  
Grace period if configured  
   ↓  
Suspension

\---

\# 52P. PLAN CHANGES

Master Admin can change a restaurant's plan.

Example:

BASIC  
   ↓  
PRO

or:

PRO  
   ↓  
PREMIUM

Changing a plan must automatically update feature entitlements according to the platform's feature configuration.

Do not hardcode plan logic separately inside every application.

The effective feature set should be resolved centrally.

\---

\# 52Q. FEATURE ACCESS DURING SUSPENSION

The platform must distinguish between:

Tenant suspension  
and  
Individual feature disabling.

Example:

Tenant:

ACTIVE

Loyalty:

OFF

Coupons:

ON

Online Payments:

ON

This is different from:

Tenant:

SUSPENDED

All operational tenant functionality:

BLOCKED

Do not confuse feature flags with subscription enforcement.

\---

\# 52R. CUSTOMER APP SUSPENSION BEHAVIOR

When a restaurant is suspended, the Customer App must not continue behaving as though the restaurant is operational.

The app should retrieve the current tenant status from the backend.

If:

tenant.status \= suspended

show an appropriate unavailable state.

Example:

Restaurant Temporarily Unavailable

"This restaurant is currently unavailable."

Do not expose:

\- Internal suspension reason  
\- Payment details  
\- Admin information  
\- Private platform information

The Customer App should not rely solely on cached tenant status.

Refresh the status when appropriate.

\---

\# 52S. RESTAURANT ADMIN SUSPENSION SCREEN

When a restaurant admin attempts to access the dashboard while suspended, display a dedicated restricted-access screen.

Example:

Restaurant Suspended

Your restaurant account is currently unavailable.

Reason:  
Subscription expired.

Subscription:  
Expired

\[ Contact Support \]

If the platform supports online subscription renewal:

\[ Renew Subscription \]

Do not allow the restaurant admin to navigate around the restriction using direct URLs.

Backend authorization must still block protected API operations.

\---

\# 52T. SUBSCRIPTION DASHBOARD

Restaurant Admin should be able to see their own subscription information.

Example:

Plan:  
PRO

Status:  
ACTIVE

Start Date:  
01 Aug 2026

Renewal Date:  
01 Sep 2026

Days Remaining:  
21

Features:

Ordering ✓  
Online Payments ✓  
Coupons ✓  
Loyalty ✓  
Advanced Analytics ✓

The restaurant must not be able to edit subscription status.

\---

\# 52U. MASTER SUBSCRIPTION MANAGEMENT

Master Dashboard must include a dedicated subscription management area.

Show:

Restaurant  
Plan  
Status  
Start Date  
Expiration Date  
Days Remaining  
Payment Status  
Auto Renew  
Grace Period  
Suspension Status

Filters:

\- Active  
\- Trial  
\- Past Due  
\- Expired  
\- Suspended  
\- Cancelled

Actions:

\- Extend  
\- Change Plan  
\- Suspend  
\- Reactivate  
\- Cancel  
\- View History

\---

\# 52V. SUBSCRIPTION HISTORY

Keep a history of important subscription events.

Examples:

Subscription created  
Plan changed  
Trial extended  
Subscription extended  
Payment failed  
Subscription expired  
Tenant suspended  
Tenant reactivated

Store appropriate event information.

This history must be visible to authorized Master Dashboard users.

\---

\# 52W. AUTOMATIC SUSPENSION SAFETY

Automatic suspension must be designed carefully.

Before automatically suspending:

1\. Verify subscription state.  
2\. Verify expiration date.  
3\. Verify grace period.  
4\. Verify payment state where applicable.  
5\. Verify that the subscription was not manually extended.  
6\. Verify that the tenant is not already suspended.  
7\. Record the reason.  
8\. Create an audit event.  
9\. Update tenant access state.

Do not suspend a restaurant based on stale frontend information.

\---

\# 52X. SUBSCRIPTION STATE MACHINE

Implement subscription transitions consistently.

Example:

TRIAL  
 ↓  
ACTIVE  
 ↓  
PAST\_DUE  
 ↓  
EXPIRED  
 ↓  
SUSPENDED

Possible recovery:

PAST\_DUE  
 ↓  
PAYMENT\_SUCCESS  
 ↓  
ACTIVE

SUSPENDED  
 ↓  
SUBSCRIPTION\_RENEWED  
 ↓  
ACTIVE

The allowed transitions should be controlled by backend logic.

Do not allow arbitrary clients to change subscription states.

\---

\# 52Y. SUBSCRIPTION SECURITY

NEVER allow a Restaurant Admin to directly modify:

\- subscription status  
\- plan ownership  
\- expiration date  
\- trial expiration  
\- grace period  
\- suspension state  
\- payment verification status

These operations must require authorized platform/backend permissions.

\---

\# 52Z. SUBSCRIPTION \+ PAYMENT PROVIDER

Subscription billing for the SaaS platform must be kept conceptually separate from restaurant customer order payments.

There are two different payment concepts:

1\. Restaurant customer's order payment

Example:

Customer → Restaurant

2\. Restaurant's SaaS subscription payment

Example:

Restaurant → Platform Owner

Do NOT mix these payment flows.

Restaurant customer payments use the restaurant's configured payment provider.

Platform subscription payments should use the platform's own subscription billing architecture.

The platform owner must never depend on the restaurant's Paymob/Kashier credentials to collect SaaS subscription fees.

\---

\# 52AA. SUBSCRIPTION BILLING ARCHITECTURE

The platform should support:

\- Subscription invoices  
\- Payment attempts  
\- Successful payments  
\- Failed payments  
\- Renewal dates  
\- Payment history  
\- Subscription status

The implementation may initially support manual subscription management from the Master Dashboard.

Automated recurring billing can be added later.

Do not pretend recurring billing exists unless it is actually implemented.

\---

\# 52AB. MASTER DASHBOARD — TENANT HEALTH \+ SUBSCRIPTION

The Restaurant Details page must combine operational health and subscription information.

Example:

KARAM EL SHAM

Tenant Status:  
🟢 ACTIVE

Subscription:  
🟢 ACTIVE

Plan:  
PRO

Expires:  
01 Sep 2026

Days Remaining:  
21

────────────────────────

System Health

API:  
🟢 Connected

Database:  
🟢 Connected

Storage:  
🟢 Connected

Realtime:  
🟢 Connected

Notifications:  
🟢 Connected

Payment Provider:  
🟢 Connected

────────────────────────

Actions:

\[ Extend Subscription \]  
\[ Change Plan \]  
\[ Suspend Restaurant \]  
\[ Reactivate \]  
\[ View Audit Logs \]

\---

\# 52AC. EXAMPLE — EXPIRED RESTAURANT

Example:

WAHMY

Tenant Status:  
🔴 SUSPENDED

Subscription:  
🔴 EXPIRED

Plan:  
PRO

Expired:  
08 Sep 2026

Grace Period:  
Ended

Suspension Reason:  
Subscription expired

────────────────────────

System Health

API:  
🟢 Connected

Database:  
🟢 Connected

Storage:  
🟢 Connected

Realtime:  
🟢 Connected

Notifications:  
🟢 Connected

Payment Provider:  
🟡 Not Connected

────────────────────────

Actions:

\[ Reactivate \]  
\[ Extend Subscription \]  
\[ Change Plan \]  
\[ View Audit Logs \]

This allows the Master Admin to immediately understand whether the restaurant is suspended because of subscription enforcement or because of a technical problem.

\---

\# 52AD. SYSTEM HEALTH VS TENANT STATUS

These values must remain separate.

Example:

Tenant:

SUSPENDED

Database:

CONNECTED

API:

CONNECTED

Storage:

CONNECTED

Payment Provider:

CONNECTED

Subscription:

EXPIRED

This means:

"The platform is healthy, but the tenant is suspended."

Another example:

Tenant:

ACTIVE

Database:

CONNECTED

Payment Provider:

NOT\_CONNECTED

This means:

"The tenant is active, but payment configuration is currently unavailable."

Do not represent tenant suspension as a fake system outage.

\---

\# 52AE. AUDIT LOG REQUIREMENTS

Subscription and tenant lifecycle events must create audit logs.

At minimum:

\- Tenant created  
\- Trial started  
\- Subscription activated  
\- Subscription renewed  
\- Subscription extended  
\- Plan changed  
\- Payment failed  
\- Subscription became past\_due  
\- Subscription expired  
\- Tenant automatically suspended  
\- Tenant manually suspended  
\- Tenant reactivated  
\- Subscription cancelled

Each event should record:

actor  
actor\_type  
tenant\_id  
action  
reason  
timestamp  
relevant metadata

Automatic actions should be clearly identified as system-generated.

Example:

Actor:  
SYSTEM

Action:  
AUTO\_SUSPEND\_TENANT

Reason:  
Subscription expired and grace period ended

\---

\# 52AF. NO DATA DELETION ON SUSPENSION

Suspending or expiring a tenant must NOT:

\- Delete restaurant data  
\- Delete orders  
\- Delete customers  
\- Delete products  
\- Delete payment transaction history  
\- Delete audit logs  
\- Delete branding  
\- Delete uploaded assets

Suspension is an access-control state, not a data-deletion operation.

\---

\# 52AG. RECOVERY AFTER PAYMENT

When a suspended restaurant successfully renews its subscription:

1\. Verify payment server-side.  
2\. Update subscription.  
3\. Update subscription status.  
4\. Reactivate tenant if no other suspension reason exists.  
5\. Record audit event.  
6\. Notify restaurant.  
7\. Restore normal tenant access.

Example:

Payment Verified  
      ↓  
Subscription ACTIVE  
      ↓  
Tenant ACTIVE  
      ↓  
Restaurant access restored

Do not reactivate solely based on a client-side success screen.

\---

\# 52AH. MULTIPLE SUSPENSION REASONS

The architecture should support multiple administrative restrictions without losing the original reason.

For example:

Subscription expired  
AND  
Manual administrative suspension

Renewing the subscription should not automatically remove a separate administrative suspension.

Therefore, consider representing suspension/restriction reasons separately rather than relying on a single boolean.

The final implementation should prevent accidental reactivation when another valid blocking condition still exists.

\---

\# 52AI. BLOCKING CONDITIONS

The effective tenant access state should be derived from relevant conditions.

Conceptually:

Tenant Active  
AND  
Subscription Valid  
AND  
No Administrative Suspension  
AND  
No Security Suspension  
      ↓  
Operational Access Allowed

Otherwise:

Operational Access Blocked

The exact implementation may use a centralized tenant access resolver/service rather than duplicating this logic across applications.

\---

\# 52AJ. CENTRALIZED ACCESS RESOLUTION

Create one authoritative backend mechanism responsible for determining whether a tenant can operate.

Conceptually:

getTenantAccessState(tenant\_id)

returns information such as:

\# 52AK. TENANT ACCESS STATE MODEL

The centralized tenant access resolver must return a deterministic access state.

Conceptually:

getTenantAccessState(tenant\_id)

may return:

{  
  tenant\_status,  
  subscription\_status,  
  payment\_status,  
  administrative\_suspension,  
  security\_suspension,  
  trial\_active,  
  grace\_period\_active,  
  operational\_access,  
  customer\_ordering\_enabled,  
  restaurant\_admin\_enabled,  
  reason,  
  reason\_code  
}

The resolver must be the authoritative source for tenant operational access.

Example:

{  
  tenant\_status: "active",  
  subscription\_status: "active",  
  operational\_access: true,  
  customer\_ordering\_enabled: true,  
  restaurant\_admin\_enabled: true  
}

Example:

{  
  tenant\_status: "active",  
  subscription\_status: "expired",  
  grace\_period\_active: false,  
  operational\_access: false,  
  customer\_ordering\_enabled: false,  
  restaurant\_admin\_enabled: false,  
  reason\_code: "subscription\_expired"  
}

Example:

{  
  tenant\_status: "suspended",  
  subscription\_status: "active",  
  administrative\_suspension: true,  
  operational\_access: false,  
  customer\_ordering\_enabled: false,  
  restaurant\_admin\_enabled: false,  
  reason\_code: "manual\_admin\_action"  
}

The resolver must evaluate all relevant blocking conditions.

A subscription renewal must NOT automatically remove an independent administrative or security suspension.

Only the condition that has been resolved may be cleared.

The access resolver must run server-side and must not trust client-provided tenant status, subscription status, plan, payment status, or feature flags.

\# 52AL. AUTHORIZATION FUNCTION DESIGN

Create centralized PostgreSQL/RLS authorization helpers where appropriate.

Examples may include:

is\_platform\_user()

is\_platform\_admin()

is\_restaurant\_member(restaurant\_id)

has\_restaurant\_permission(restaurant\_id, permission)

is\_tenant\_operational(restaurant\_id)

get\_tenant\_access\_state(restaurant\_id)

These functions must be designed to avoid recursive RLS evaluation and must use secure, well-defined authorization logic.

Do not duplicate complex tenant authorization conditions independently across dozens of RLS policies if a centralized secure helper can be used.

However, do not bypass RLS.

RLS remains the final database-level security boundary.

# 53\. FEATURE FLAGS

Feature flags are mandatory.

Example:

Restaurant A

Ordering           ON

Online Payment     ON

Loyalty            OFF

Coupons            ON

Delivery Tracking  ON

Feature flags may exist at:

Platform level

Plan level

Restaurant level

Restaurant-specific overrides must be supported.

---

# 54\. APP MANAGEMENT

Master Dashboard should show:

Android version

iOS version

Current version

Minimum supported version

Last update

Status

Architecture should support:

Minimum supported version

Recommended version

Force update

Maintenance mode

Do not pretend to automatically publish mobile applications unless deployment infrastructure is actually implemented.

---

# 55\. GLOBAL NOTIFICATIONS

Master Admin can notify:

All Restaurants

Specific Restaurant

Specific Plan

Examples:

Platform update available.

Payment provider issue.

Scheduled maintenance.

New feature available.

---

# 56\. PLATFORM USERS

Platform-level roles:

Super Admin

Support

Finance

Developer

Sales

Each role must have different permissions.

For example:

Finance:

- Revenue  
- Payments  
- Subscriptions

Support:

- Restaurants  
- Health  
- Tickets

Developer:

- System health  
- Logs  
- Technical information

Do not give every platform user Super Admin permissions.

---

# 57\. PLATFORM ANALYTICS

Master Dashboard analytics:

Total GMV

Platform Revenue

Orders

Revenue per restaurant

Top restaurants

Growth

Average order

Payment success rate

Subscription revenue

Active tenants

Churn

Analytics must be based on real database data.

Do not generate fake metrics.

---

# 58\. PAYMENT PROVIDER MONITORING

Master Dashboard should show:

Restaurant

Provider

Connection status

Payment health

Last successful transaction

Never expose:

API secrets

Private keys

Passwords

Sensitive credentials

---

# 59\. SYSTEM HEALTH

Show:

API

Database

Payments

Notifications

Realtime

Storage

Example:

Restaurant: Karam

API ✓

Database ✓

Payments ✓

Notifications ✓

System health must represent real checks.

Do not hardcode fake green indicators.

---

# 60\. SUPPORT SYSTEM

Prepare support infrastructure.

Support tickets may contain:

restaurant\_id

created\_by

category

priority

status

subject

description

created\_at

updated\_at

Statuses:

Open

In Progress

Waiting

Resolved

Closed

---

# 61\. AUDIT LOGS

Audit logs are mandatory.

Record:

who

what

when

where

tenant

old value

new value

Examples:

Super Admin

Suspended Restaurant

Restaurant: Wahmy

10 Aug 19:42

Or:

Restaurant Manager

Changed Product Price

Burger

150 → 180 EGP

Audit logs should not be editable by ordinary users.

---

# 62\. SECURITY REQUIREMENTS

Security is a first-class requirement.

Implement:

- RLS  
- Role-based access control  
- Tenant isolation  
- Secure sessions  
- Server-side validation  
- Input validation  
- Rate limiting where appropriate  
- Secure payment handling  
- Secret management  
- Audit logging  
- Least privilege

Never trust:

- Client prices  
- Client roles  
- Client restaurant IDs  
- Client payment status  
- Client permissions

---

# 63\. RLS REQUIREMENT

Every tenant-owned table must have appropriate RLS.

Conceptually:

restaurant\_id \= current user's allowed restaurant

A restaurant admin must never be able to:

SELECT another restaurant's orders

UPDATE another restaurant's products

DELETE another restaurant's coupons

READ another restaurant's customers

The Master Dashboard requires separate platform-level authorization.

Do not bypass RLS from client applications.

Use secure server-side mechanisms for platform operations where necessary.

---

# 64\. AUTHENTICATION

Support:

### Customer

- Email/password  
- Phone if required later  
- Social login if required later

### Restaurant Staff

- Email/password  
- Secure session management

### Platform Admin

- Email/password  
- Strong authentication  
- MFA should be supported/planned for privileged users

Do not store passwords manually.

Use Supabase Auth.

---

# 65\. STORAGE

Create organized storage buckets/folders.

Example:

restaurant-assets

│

├── restaurants/{restaurantId}/logo

├── restaurants/{restaurantId}/branding

├── restaurants/{restaurantId}/banners

├── restaurants/{restaurantId}/products

└── restaurants/{restaurantId}/offers

Storage access must respect tenant boundaries.

---

# 66\. REALTIME

Use Supabase Realtime for:

- New orders  
- Order status changes  
- Product availability  
- Important dashboard updates

Do not subscribe to every table unnecessarily.

Optimize subscriptions.

---

# 67\. EDGE FUNCTIONS

Create Edge Functions only where server-side execution is required.

Potential functions:

create-payment

verify-payment

payment-webhook

refund-payment

send-notification

create-restaurant

suspend-restaurant

validate-coupon

calculate-order

Names may be adjusted based on implementation.

---

# 68\. ORDER SECURITY

When creating an order:

Client sends:

product IDs

variant IDs

modifier IDs

quantities

coupon code

address

delivery/pickup

Backend retrieves the real values from PostgreSQL.

Backend calculates:

product prices

modifier prices

subtotal

discount

delivery fee

tax

service fee

total

Then creates the order.

Never trust:

client\_total

client\_price

client\_discount

client\_delivery\_fee

---

# 69\. DATABASE TRANSACTIONS

Use database transactions for critical operations.

Especially:

- Order creation  
- Payment state transitions  
- Coupon redemption  
- Inventory/availability-sensitive operations  
- Refunds  
- Subscription state changes

Avoid partial database states.

---

# 70\. INVENTORY / AVAILABILITY

MVP should primarily support product availability.

Example:

Available

Out of stock

Hidden

Design the schema so real inventory can be added later.

Do not build a complex inventory management system unless required.

---

# 71\. WHITE-LABEL STRATEGY

The core Flutter app must be reusable.

Restaurant-specific configuration should come from backend:

restaurant

branding

features

home configuration

payment availability

delivery settings

menu

The app should identify the current restaurant using a secure mechanism such as:

tenant identifier

slug

deep link

configuration

Do not hardcode restaurant information into the Flutter source code.

---

# 72\. RESTAURANT APP CONFIGURATION

Each tenant can have:

app\_name

logo

colors

splash

home\_sections

enabled\_features

support\_phone

support\_email

social\_links

The customer app renders based on configuration.

---

# 73\. MULTI-RESTAURANT FUTURE

The architecture should make it possible later to support:

One customer

   ↓

Multiple restaurants

But do not complicate the MVP with unnecessary marketplace/discovery functionality.

Build the data model so it can evolve.

---

# 74\. UI / UX REQUIREMENTS

All interfaces must support:

Loading states

Empty states

Error states

Success states

Skeleton loaders where appropriate

Confirmation dialogs

Validation errors

Network errors

Permission errors

Do not leave blank screens.

Use meaningful error messages.

---

# 75\. RESPONSIVE DESIGN

Restaurant and Master Dashboards must work on:

- Desktop  
- Laptop  
- Tablet

Customer App must be optimized for:

- Android phones  
- iPhones

Do not design desktop dashboard components assuming a fixed screen width.

---

# 76\. PERFORMANCE

Avoid:

- Unnecessary database queries  
- N+1 queries  
- Huge realtime subscriptions  
- Loading all products at once  
- Loading unnecessary customer data  
- Rebuilding entire Flutter screens unnecessarily

Use:

- Pagination  
- Lazy loading  
- Caching where appropriate  
- Optimized queries  
- Proper indexes

---

# 77\. DATABASE INDEXING

Add indexes for frequently queried fields such as:

restaurant\_id

created\_at

status

category\_id

product\_id

order\_id

customer\_id

subscription\_id

Do not blindly index every column.

Use indexes based on actual query patterns.

---

# 78\. SOFT DELETE

Where appropriate, use:

deleted\_at

instead of destructive deletion.

Especially for:

- Restaurants  
- Products  
- Categories  
- Orders  
- Financial records

Historical financial/order data should not disappear accidentally.

---

# 79\. DATA INTEGRITY

Use:

- Foreign keys  
- Unique constraints  
- Check constraints  
- Not-null constraints where appropriate  
- Proper enum/status handling

Do not rely only on frontend validation.

---

# 80\. ERROR HANDLING

Every application must handle:

Network error

Authentication error

Authorization error

Database error

Validation error

Payment error

Timeout

Realtime disconnection

Storage upload failure

Show user-friendly messages.

Technical details should be logged securely, not exposed to users.

---

# 81\. LOGGING

Implement structured logging for important backend operations.

Never log:

passwords

API secrets

private keys

payment secrets

tokens

---

# 82\. ENVIRONMENT VARIABLES

Separate:

Development

Staging

Production

Never commit secrets to Git.

Use environment variables/secrets for:

- Supabase keys  
- Payment provider secrets  
- API credentials  
- Notification credentials  
- Deployment credentials

Public Supabase client configuration must still be protected by RLS; never treat a public client key as a secret.

---

# 83\. DEVELOPMENT ENVIRONMENT

Provide clear setup instructions.

Required:

Flutter

Dart

Node.js

npm/pnpm

Supabase CLI if required

Git

The project must have clear environment setup documentation.

---

# 84\. PROJECT STRUCTURE

Use maintainable project structures.

Flutter:

lib/

├── core/

├── config/

├── features/

│   ├── auth/

│   ├── home/

│   ├── menu/

│   ├── cart/

│   ├── checkout/

│   ├── orders/

│   ├── favorites/

│   ├── profile/

│   └── notifications/

├── services/

└── main.dart

Restaurant Admin:

src/

├── components/

├── layouts/

├── pages/

├── features/

├── services/

├── hooks/

├── lib/

├── types/

└── routes/

Master Dashboard should use a similar modular architecture.

Do not create giant files.

---

# 85\. CODE QUALITY

Follow:

- Clean code  
- SOLID principles where appropriate  
- Separation of concerns  
- Reusable components  
- Typed models  
- Strong error handling  
- Consistent naming  
- No duplicated business logic

Do not create temporary hacks that become permanent architecture.

---

# 86\. API / DATA ACCESS

Centralize database access.

Do not scatter raw Supabase queries throughout every UI component.

Create appropriate services/repositories/hooks.

Business logic should not live entirely inside UI components.

---

# 87\. TYPES

Use strongly typed models for:

Restaurant

Product

Category

Modifier

Order

OrderItem

Customer

Coupon

Payment

Subscription

FeatureFlag

Notification

Staff

Avoid excessive use of:

dynamic

any

---

# 88\. TESTING

Implement testing progressively.

At minimum:

### Flutter

- Unit tests  
- Widget tests  
- Critical flow tests

### React

- Component tests where useful  
- Form validation tests  
- Critical business logic tests

### Backend

Test:

- RLS  
- Order creation  
- Coupon validation  
- Payment verification  
- Tenant isolation

Security tests must explicitly verify that Tenant A cannot access Tenant B.

---

# 89\. CRITICAL TEST CASE

Create at least two restaurants:

Restaurant A

Restaurant B

Create users for both.

Verify:

Restaurant A admin

cannot:

read B products

read B orders

update B products

read B customers

read B payments

Then verify Master Admin can access both according to its privileges.

This test is mandatory.

---

# 90\. MVP IMPLEMENTATION ORDER

Do NOT implement everything randomly.

Implement in phases.

## Phase 1 — Foundation

Build:

- Supabase project  
- PostgreSQL schema  
- Auth  
- Profiles  
- Restaurants  
- Roles  
- RLS  
- Storage  
- Basic tenant isolation

Do not continue until tenant isolation works.

---

# 91\. PHASE 2 — RESTAURANT CORE

Build:

- Categories  
- Products  
- Variants  
- Modifiers  
- Branding  
- Restaurant settings

Then connect the Restaurant Admin.

---

# 92\. PHASE 3 — CUSTOMER APP

Build:

- Authentication  
- Restaurant configuration  
- Home  
- Menu  
- Product details  
- Cart  
- Checkout  
- Orders  
- Profile

---

# 93\. PHASE 4 — ORDER ENGINE

Implement:

- Order creation  
- Server-side calculation  
- Status lifecycle  
- Order history  
- Realtime  
- Restaurant order dashboard

This is one of the most critical phases.

---

# 94\. PHASE 5 — PAYMENTS

Implement:

- Payment provider abstraction  
- Paymob integration  
- Payment transactions  
- Webhooks  
- Payment verification  
- Failed payments  
- Refund architecture

Then add other providers through the same abstraction.

Do not tightly couple the entire system to one payment provider.

---

# 95\. PHASE 6 — RESTAURANT FEATURES

Implement:

- Coupons  
- Offers  
- Delivery zones  
- Notifications  
- Customers  
- Reports  
- Staff  
- Permissions

---

# 96\. PHASE 7 — MASTER DASHBOARD

Implement:

- Restaurants  
- Create restaurant  
- Restaurant details  
- Subscription  
- Plans  
- Feature flags  
- Analytics  
- Payment monitoring  
- Platform users  
- Audit logs  
- System health

---

# 97\. PHASE 8 — ADVANCED FEATURES

Later:

- Loyalty  
- Delivery tracking  
- Advanced analytics  
- Support system  
- Advanced segmentation  
- Automation  
- More payment providers  
- Redis if required  
- Advanced app deployment automation

Do not implement these before the core platform is stable.

---

# 98\. PAYMENT PROVIDER ABSTRACTION

Create an abstraction such as:

PaymentProvider

with capabilities like:

createPayment()

verifyPayment()

refundPayment()

handleWebhook()

Then implementations can be:

PaymobProvider

KashierProvider

OtherProvider

The rest of the platform should not care which provider is being used.

---

\# 99\. SUBSCRIPTION ARCHITECTURE

Subscription architecture is defined in Sections 52B through 52AK.

Do not create a second or conflicting subscription model.

The implementation must use the centralized subscription lifecycle, grace period, billing state, tenant suspension, access resolver, audit logging, and platform authorization rules defined above.

The final database schema may contain:

restaurant\_id  
plan\_id  
status  
start\_date  
end\_date  
trial\_start\_date  
trial\_end\_date  
grace\_period\_until  
auto\_renew  
payment\_status  
suspended\_at  
suspension\_reason  
cancelled\_at  
created\_at  
updated\_at

Subscription status must remain conceptually separate from tenant status.

The effective operational access must be derived by the centralized tenant access resolver.

---

# 100\. FEATURE FLAG ARCHITECTURE

Feature flags should support:

feature\_key

enabled

restaurant\_id

plan\_id

with an explicit precedence model.

Example:

Platform default

      ↓

Plan configuration

      ↓

Restaurant override

Restaurant-specific configuration should be able to override plan defaults where authorized.

---

# 101\. AUDIT LOG ARCHITECTURE

Audit log should capture:

actor\_id

actor\_type

restaurant\_id

action

entity\_type

entity\_id

old\_values

new\_values

ip\_address if appropriate

created\_at

Avoid storing unnecessary sensitive information.

---

# 102\. IMPORTANT SECURITY RULES

NEVER:

- Put payment secrets in Flutter  
- Put private credentials in React  
- Trust client prices  
- Trust client roles  
- Trust client restaurant IDs  
- Disable RLS for convenience  
- Use service-role credentials in client apps  
- Return sensitive payment credentials  
- Commit secrets to Git  
- Allow tenant data access based only on UI filtering

---

# 103\. NO FAKE IMPLEMENTATION

Do not create fake:

Payment success

Analytics numbers

System health

Orders

Subscriptions

Database records

If something is not implemented, clearly mark it as not implemented.

Do not use mock data in production screens unless explicitly requested.

---

# 104\. DATABASE MIGRATIONS

All database changes must be migration-based.

Do not manually modify production schema without migrations.

Keep migrations organized and reproducible.

---

# 105\. SEED DATA

Create development seed data with:

2 restaurants

multiple users

categories

products

modifiers

orders

coupons

subscriptions

Use realistic development data.

Clearly separate seed data from production data.

---

# 106\. DOCUMENTATION

Create documentation for:

Architecture

Database schema

Authentication

RLS

Local development

Environment variables

Supabase setup

Cloudflare R2 setup and image storage

Realtime

Edge Functions

Payments

Deployment

Testing

Troubleshooting

---

# 107\. DEPLOYMENT

The architecture should support:

Flutter

    ↓

Android / iOS

Restaurant Admin

    ↓

Web hosting

Master Dashboard

    ↓

Web hosting

Supabase

    ↓

Production backend

Use separate environments where practical.

---

# 108\. BACKUP / RECOVERY

The production architecture must consider:

- Database backups  
- Migration history  
- Recovery strategy  
- Storage backup strategy  
- Secrets management

Do not assume that source code alone is enough to recover the system.

---

# 109\. DESIGN PRINCIPLE

The platform must be built as an **engine**, not as one restaurant application.

The goal is:

Build once

     ↓

Create Tenant

     ↓

Configure Branding

     ↓

Configure Features

     ↓

Configure Payment

     ↓

Restaurant is ready

Adding a new restaurant should NOT require copying the entire application codebase.

---

# 110\. FINAL ARCHITECTURE

                         PLATFORM OWNER

                              │

                              ▼

                    ┌───────────────────┐

                    │ MASTER DASHBOARD  │

                    │      React        │

                    └─────────┬─────────┘

                              │

                              ▼

                    ┌───────────────────┐

                    │     SUPABASE      │

                    │                   │

                    │ PostgreSQL        │

                    │ Auth              │

                    │ RLS               │

                    
                    │ Realtime          │

                    │ Edge Functions    │

                    └─────────┬─────────┘

                              │

             ┌────────────────┼────────────────┐

             │                │                │

             ▼                ▼                ▼

      Restaurant A      Restaurant B      Restaurant C

             │                │                │

       ┌─────┴─────┐    ┌─────┴─────┐    ┌─────┴─────┐

       │           │    │           │    │           │

       ▼           ▼    ▼           ▼    ▼           ▼

     Admin       App  Admin       App  Admin       App

      React     Flutter React    Flutter React    Flutter

---

# 111\. MOST IMPORTANT IMPLEMENTATION RULE

Before writing large amounts of application code:

1. Inspect the existing repository.  
2. Identify the current architecture.  
3. Identify existing functionality.  
4. Do NOT rewrite working functionality unnecessarily.  
5. Do NOT delete existing features.  
6. Create a migration plan.  
7. Design the Supabase schema.  
8. Implement tenant isolation.  
9. Implement RLS.  
10. Test tenant isolation.  
11. Then implement application features incrementally.

If an existing project already contains code, preserve working functionality and modify it incrementally.

Do not replace the entire project just to introduce Supabase.

---

# 112\. IMPLEMENTATION BEHAVIOR

When implementing:

- Work in small logical phases.  
- Keep the project compilable.  
- Fix errors before moving to the next phase.  
- Do not leave broken imports.  
- Do not leave TODOs for core security.  
- Do not silently skip requirements.  
- Do not create duplicate models/services.  
- Reuse existing components when appropriate.  
- Keep database and frontend types synchronized.  
- Verify every migration.  
- Verify RLS policies.  
- Test critical flows after implementation.

---

# 113\. DEFINITION OF DONE

A feature is not considered complete simply because the UI exists.

A feature is complete only when:

UI

\+

Database

\+

Authentication

\+

Authorization

\+

RLS

\+

Validation

\+

Error Handling

\+

Realtime where required

\+

Backend logic where required

\+

Testing

are correctly implemented.

---

# 114\. FINAL GOAL

Build a production-ready SaaS platform capable of supporting many restaurants from one centralized backend.
The platform must allow:

Platform Owner
      ↓
Create Restaurant
      ↓
Assign Plan
      ↓
Configure Features
      ↓
Configure Branding
      ↓
Configure Payment Provider
      ↓
Create Restaurant Admin
      ↓
Restaurant configures Menu
      ↓
Customers use White-Label App
      ↓
Customers use White-Label Website
      ↓
Customers create Orders from App or Website
      ↓
Restaurant receives Orders
      ↓
Payment processed securely
      ↓
Order status updates in Realtime
      ↓
Restaurant and Customer see updates
      ↓
Master Dashboard sees platform analytics

The final product should be scalable, secure, maintainable, multi-tenant, and suitable for commercial SaaS usage.
Do not optimize for a quick demo.
Optimize for a solid architecture that can evolve from: 1 restaurant to: 10 restaurants to: 100 restaurants to: 1000+ restaurants without requiring a complete rewrite of the architecture.  



# Sales Analytics & Product Breakdown — Future Feature Spec

**Status:** Approved for the roadmap, NOT yet implemented. Do not begin work
on this until explicitly told to start — this file is a saved reference,
matching the audit-first workflow used for the rest of this platform.

---

## Sales Data Granularity & Analytics Rule

All sales data must be stored and modeled at sufficient granularity to support detailed historical analysis.

The platform must NEVER reduce an order item to only:
- Product name
- Quantity
- Total revenue

Order items must preserve the exact purchased configuration at the time of purchase, including when applicable:

- Product
- Product name snapshot
- Variant selections (e.g. size)
- Modifier groups
- Modifier selections (e.g. milk type, extras)
- Quantity
- Base price
- Variant price adjustment
- Modifier price adjustments
- Final unit price
- Total line price

Historical order data must remain immutable and auditable even if the product, price, variants, or modifiers are changed later.

### Analytics Requirement

The platform must support two levels of sales reporting:

1. **Standard Sales Report**
   - Simple product-level sales
   - Quantity sold
   - Revenue
   - Orders
   - Category performance
   - Time-based performance

2. **Detailed Product Breakdown**
   - Product → Variant → Modifier Group → Modifier
   - Example:
     - Latte → Size → Regular / Medium / Large
     - Latte → Milk → Whole / Skimmed / Oat / Almond
     - Latte → Extras → Espresso / Syrup / etc.

The detailed analytics must be calculated from historical order-item data rather than current product configuration.

### Future Costing Compatibility

The sales data model must remain compatible with future recipe and inventory costing features.

The architecture should eventually support:

```
Sales → Product → Variant → Modifier → Recipe → Ingredient Consumption → Cost → Gross Margin
```

Do not implement inventory or recipe costing unless explicitly requested, but do not design the sales model in a way that prevents these capabilities later.

### Generic Architecture Rule

Never hardcode analytics logic around specific products such as Latte, Coffee, Burger, Pizza, etc.

Products, variants, modifier groups, and modifiers must be generic entities so the same analytics system works for any restaurant, cafe, menu item, branch, or tenant.

### Multi-Tenant Security

All analytics and sales queries must respect tenant isolation and the existing authentication/RLS architecture.

A tenant must never be able to access another tenant's sales or order-item data.

### Performance Rule

Do not load large volumes of raw orders into the frontend solely to calculate analytics.

Use appropriate database/backend aggregation mechanisms and indexes.

Before implementing new analytics features, inspect the existing schema and determine the most efficient aggregation strategy.

---

## Goal

The normal sales report should remain simple and easy to understand, but users should be able to drill down into exactly what was sold inside every product.

Example — instead of only showing:
```
Latte
200 sold
20,000 EGP revenue
```

the system should be able to show:
```
Latte — 200 sold

Sizes:
- Regular: 80
- Medium: 70
- Large: 50

Milk:
- Whole Milk: 100
- Skimmed Milk: 30
- Oat Milk: 50
- Almond Milk: 20

Extras:
- +1 Espresso: 60
- +2 Espresso: 25
- Vanilla: 40
- Caramel: 30
```

The system should preserve this information at the order-item level so it can be analyzed later.

---

## 1. Data Model

Review the current database structure first.

The system should support:

**Product**
- id, name, category, base price, tenant_id

**Variants / Options** — e.g. Size (Regular/Medium/Large), Temperature (Hot/Iced), Crust (Thin/Thick)

**Modifier Groups** — e.g. Milk Type, Extras, Syrups, Toppings

**Modifiers** — e.g. Whole Milk, Oat Milk, Almond Milk, Extra Espresso, Vanilla, Caramel

Each order item must preserve a snapshot of what the customer actually selected. DO NOT rely only on the current product configuration.

If the restaurant changes the price, removes a modifier, or changes a product later, historical orders must remain unchanged.

Each order item should therefore store the relevant purchased information/snapshot: product_id, product_name_snapshot, variant selections, modifier selections, quantity, unit/base price, modifier prices, final unit price, total price.

The historical order must always remain auditable.

---

## 2. Normal Sales Report

Keep the existing normal Sales Report simple. It should show: Total sales, Total orders, Products sold, Revenue, Average order value, Best-selling products, Sales by category, Sales over time.

Example: `Latte — 200 sold — 20,000 EGP`

Do NOT force users to see every modifier and variant immediately.

---

## 3. Detailed Product Breakdown

Add a "View Details" / "Breakdown" action for products.

When the user opens Latte details:

```
PRODUCT: Latte
TOTAL SOLD: 200
TOTAL REVENUE: 20,000 EGP

SIZE
Regular: 80 | Medium: 70 | Large: 50

MILK TYPE
Whole: 100 | Skimmed: 30 | Oat: 50 | Almond: 20

EXTRAS
+1 Espresso: 60 | +2 Espresso: 25 | Vanilla: 40 | Caramel: 30
```

The system must calculate these numbers from actual order-item data.

---

## 4. Filters

The detailed report must support: Date range, Branch, Category, Product, Variant, Modifier group, Modifier, Order type, Payment method (if available).

Example questions it must answer: "How many Oat Milk Lattes did we sell this month?", "How many Large Lattes were sold?", "How many extra espresso shots were sold?", "How many Almond Milk drinks were sold in Branch A?"

---

## 5. Recipe / Costing-Ready Architecture

Design the system so it can later support inventory and recipe costing.

Example:
```
Latte Regular  → Espresso: 2 shots, Whole Milk: 250ml
Latte Medium   → Espresso: 2 shots, Whole Milk: 350ml
Latte Large    → Espresso: 3 shots, Whole Milk: 450ml

Oat Milk modifier    → replaces the milk ingredient
Extra Espresso        → adds 1 espresso shot
```

The current task is primarily SALES ANALYTICS. However, the architecture must make it possible later to calculate:
```
Product Sales → Variant Sales → Modifier Sales → Ingredient Consumption → Estimated Cost → Gross Margin
```

Do not implement unnecessary inventory functionality unless it already exists. Just make the data model extensible for it.

---

## 6. Important Business Requirement

The system must answer questions a basic POS sales report cannot, e.g.:
"How many Lattes did we sell?" AND "Of those, how many were Regular/Medium/Large?" AND "What milk types were used?" AND "How many extra espresso shots were sold?" AND eventually "How much milk and espresso did those sales theoretically consume?"

The goal is to turn raw sales data into useful operational information.

---

## 7. UI / UX

Keep the normal report clean. Use drill-down behavior:
```
Sales Report → Latte (200 sold, 20,000 EGP) → [View Breakdown] → Latte Breakdown (Overview / Sizes / Milk / Extras / Revenue / Cost if available)
```
Use charts/tables where appropriate. UI should be responsive and consistent with the existing dashboard design.

---

## 8. Multi-Tenant Requirement

This is a multi-tenant SaaS. Every query must be tenant-safe. A restaurant must NEVER be able to access another restaurant's sales or order-item data. Respect the existing authentication and RLS/security architecture. Do not introduce client-side filtering as the primary security mechanism.

---

## 9. Performance

Do not load every order and calculate everything in the frontend. Analyze the current architecture and determine whether aggregation should happen through: database queries, SQL views, RPC/functions, materialized/summary tables, or backend aggregation. Use the most appropriate approach based on the existing architecture. The system should remain performant when a restaurant has tens or hundreds of thousands of order items.

---

## 10. Implementation Process (when this is started)

Before writing code:
1. Inspect the existing database schema.
2. Inspect the current order creation flow.
3. Inspect how products, variants, and modifiers are currently stored.
4. Inspect the current Sales Report (none exists yet as of this writing).
5. Identify what data is currently missing.
6. Explain exactly what needs to change.
7. Propose the database/schema changes.
8. Propose the aggregation/query strategy.
9. Propose the UI changes.
10. Only then implement the feature.

Do not rewrite unrelated parts of the system. Preserve existing functionality.

After implementation, test: product with no modifiers, product with variants, product with multiple modifiers, multiple quantities of the same item, different prices, historical orders after product changes, multiple tenants, multiple branches, date filtering, empty results, large datasets.

The final result should be a reusable restaurant analytics system, not a hardcoded Latte report.

---

## Notes for implementation (added by Claude, for future reference)

Groundwork already in place from the base schema (migrations 001–014), relevant to this feature:
- `order_items` already stores `product_name`, `variant_label`, `unit_price`, `quantity`, `line_total` as an immutable snapshot per line.
- `order_item_modifiers` already stores `modifier_name`, `price` per selected modifier, linked to `order_items`.
- All of `orders`/`order_items`/`order_item_modifiers` are `restaurant_id`-scoped (via `orders.restaurant_id`) and RLS-protected, satisfying the multi-tenant requirement structurally already.

Still needed when this phase starts (not done yet): a `modifier_group_name` snapshot on `order_item_modifiers` (currently only the modifier name is snapshotted, not which group it belonged to — e.g. "Oat Milk" is stored, but not that it came from the "Milk Type" group) — this will matter for the "breakdown by modifier group" view. Aggregation strategy (views vs. RPC vs. materialized tables) needs to be decided based on real query patterns once there's actual order volume to test against, per the spec's own performance rule.
