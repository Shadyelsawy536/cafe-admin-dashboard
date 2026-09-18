# WHITE-LABEL MULTI-TENANT RESTAURANT PLATFORM

## Product, Architecture & Implementation Specification

> **Purpose:** This document is the single reference for the target architecture and product behavior. It is a specification, not an instruction to implement everything at once.
>
> **Core rule:** Audit the existing repository first, preserve working functionality, then implement missing pieces incrementally.

---

# 1. Platform Overview

Build a production-ready **White-Label Multi-Tenant Restaurant Ordering SaaS Platform** capable of serving many restaurants from one centralized backend.

The platform contains four products:

1. **Customer Mobile App** — Flutter
2. **Customer Ordering Website** — React
3. **Restaurant Admin Dashboard** — React
4. **Master Platform Dashboard** — React

### Backend

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Realtime
- Supabase Edge Functions
- PostgreSQL Row Level Security (RLS)
- Cloudflare R2 for customer-facing media assets

**Do not use Firebase as the application backend.**

Firebase Cloud Messaging may be used only as a push-notification delivery service if needed. It must not be used for authentication, database, storage, backend logic, tenant authorization, RLS, or business logic.

**Do not introduce Redis in the MVP.** It may be added later for caching, queues, rate limiting, background processing, or other proven needs.

---

# 2. Current Project & Audit-First Workflow

The repository already contains significant Flutter Customer App work. Existing screens, navigation, widgets, models, services, local state, and business logic may already exist.

Do **not** assume a feature is missing because it is described here. Inspect the actual repository.

## First task: repository audit

Before major code changes:

1. Inspect the repository and current architecture.
2. Identify screens, navigation, models, services, state management, widgets, and data sources.
3. Identify authentication, Supabase/backend integrations, and existing business logic.
4. Identify mock/local data, incomplete features, broken features, duplicated logic, and architectural problems.
5. Compare the implementation with this specification.

Produce a gap analysis containing:

- **Implemented**
- **Partially implemented**
- **Missing**
- **Needs refactoring**
- **Backend-dependent**
- **Not required for MVP**

For each relevant item state what exists, what is required, what is missing, and whether it belongs to MVP or a later phase.

### Preservation rules

Do not:

- Rewrite the whole project
- Delete working screens
- Replace navigation without a reason
- Replace reusable components unnecessarily
- Remove existing features
- Create duplicate architectures

Refactor only for clear reasons such as security, scalability, maintainability, correctness, performance, multi-tenancy, or backend integration.

### Audit stop rule

After the audit and gap analysis, stop. Do not implement the whole specification automatically. Major backend/architecture work requires approval.

---

# 3. Implementation Rules

Work in small, verifiable phases.

For each phase:

1. Explain the intended change.
2. Implement only that phase.
3. Build/test the affected project.
4. Fix errors.
5. Verify the result.
6. Report what was completed.
7. Continue only after the phase is stable.

Keep the project compilable and avoid unrelated changes.

When existing code conflicts with this specification:

1. Identify the conflict.
2. Explain its impact.
3. Determine whether the existing implementation can be preserved.
4. Choose the smallest safe change.
5. Do not rewrite automatically.

Security-critical requirements take priority over convenience, especially tenant isolation, RLS, authorization, payment security, subscription enforcement, and server-side validation.

Never infer implementation from UI alone. Verify actual source code.

---

# 4. Target Business Model

The platform is a centralized multi-tenant system:

```text
                    Platform Owner
                         |
                  Master Dashboard
                         |
                      Supabase
                         |
        +----------------+----------------+
        |                |                |
   Restaurant A     Restaurant B     Restaurant C
        |                |                |
   Admin + App       Admin + App       Admin + App
        \                |                /
         +------ Customer Website -------+
```

Every restaurant is a **tenant**.

A tenant owns and can manage only its own:

- Products
- Categories
- Orders
- Customers
- Offers
- Coupons
- Delivery configuration
- Branding/content
- Staff
- Payment configuration
- Notifications
- Reports
- Enabled features

Tenant isolation must be enforced by PostgreSQL/RLS, not only by frontend filtering.

The architecture must scale from one restaurant to 10, 100, and 1000+ restaurants without copying the application codebase or creating separate databases for normal tenants.

---

# 5. Technology Architecture

## Customer Mobile App

- Flutter / Dart
- Feature-based structure
- Clean Architecture where practical
- Supabase Flutter SDK
- Secure local storage where required
- Native Android/iOS capabilities when required

The app is a reusable white-label engine. Restaurant-specific configuration must be loaded dynamically; do not hardcode restaurant data into the source.

## Restaurant Admin

- React
- TypeScript
- Vite
- Supabase client
- React Router
- Reusable component architecture
- Responsive desktop-first UI
- Tablet support

The dashboard must be tenant-aware.

## Master Dashboard

- React
- TypeScript
- Vite
- Supabase
- Responsive UI

It serves platform owners and authorized platform staff.

## Customer Website

- React
- TypeScript
- Same centralized backend and tenant model as the mobile app
- Same design system and restaurant configuration
- One reusable website engine for multiple restaurants

The website is a first-class ordering channel, not a separate data source.

---

# 6. Cloudflare R2 Media Architecture

Customer-facing media must use **Cloudflare R2**, not Supabase Storage.

Typical assets:

- Restaurant logos
- Cover/hero images
- Product images
- Category images
- Banners
- Offer/promotional images
- Other customer-facing media

Recommended flow:

```text
Admin
  ↓
Secure upload flow
  ↓
Cloudflare R2
  ↓
Object key / URL / metadata
  ↓
PostgreSQL
  ↓
Customer App + Website
```

The database stores references and metadata; actual files live in R2.

Upload authorization, tenant isolation, file validation, and signed upload/download flows must be handled securely. R2 credentials must never be exposed to clients.

---

# 7. Database Architecture

Use a normalized PostgreSQL schema with clear foreign keys, constraints, status handling, and indexes based on actual query patterns.

Core entities include:

```text
restaurants
restaurant_settings
restaurant_branding
restaurant_features
profiles
restaurant_users
roles
permissions
role_permissions

categories
products
product_variants
modifier_groups
modifiers
product_modifier_groups

orders
order_items
order_item_modifiers
order_status_history

customers
customer_addresses
customer_favorites

coupons
coupon_redemptions
offers

delivery_zones
delivery_settings

payments
payment_transactions
payment_webhooks
payment_providers

subscriptions
plans
plan_features

notifications
notification_campaigns

audit_logs
platform_users
platform_roles

app_configurations
app_versions
support_tickets
feature_flags
media_assets
```

Do not create tables blindly. Adjust the final schema to the actual product and UI requirements while preserving the required capabilities.

### Restaurant record

A restaurant should support at least:

- id
- name
- slug
- description
- logo/media references
- phone
- email
- address
- latitude/longitude
- status
- subscription reference
- created_at
- updated_at
- soft-deletion fields where appropriate

Tenant states may include:

`trial`, `active`, `past_due`, `suspended`, `inactive`, `cancelled`, `expired`.

Suspension must not delete data.

---

# 8. Tenant Isolation & Authorization

Every restaurant-owned record must be associated with its tenant, normally through `restaurant_id`.

Examples:

```text
products.restaurant_id
categories.restaurant_id
orders.restaurant_id
customers.restaurant_id
coupons.restaurant_id
delivery_zones.restaurant_id
restaurant_users.restaurant_id
```

RLS must enforce access boundaries.

Restaurant users must never be able to access another restaurant's:

- Products
- Orders
- Customers
- Payments
- Coupons
- Settings
- Other private data

Platform administrators require separate platform-level authorization.

Useful centralized authorization helpers may include:

```text
is_platform_user()
is_platform_admin()
is_restaurant_member(restaurant_id)
has_restaurant_permission(restaurant_id, permission)
is_tenant_operational(restaurant_id)
get_tenant_access_state(restaurant_id)
```

They must be designed safely to avoid recursive RLS evaluation. Centralized helpers may reduce duplicated policy logic, but RLS remains the final database security boundary.

---

# 9. Authentication

## Customers

- Email/password
- Phone/social login may be added later if required

## Restaurant Staff

- Email/password
- Secure sessions

## Platform Staff

- Email/password
- Strong authentication
- MFA should be supported/planned for privileged users

Use Supabase Auth. Never store passwords manually.

---

# 10. Restaurant Branding & White-Label Configuration

Each tenant can independently configure:

- App/site name
- Logo
- Cover/hero image
- Primary/secondary/accent/background/text colors
- Typography/font configuration
- Button style
- Splash configuration
- Home layout/sections
- Support phone/email
- Social links
- Enabled features
- Payment availability
- Delivery settings
- Menu/content

The same app and website engines must render different restaurants from backend configuration.

Example:

```text
Restaurant A → red branding
Restaurant B → green branding
Restaurant C → different branding
```

No restaurant-specific source-code copy should be required.

---

# 11. Customer Ordering Website

The website and Flutter app must use the same:

- Restaurant configuration
- Menu
- Products/prices
- Variants/modifiers
- Offers/coupons
- Delivery zones
- Customers
- Orders
- Payments
- Feature entitlements
- Business rules

There must be one source of truth.

### Core website functionality

- Restaurant branding
- Home
- Menu/categories
- Product details
- Variants
- Modifiers/add-ons
- Search
- Cart
- Coupons
- Delivery/pickup
- Addresses
- Checkout
- Online payment where enabled
- Order confirmation
- Order tracking/status where enabled
- Customer account
- Favorites where enabled
- Reorder
- Offers/promotions

### Unified orders

Orders from App and Website enter the same Restaurant Admin order system.

Each order stores its source/channel, e.g.:

- Mobile App
- Website

The same validation, server-side calculation, coupon, delivery, payment, lifecycle, and Realtime rules apply to both channels.

### Website tenant model

One reusable website engine serves multiple restaurants through tenant configuration. It must respect the same platform/plan/restaurant feature flags and backend authorization.

---

# 12. Customer Mobile App

Main navigation:

- Home
- Menu
- Orders
- Favorites
- Profile

## Home

Support:

- Restaurant identity
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

Home layout is configurable.

## Search

Search by product name, category, and description where appropriate.

Include loading, empty, error, and useful suggestion/recent-search states.

Results must be tenant-scoped.

## Menu

Support:

- Categories
- Products
- Images
- Description
- Price
- Availability
- Variants
- Modifiers
- Special instructions

---

# 13. Product & Modifier System

## Products

Support:

- name
- description
- base_price
- image/media reference
- category
- availability
- featured
- best_seller
- sort_order

Variants allow configurations such as:

```text
Small   100
Medium  140
Large   180
```

## Modifier groups

Examples:

```text
Extras
- Cheese
- Mushroom
- Sauce
```

Modifiers support:

- name
- price
- availability
- min/max quantity

Groups support:

- minimum selections
- maximum selections
- required/optional

The system must remain generic and never hardcode specific products.

---

# 14. Cart & Checkout

## Cart

Store:

- Products
- Variants
- Modifiers
- Quantities
- Special instructions

Display:

- Subtotal
- Discount
- Delivery fee
- Tax
- Service fee
- Total

Client totals are informational only.

## Checkout

Support:

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

Before order creation, validate server-side:

- Product availability
- Current prices
- Variant/modifier prices
- Coupon validity
- Delivery zone
- Minimum order
- Restaurant operating status
- Payment method availability

Never trust client-submitted totals or prices.

---

# 15. Order Engine

Order lifecycle may include:

```text
Pending
Confirmed
Preparing
Ready
Out for Delivery
Delivered
Cancelled
Rejected
```

Restaurant configuration may customize the workflow where appropriate.

Every status change creates an `order_status_history` record containing:

- order_id
- old_status
- new_status
- changed_by
- created_at

## Customer order screen

Show:

- Order number
- Status timeline
- Items/quantities/modifiers
- Prices
- Delivery address
- Payment status
- Total
- Estimated time

## Order history

Customers can see current and previous orders and reorder.

Reorder must rebuild the cart using current product configuration/pricing; never blindly reuse old prices.

---

# 16. Favorites, Profile & Addresses

## Favorites

Support favorite products and removal. Multi-restaurant favorites can be added later if discovery is introduced.

Favorites must remain customer/tenant isolated.

## Profile

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

## Addresses

Multiple addresses such as Home, Work, Other.

Fields may include:

- label
- full_address
- latitude/longitude
- building
- floor
- apartment
- delivery_notes

Only operationally necessary address information should be exposed to the restaurant.

---

# 17. Delivery

Restaurant configuration supports:

- Delivery enabled
- Pickup enabled
- Minimum order
- Estimated delivery time
- Delivery zones
- Delivery fees

Example:

```text
Zone A → 30 EGP
Zone B → 45 EGP
Zone C → 60 EGP
```

Delivery calculations must be validated server-side.

The architecture should support future driver tracking/ETA without implementing unnecessary driver infrastructure in the MVP.

---

# 18. Notifications & Loyalty

## Customer notifications

Potential events:

- Order confirmed
- Preparing
- Ready
- Out for delivery
- Delivered
- Promotions
- Offers
- General announcements

Push delivery must use secure backend logic.

## Loyalty

Architecture should support:

- Points
- Rewards
- Vouchers
- Points history
- Redemption

Loyalty may be disabled through feature flags and is a later-stage feature unless explicitly promoted to MVP.

---

# 19. Restaurant Admin Dashboard

Navigation should support:

- Dashboard
- Orders
- Menu
- Categories
- Products
- Modifiers
- Offers
- Coupons
- Customers
- Delivery
- Payments
- Notifications
- Reports
- Staff
- Content
- Settings

Navigation must respect permissions and feature flags.

## Overview

Show tenant-specific:

- Today's sales
- Today's orders
- Average order value
- Pending orders
- Cancelled orders
- Sales/order trends
- Best sellers
- Payment breakdown
- Delivery vs pickup

## Orders

Support order actions according to role:

- Accept
- Reject
- Prepare
- Mark Ready
- Complete
- Cancel

Every action must be authorized and logged.

## Kitchen

Prepare a Kitchen view showing:

- New orders
- Items
- Modifiers
- Notes
- Preparation time
- Status

Kitchen users must not access payment/platform settings.

---

# 20. Menu, Content, Offers & Coupons

## Menu management

Categories:

- Add/edit/delete
- Reorder
- Hide/show

Products:

- Add/edit/delete
- Price
- Description
- Image
- Category
- Availability
- Featured/best seller
- Variants
- Modifiers

Availability states may include:

- Available
- Out of Stock
- Hidden

Changes should propagate to App and Website, using Realtime where useful.

## Content

Restaurant controls:

- Logo
- Cover image
- Banners
- Featured sections/products
- About
- Contact
- Social links
- Home sections

## Offers

Support:

- Percentage discount
- Fixed discount
- Product-specific
- Category-specific
- Time-based
- Start/end dates
- Usage limitations

## Coupons

Support fields such as:

- code
- discount_type
- discount_value
- minimum_order
- maximum_discount
- start_at
- end_at
- usage_limit
- per_customer_limit
- active

Restrictions may target:

- Products
- Categories
- Customers
- First order
- Minimum order

Coupon validation is server-side.

---

# 21. Customer Management

Restaurant staff can see, according to permissions:

- Customers
- Order count
- Total spending
- Last order
- Operationally necessary addresses
- Loyalty data when enabled

Do not expose unnecessary private information.

---

# 22. Restaurant Staff & Permissions

Roles may include:

- Owner
- Manager
- Cashier
- Kitchen
- Delivery

Permissions must be granular and enforced by backend/RLS, not only React.

Examples:

| Role | Orders | Menu | Reports | Customers | Staff | Payment Config | Platform Settings |
|---|---|---|---|---|---|---|---|
| Owner | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manager | ✓ | ✓ | ✓ | ✓ | ✓ | ✕ | ✕ |
| Cashier | ✓ | Limited | ✕ | ✓ | ✕ | ✕ | ✕ |
| Kitchen | ✓ | View | ✕ | ✕ | ✕ | ✕ | ✕ |

Adjust the final permission matrix to actual requirements, but never give access based solely on UI visibility.

---

# 23. Payments

Support multiple providers through an abstraction, for example:

```text
PaymentProvider
  createPayment()
  verifyPayment()
  refundPayment()
  handleWebhook()

PaymobProvider
KashierProvider
OtherProvider
```

The application should not be coupled to one provider.

Restaurant customer payments and platform SaaS subscription payments are **separate payment systems**.

## Restaurant customer payment flow

```text
Customer
  ↓
Create Order
  ↓
Backend Validation
  ↓
Edge Function
  ↓
Restaurant Payment Provider
  ↓
Provider Result/Webhook
  ↓
Supabase
  ↓
Payment + Order Update
  ↓
Realtime
  ↓
Customer + Restaurant
```

Never mark an order paid solely from a client success screen.

Payment statuses may include:

- pending
- processing
- paid
- failed
- cancelled
- refunded
- partially_refunded

Store transaction records.

## Restaurant payment configuration

Admin may see provider and connection status. Credentials must be masked and never returned as raw secrets.

Provider secrets must never be exposed to Flutter or React clients.

---

# 24. Master Platform Dashboard

Navigation:

- Overview
- Restaurants
- Create Restaurant
- Subscriptions
- Plans
- Payments
- Analytics
- Feature Flags
- App Management
- Platform Users
- Notifications
- Support
- Audit Logs
- System Health
- Settings

## Overview

Show real metrics such as:

- Total/active/suspended/trial restaurants
- Orders today
- Platform GMV
- Platform revenue
- Active apps
- Restaurant/order/revenue growth
- Top restaurants
- Payment success rate

Never generate fake metrics.

## Restaurant management

Show:

- Restaurant
- Status
- Subscription/plan
- Orders/revenue
- App version
- Last activity
- Payment provider
- Admin users
- Issues

Master Admin can open restaurant details.

## Create restaurant

Support:

- Name
- Slug
- Logo
- Brand colors
- Admin email
- Plan
- Subscription
- Payment provider

Tenant creation should initialize the required settings, branding, admin relationship, feature configuration, subscription, and app configuration.

Use the central database; do not create separate tenant databases unless a future enterprise requirement demands it.

---

# 25. Tenant Lifecycle & Subscription Enforcement

Tenant status, subscription status, payment status, and system health are separate concepts.

Example:

```text
Tenant: ACTIVE
Subscription: EXPIRED
Payment Provider: CONNECTED
Database: HEALTHY
```

The tenant can still be blocked because the subscription is expired.

## Subscription states

Support a lifecycle such as:

```text
TRIAL
  ↓
ACTIVE
  ↓
PAST_DUE
  ↓
EXPIRED
  ↓
SUSPENDED
```

Possible recovery:

```text
PAST_DUE → PAYMENT_SUCCESS → ACTIVE
SUSPENDED → SUBSCRIPTION_RENEWED → ACTIVE
```

Allowed transitions must be controlled server-side.

## Subscription data

At minimum support:

- restaurant_id
- plan_id
- status
- start_date
- end_date
- trial_start_date
- trial_end_date
- grace_period_until
- auto_renew
- payment_status
- suspended_at
- suspension_reason
- cancelled_at
- created_at
- updated_at

Do not allow restaurant admins to modify subscription status, plan ownership, expiry, trial/grace periods, suspension state, or payment verification.

## Plans

The platform may define configurable plans such as Basic, Pro, Premium.

Plans can contain feature entitlements, but do not hardcode plan logic throughout the apps.

## Grace period

Support a configurable grace period after expiration or failed payment.

Example:

```text
Expiration → Grace Period → Suspension
```

The duration must be configured centrally.

## Automatic enforcement

A server-side scheduled process must evaluate:

- Trial expiration
- Subscription expiration
- Grace period
- Payment state
- Existing/manual extensions
- Current suspension state

It must record the reason and audit event before changing access.

Do not rely on a dashboard being opened or on frontend state.

---

# 26. Tenant Access Resolver

Create one authoritative backend mechanism for effective operational access.

Conceptually:

```text
getTenantAccessState(tenant_id)
```

It may resolve:

```text
tenant_status
subscription_status
payment_status
administrative_suspension
security_suspension
trial_active
grace_period_active
operational_access
customer_ordering_enabled
restaurant_admin_enabled
reason
reason_code
```

Example allowed state:

```text
tenant_status: active
subscription_status: active
operational_access: true
customer_ordering_enabled: true
restaurant_admin_enabled: true
```

Example blocked state:

```text
tenant_status: active
subscription_status: expired
grace_period_active: false
operational_access: false
customer_ordering_enabled: false
restaurant_admin_enabled: false
reason_code: subscription_expired
```

The resolver must evaluate all blocking conditions and never trust client-provided status, subscription, plan, payment state, or feature flags.

A renewed subscription must not automatically remove an independent administrative/security suspension.

---

# 27. Suspension Behavior

A suspended tenant must be blocked from normal operational use.

At minimum, a suspended restaurant cannot:

- Use normal Restaurant Admin functionality
- Create new orders
- Modify menu/settings
- Send campaigns
- Configure payment providers
- Manage staff
- Use protected premium features

The Customer App/Website should show a controlled unavailable state rather than internal details.

Restaurant Admin should show a restricted-access screen with appropriate subscription/support information.

Direct URLs and modified client code must not bypass the backend restriction.

### Platform admin override

Authorized Master Dashboard users must still be able to access suspended tenant data for administration, support, finance, and auditing.

### Suspension reasons

Examples:

- subscription_expired
- payment_failed
- manual_admin_action
- terms_violation
- security_issue
- restaurant_requested
- other

Store reason, time, and actor where appropriate.

### Multiple blocking conditions

Do not use one boolean if it would lose independent restrictions.

Example:

```text
Subscription expired
AND
Manual administrative suspension
```

Renewing the subscription must not remove the manual suspension automatically.

Effective operational access is allowed only when all required conditions are satisfied.

---

# 28. Tenant Lifecycle Actions

Master Admin may:

- Activate
- Suspend
- Deactivate
- Reactivate
- Extend trial
- Extend subscription
- Change plan
- Cancel subscription

All sensitive lifecycle actions require authorization and audit logging.

## Reactivation

Before reactivation, validate:

- Subscription state
- Payment state where required
- Administrative/security restrictions
- Required configuration

## Extension

Support fixed or custom extensions such as:

- 7 days
- 30 days
- 90 days
- Custom

## Trial management

Support configurable:

- Duration
- Start/end dates
- Features available during trial

## Subscription warnings

Restaurant Admin may receive warnings before expiration and during grace period through configurable channels such as:

- Dashboard banners
- In-app notifications
- Push notifications
- Email

## Subscription history

Record:

- Created
- Activated/renewed
- Extended
- Plan changed
- Payment failed
- Past due
- Expired
- Suspended
- Reactivated
- Cancelled

Authorized Master Dashboard users can view this history.

---

# 29. Subscription Billing

SaaS subscription billing is separate from restaurant customer payments:

```text
Customer → Restaurant
Restaurant → Platform Owner
```

Restaurant payment provider credentials must never be used for platform subscription billing.

The platform architecture should support:

- Invoices
- Payment attempts
- Successful/failed payments
- Renewal dates
- Payment history
- Subscription status

Manual subscription management may be used initially. Do not claim recurring billing exists until it is actually implemented.

---

# 30. Feature Flags

Feature flags are required.

Feature access can be controlled at:

1. Platform level
2. Plan level
3. Restaurant level

Use an explicit precedence model such as:

```text
Platform Default
      ↓
Plan Configuration
      ↓
Restaurant Override
```

Example:

```text
Ordering          ON
Online Payment    ON
Loyalty           OFF
Coupons           ON
Delivery Tracking ON
```

Feature disabling is different from tenant suspension. An active tenant may have individual features disabled.

Do not duplicate plan/feature logic separately across applications.

---

# 31. App Management

Master Dashboard should track:

- Android version
- iOS version
- Current version
- Minimum supported version
- Last update
- Status

Architecture should support:

- Minimum supported version
- Recommended version
- Force update
- Maintenance mode

Do not claim automatic mobile publishing unless deployment infrastructure actually exists.

---

# 32. Platform Users & Global Notifications

Platform roles may include:

- Super Admin
- Support
- Finance
- Developer
- Sales

Use least privilege.

Examples:

- Finance → revenue, payments, subscriptions
- Support → restaurants, health, tickets
- Developer → technical/system information

Master Admin can notify:

- All restaurants
- Specific restaurant
- Specific plan

Examples include maintenance, provider incidents, platform updates, and new features.

---

# 33. Reports & Analytics

## Restaurant reports

Support:

- Daily/weekly/monthly sales
- Orders
- Average order value
- Best sellers
- Cancelled orders
- Discounts
- Payment methods
- Delivery vs pickup

All analytics must be tenant-isolated.

## Platform analytics

Support:

- Total GMV
- Platform revenue
- Orders
- Revenue per restaurant
- Top restaurants
- Growth
- Average order
- Payment success rate
- Subscription revenue
- Active tenants
- Churn

Use real database data and appropriate backend aggregation.

Do not load large raw datasets into the frontend just to calculate reports.

---

# 34. Sales Analytics & Product Breakdown — Future Feature

**Status: Approved roadmap item; not implemented until explicitly requested.**

Sales data must preserve enough historical detail for detailed analytics.

An order item must retain, where applicable:

- Product
- Product name snapshot
- Variant selections
- Modifier groups
- Modifier selections
- Quantity
- Base price
- Variant price adjustment
- Modifier price adjustments
- Final unit price
- Total line price

Historical order data must remain immutable/auditable even if current products, prices, variants, or modifiers later change.

## Standard sales report

- Product-level sales
- Quantity sold
- Revenue
- Orders
- Category performance
- Time-based performance

## Detailed breakdown

Support drill-down:

```text
Product
  → Variant
  → Modifier Group
  → Modifier
```

Example:

```text
Latte — 200 sold

Sizes:
Regular 80
Medium 70
Large 50

Milk:
Whole 100
Skimmed 30
Oat 50
```

This must be calculated from historical order-item data, not current product configuration.

## Future costing compatibility

Do not implement inventory/recipe costing yet, but keep the model compatible with:

```text
Sales
 → Product
 → Variant
 → Modifier
 → Recipe
 → Ingredient Consumption
 → Cost
 → Gross Margin
```

Analytics must remain generic and work for any restaurant/product.

---

# 35. Inventory & Availability

MVP focuses on product availability:

- Available
- Out of Stock
- Hidden

Design the schema so full inventory can be added later.

Do not implement complex inventory management unless explicitly requested.

---

# 36. Notifications & Campaigns

Restaurant notification campaigns may target:

- All customers
- Specific segments

Examples:

- Discount announcement
- New menu item
- Weekend offer

Sending must be controlled by backend functions and rate-limited/authorized to prevent arbitrary clients from sending unlimited notifications.

---

# 37. Support System

Prepare support tickets with fields such as:

- restaurant_id
- created_by
- category
- priority
- status
- subject
- description
- created_at
- updated_at

Statuses:

- Open
- In Progress
- Waiting
- Resolved
- Closed

This is a later-stage feature unless promoted to MVP.

---

# 38. Audit Logs

Audit logging is mandatory for important administrative, financial, security, tenant, subscription, and data-changing operations.

Record where appropriate:

- actor_id
- actor_type
- restaurant_id
- action
- entity_type
- entity_id
- old_values
- new_values
- reason
- timestamp
- IP address where appropriate
- relevant metadata

Examples:

```text
Super Admin
SUSPEND_TENANT
Tenant: Restaurant A
Reason: Subscription expired
```

```text
Restaurant Manager
CHANGE_PRODUCT_PRICE
Burger: 150 → 180 EGP
```

System-generated events must identify the actor as the system.

Ordinary users must not edit audit logs.

Avoid storing unnecessary sensitive information.

---

# 39. Security Requirements

Security is a first-class requirement.

Implement:

- PostgreSQL RLS
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

Never trust client-supplied:

- Prices
- Totals
- Roles
- Restaurant IDs
- Permissions
- Payment status
- Subscription state
- Feature entitlements

Never:

- Put payment secrets in Flutter/React
- Use service-role credentials in client apps
- Disable RLS for convenience
- Return raw payment credentials
- Commit secrets to Git
- Use frontend filtering as the security boundary

---

# 40. Secure Order Creation

Client may send:

- Product IDs
- Variant IDs
- Modifier IDs
- Quantities
- Coupon code
- Address
- Delivery/pickup choice

Backend retrieves authoritative data from PostgreSQL and calculates:

- Product prices
- Modifier/variant prices
- Subtotal
- Discount
- Delivery fee
- Tax
- Service fee
- Final total

Never trust:

```text
client_total
client_price
client_discount
client_delivery_fee
```

Critical operations should use database transactions, especially:

- Order creation
- Payment state transitions
- Coupon redemption
- Availability-sensitive operations
- Refunds
- Subscription changes

---

# 41. Realtime

Use Supabase Realtime where it materially improves the product, especially for:

- New orders
- Order status changes
- Product availability
- Important dashboard updates

Do not subscribe to every table unnecessarily.

Realtime must be tenant-scoped and securely authorized.

---

# 42. Edge Functions

Use Edge Functions only when server-side execution is required.

Potential functions:

```text
create-payment
verify-payment
payment-webhook
refund-payment
send-notification
create-restaurant
suspend-restaurant
validate-coupon
calculate-order
get-tenant-access-state
```

Names may be adjusted to the final implementation.

---

# 43. Performance & Indexing

Avoid:

- N+1 queries
- Unnecessary database calls
- Huge Realtime subscriptions
- Loading all products at once
- Loading unnecessary customer data
- Rebuilding whole Flutter screens unnecessarily

Use:

- Pagination
- Lazy loading
- Caching where appropriate
- Optimized queries
- Proper indexes
- Backend aggregation for analytics

Index based on actual query patterns. Likely candidates include:

- restaurant_id
- created_at
- status
- category_id
- product_id
- order_id
- customer_id
- subscription_id

Do not index every column blindly.

---

# 44. Data Integrity & Soft Delete

Use:

- Foreign keys
- Unique constraints
- Check constraints
- NOT NULL where appropriate
- Controlled status values
- Soft deletion where appropriate

For important historical data, avoid destructive deletion.

Use fields such as `deleted_at` where appropriate, especially for:

- Restaurants
- Products
- Categories
- Other records whose history must remain meaningful

Orders and financial records should not disappear accidentally.

---

# 45. Storage Organization

R2 object keys should be tenant-organized, for example:

```text
restaurants/{restaurantId}/logo
restaurants/{restaurantId}/branding
restaurants/{restaurantId}/banners
restaurants/{restaurantId}/products
restaurants/{restaurantId}/offers
```

Actual storage implementation must use secure R2 access rather than exposing credentials.

---

# 46. Error Handling & Logging

Handle:

- Network errors
- Authentication errors
- Authorization errors
- Database errors
- Validation errors
- Payment errors
- Timeouts
- Realtime disconnections
- Storage upload failures

All interfaces need meaningful:

- Loading states
- Empty states
- Error states
- Success states
- Validation feedback
- Permission-denied states
- Skeleton loaders where appropriate

Do not expose sensitive technical details to users.

Structured backend logging must never contain:

- Passwords
- API secrets
- Private keys
- Payment secrets
- Authentication tokens

---

# 47. Environment & Secrets

Separate:

- Development
- Staging
- Production

Never commit secrets to Git.

Use environment variables/secrets for:

- Supabase credentials
- Payment secrets
- API credentials
- Notification credentials
- Deployment credentials

A public Supabase client key is not a secret, but its security still depends on correct RLS and authorization.

---

# 48. Project Structure & Code Quality

Use maintainable, modular structures.

### Flutter

```text
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
```

### Restaurant Admin

```text
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
```

Master Dashboard should use a similar modular structure.

Follow:

- Clean code
- SOLID where appropriate
- Separation of concerns
- Reusable components
- Strongly typed models
- Consistent naming
- Centralized data access
- No duplicated business logic

Do not scatter raw Supabase queries throughout UI components. Use services/repositories/hooks where appropriate.

Avoid giant files and excessive `dynamic`/`any`.

Core types should exist for entities such as:

- Restaurant
- Product
- Category
- Modifier
- Order
- OrderItem
- Customer
- Coupon
- Payment
- Subscription
- FeatureFlag
- Notification
- Staff

---

# 49. Testing

Testing is progressive but mandatory for critical behavior.

## Flutter

- Unit tests
- Widget tests
- Critical flow tests

## React

- Component tests where useful
- Form validation tests
- Critical business-logic tests

## Backend

Test:

- RLS
- Tenant isolation
- Order creation
- Coupon validation
- Payment verification
- Subscription enforcement
- Access resolver

### Mandatory tenant isolation test

Create at least two restaurants:

```text
Restaurant A
Restaurant B
```

Create users for both.

Verify A cannot:

- Read B products
- Read B orders
- Update B products
- Read B customers
- Read B payments

Then verify authorized Master Admin access works correctly.

---

# 50. Database Migrations & Seed Data

All schema changes must be migration-based and reproducible.

Development seed data should include at least:

- 2 restaurants
- Multiple users
- Categories
- Products
- Modifiers
- Orders
- Coupons
- Subscriptions

Keep seed data separate from production data.

Before deep frontend integration:

1. Finalize schema.
2. Create migrations.
3. Define relationships.
4. Add appropriate indexes/constraints.
5. Implement RLS.
6. Implement roles/permissions.
7. Test Tenant A vs Tenant B.
8. Test platform-admin access.
9. Test suspended-tenant behavior.

Only then should the frontend depend deeply on the production database.

---

# 51. Documentation & Deployment

Documentation should cover:

- Architecture
- Database schema
- Authentication
- RLS
- Local development
- Environment variables
- Supabase setup
- Cloudflare R2 setup
- Realtime
- Edge Functions
- Payments
- Deployment
- Testing
- Troubleshooting

Deployment architecture should support:

```text
Flutter → Android / iOS

Restaurant Admin → Web hosting

Customer Website → Web hosting

Master Dashboard → Web hosting

Supabase → Production backend

Cloudflare R2 → Production media
```

Use separate environments where practical.

Production recovery planning must consider:

- Database backups
- Migration history
- Recovery strategy
- R2/storage backup strategy
- Secrets management

---

# 52. MVP Implementation Order

The exact order may change after the repository audit, but the target progression is:

## Phase 1 — Foundation

- Supabase project
- PostgreSQL schema
- Auth
- Profiles
- Restaurants
- Roles
- RLS
- R2/media foundation
- Basic tenant isolation

**Do not continue until tenant isolation is verified.**

## Phase 2 — Restaurant Core

- Categories
- Products
- Variants
- Modifiers
- Branding
- Restaurant settings
- Restaurant Admin foundation

## Phase 3 — Customer Channels

- Existing Flutter UI integration
- Authentication
- Restaurant configuration
- Home
- Menu
- Product details
- Cart
- Checkout
- Orders
- Profile
- Customer Website

Preserve existing UI wherever it already satisfies the requirement.

## Phase 4 — Order Engine

- Server-side order creation
- Pricing
- Coupon validation
- Status lifecycle
- Order history
- Realtime
- Restaurant order dashboard

## Phase 5 — Payments

- Provider abstraction
- Paymob
- Payment transactions
- Webhooks
- Verification
- Failed payments
- Refund architecture

Add other providers through the same abstraction.

## Phase 6 — Restaurant Features

- Coupons
- Offers
- Delivery zones
- Notifications
- Customers
- Reports
- Staff
- Permissions

## Phase 7 — Master Dashboard

- Restaurants
- Create restaurant
- Restaurant details
- Plans/subscriptions
- Feature flags
- Analytics
- Payment monitoring
- Platform users
- Audit logs
- System health

## Phase 8 — Advanced Features

Later:

- Loyalty
- Delivery tracking
- Advanced analytics
- Support
- Advanced segmentation
- Automation
- More payment providers
- Redis if proven necessary
- Advanced deployment automation
- Detailed sales/product breakdown

---

# 53. Definition of Done

A feature is not complete because its UI exists.

A feature is complete only when the required parts are implemented and verified:

```text
UI
+
Database
+
Authentication
+
Authorization
+
RLS
+
Validation
+
Error Handling
+
Realtime where required
+
Backend logic where required
+
Testing
```

Do not mark unimplemented behavior as complete and do not use fake production data, fake payments, fake analytics, fake health indicators, or fake subscription state.

---

# 54. Final Architecture

```text
                         PLATFORM OWNER
                              |
                              v
                    +-------------------+
                    | MASTER DASHBOARD  |
                    |      React        |
                    +---------+---------+
                              |
                              v
                    +-------------------+
                    |     SUPABASE      |
                    | PostgreSQL        |
                    | Auth              |
                    | RLS               |
                    | Realtime          |
                    | Edge Functions    |
                    +---------+---------+
                              |
             +----------------+----------------+
             |                |                |
             v                v                v
       Restaurant A     Restaurant B     Restaurant C
             |                |                |
        +----+----+      +----+----+      +----+----+
        |         |      |         |      |         |
        v         v      v         v      v         v
      Admin     App    Admin     App    Admin     App
      React   Flutter  React   Flutter  React   Flutter
        \         /      \         /      \         /
         +-------+--------+--------+-------+-------+
                         |
                  Customer Website
                         |
                    Same Backend
                         |
                    Cloudflare R2
                    for media assets
```

The final platform must allow:

```text
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
Customers use White-Label App / Website
      ↓
Orders enter the unified order system
      ↓
Payment is processed securely
      ↓
Order status updates through Realtime
      ↓
Customer + Restaurant receive updates
      ↓
Master Dashboard sees platform analytics
```

## Non-negotiable principles

1. **Audit before implementation.**
2. **Preserve existing working UI.**
3. **One reusable white-label engine, not one codebase per restaurant.**
4. **One centralized tenant-aware backend.**
5. **RLS is the database security boundary.**
6. **Never trust client prices, roles, tenant IDs, payment state, or subscription state.**
7. **Payment secrets stay server-side.**
8. **Restaurant customer payments and SaaS subscription payments remain separate.**
9. **Suspension is access control, not data deletion.**
10. **Subscription enforcement is server-side.**
11. **Feature flags are separate from tenant suspension.**
12. **Use Realtime where required, not everywhere.**
13. **Do not introduce Redis until a real need exists.**
14. **Do not use fake production behavior.**
15. **Implement incrementally and verify every phase.**
16. **The architecture must remain suitable for commercial SaaS scale.**
