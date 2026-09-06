# Construction Supervision App — Expanded Product & Functional Guidelines

> **Document purpose:** Detailed product, domain, data-model, workflow, validation, reporting, and implementation guidelines for a single-user construction supervision application.
>
> This specification expands the original Construction Supervision App Guidelines while preserving its central operating principle: **client funds must be controlled project-by-project and must never be treated as the supervisor's unrestricted money.**

---

# 1. Product Vision

The Construction Supervision App is a focused financial-control and site-execution application for a construction supervisor managing private building projects.

The app is not intended to become a full construction ERP, accounting system, scheduling platform, or multi-party collaboration portal.

Its primary purpose is to answer, at any moment:

1. How much money has the client deposited?
2. How much of that money has already been committed?
3. How much is still available to spend?
4. How much more funding will be required?
5. What materials remain to be procured?
6. What labour remains unpaid?
7. What supervision fee has been earned or collected?
8. Are actual costs above or below the approved estimate?
9. Are there financial or operational issues that require attention?
10. Can the current stage be safely closed?

The application should therefore behave primarily as a **construction financial-control system with lightweight site execution records**.

---

# 2. Target User

## 2.1 Primary User

Single user:

- Construction supervisor
- Site engineer
- Project supervisor
- Small construction-project manager acting between private clients, suppliers, and subcontractors

The user manages one or more projects at the same time.

## 2.2 Authentication

Keep authentication deliberately simple.

Recommended:

- One account
- Magic-link login
- Optional PIN or biometric unlock on mobile if implemented later

Do not build:

- Client accounts
- Subcontractor accounts
- Supplier accounts
- Role-based permissions
- Organization workspaces

The system should nevertheless maintain a detailed audit history of financial changes.

---

# 3. Primary Devices and Usage

## Phone

Primary use:

- Checking project financial position
- Viewing available float
- Recording site notes
- Taking progress photos
- Uploading receipts
- Recording deliveries
- Checking outstanding procurement
- Checking labour balances
- Viewing alerts
- Reviewing funding requests

## Laptop / Desktop

Primary use:

- Creating projects
- Entering estimates
- Managing stage templates
- Building material take-offs
- Preparing funding requests
- Entering purchase orders
- Reconciling finances
- Producing reports
- Managing variations
- Reviewing project history

The UI must therefore be mobile-responsive but optimized for efficient desktop data entry.

---

# 4. Construction Operating Model

The supervisor sits between:

- The **client**, who owns the project and provides project funds
- **Subcontractors**, who provide labour
- **Suppliers**, who provide construction materials
- The **supervisor**, who manages procurement, labour disbursement, site coordination, and supervision

The normal cycle is:

1. Create the construction project.
2. Divide it into sequential stages.
3. Divide every stage into tasks.
4. Assign labour to subcontractors.
5. Enter labour-agreed amounts.
6. Prepare material take-offs for tasks.
7. Estimate material costs.
8. Add the supervision fee.
9. Generate a funding request.
10. Issue the funding request to the client.
11. Record client deposits.
12. Create purchase orders.
13. Procure materials.
14. Record deliveries.
15. Record supplier payments.
16. Pay subcontractors progressively.
17. Track site progress.
18. Record variations where scope changes.
19. Forecast additional funding requirements.
20. Reconcile the stage.
21. Close the stage.
22. Move to the next stage.

---

# 5. Core Financial Principle

Most money handled by the supervisor belongs to the client.

The application's most important responsibility is therefore:

> **Prevent money received for one project or purpose from being incorrectly treated as available money.**

Project balances must always be calculated independently.

Funds from Project A must never appear as available float for Project B.

---

# 6. Core Financial Positions

Every financial figure should reconcile to one or more of the following positions.

## 6.1 Client Position

Tracks:

- Funding requested
- Deposits received
- Supervisor fee
- Purchase orders
- Paid purchases
- Labour payments
- Other approved commitments
- Available float
- Forecast future shortfall

### Available Project Float

Recommended base formula:

```text
Available Float
=
Client Deposits
- Fee Portion Removed From Project Funds
- Open Purchase Commitments
- Paid Purchases
- Labour Payments
- Other Approved Project Commitments
```

Care must be taken not to double-count a purchase order and its resulting paid purchase.

A purchase commitment should move through states rather than being counted twice.

Recommended commitment states:

```text
Planned
→ Ordered
→ Partially Delivered
→ Delivered
→ Paid
→ Closed
```

Only the current financial exposure should count toward committed funds.

---

## 6.2 Material Position

Tracks:

- Estimated quantity
- Estimated unit cost
- Estimated total
- Revised estimated quantity
- Revised estimated unit cost
- Purchased quantity
- Delivered quantity
- Actual total cost
- Remaining requirement
- Variance

### Material Variance

```text
Material Variance
=
Approved Estimated Material Cost
- Actual Material Cost
```

Positive variance = saving.

Negative variance = overspend.

Commercial ownership of savings remains an explicit business decision.

---

## 6.3 Subcontractor Position

Tracks:

- Original agreed labour
- Approved variations
- Revised labour agreement
- Labour paid
- Retention, if applicable
- Outstanding labour liability

### Outstanding Labour

```text
Outstanding Labour
=
Revised Labour Agreement
- Labour Paid
- Retention Released Adjustments
```

---

## 6.4 Supervisor Fee Position

Tracks:

- Fee basis
- Fee amount
- Fee percentage
- Fee earned
- Fee invoiced
- Fee received
- Fee outstanding

The app must distinguish:

- Project funds
- Supervisor-owned fee funds

---

# 7. Supervisor Command Center

The application home page should operate as a **Supervisor Command Center**.

Each active project card should show:

- Project name
- Client
- Site
- Current stage
- Stage progress
- Total client deposits
- Total committed
- Available float
- Expected remaining cost
- Forecast funding shortfall
- Materials outstanding
- Labour outstanding
- Supervisor fee position
- Number of unresolved alerts

Example:

```text
Mbezi Beach Residence

Current Stage: Ground Floor
Stage Progress: 64%

Client Deposited        TZS 28,000,000
Committed               TZS 21,400,000
Available Float          TZS 6,600,000

Remaining Expected Cost  TZS 9,100,000
Funding Shortfall        TZS 2,500,000

Materials Outstanding    TZS 4,200,000
Labour Outstanding       TZS 2,800,000
Fee Outstanding          TZS   800,000

Alerts: 3
```

---

# 8. Financial Health Indicators

Every project should receive a financial status.

## Green

Available float comfortably covers expected short-term commitments.

## Amber

Available float is positive but expected near-term commitments may exceed it.

## Red

Project is underfunded or float is negative.

## Blue

Funding request issued and client deposit is pending.

The exact thresholds should be configurable later.

---

# 9. Funding Forecasting

The app should not only show current balances.

It should predict whether more money will be required.

## Forecast Formula

```text
Forecast Funding Requirement
=
Remaining Material Requirement
+ Remaining Labour Liability
+ Remaining Supervisor Fee
+ Approved Other Commitments
- Available Float
```

If the result is positive:

```text
Additional Funding Required
```

If the result is zero or negative:

```text
Current Funding Adequate
```

The forecast should be visible on:

- Dashboard
- Project overview
- Stage overview
- Funding screen

---

# 10. Project Financial Control Center

Each project should have a dedicated financial-control screen.

Recommended sections:

## Client Funds

- Funding requested
- Deposits received
- Fee removed
- Project commitments
- Available float

## Materials

- Original estimate
- Revised estimate
- Committed
- Actual paid
- Variance
- Remaining requirement

## Labour

- Original agreements
- Approved variations
- Revised agreements
- Paid
- Outstanding

## Supervisor Fee

- Fee expected
- Fee earned
- Fee received
- Fee outstanding

## Forecast

- Remaining expected cost
- Current available float
- Forecast shortfall / surplus

---

# 11. Project Structure

Recommended hierarchy:

```text
Project
└── Stage
    ├── Task
    │   ├── Material Lines
    │   ├── Labour Agreement
    │   ├── Subcontractor
    │   ├── Progress Photos
    │   └── Variations
    ├── Funding Requests
    ├── Procurement
    ├── Site Diary
    ├── Stage Documents
    └── Stage Closeout
```

---

# 12. Projects

## Core Fields

- ID
- Project name
- Client name
- Client phone
- Client email
- Site / location
- Currency
- Start date
- Expected completion date
- Project status
- Notes

Recommended statuses:

```text
Draft
Active
On Hold
Completed
Cancelled
Archived
```

---

# 13. Construction Stages

Typical examples:

- Preliminaries
- Foundation
- Ground Floor
- First Floor
- Second Floor
- Roofing
- External Works
- Finishes
- Services
- Handover

Fields:

- Stage name
- Sequence
- Status
- Start date
- Completion date
- Fee basis
- Fee amount
- Fee percentage
- Progress percentage
- Notes

Statuses:

```text
Planned
Active
Awaiting Funding
On Hold
Ready for Closeout
Completed
Cancelled
```

Only one stage should normally be active at a time unless intentionally overridden.

---

# 14. Tasks

Each stage contains tasks.

Examples:

- Excavation
- Foundation footing
- Foundation wall
- Hardcore filling
- Ground slab
- Blockwork
- Reinforcement
- Roofing
- Plastering
- Tiling
- Painting

Fields:

- Stage
- Description
- Sequence
- Assigned subcontractor
- Original labour agreement
- Revised labour agreement
- Start date
- Completion date
- Status
- Progress
- Notes

Statuses:

```text
Planned
Awaiting Funding
Ready
In Progress
Paused
Completed
Cancelled
```

---

# 15. Stage Templates

Stage templates are a core productivity feature.

A template should contain:

```text
Template
└── Stage
    └── Task
        └── Typical Material Lines
```

Example:

## Residential Foundation Template

### Excavation

Typical materials:

- Setting-out materials
- Timber pegs
- String line

### Footings

Typical materials:

- Cement
- Sand
- Aggregate
- Reinforcement
- Binding wire
- Timber
- Nails

### Foundation Wall

Typical materials:

- Blocks
- Cement
- Sand

### Backfilling

Typical materials:

- Approved fill
- Water

A new project should allow:

```text
New Project
→ Choose Template
→ Create Project
→ Adjust Quantities
→ Adjust Prices
```

After completing a project, allow:

> Update template using this project's actual structure.

Template updates should never automatically overwrite existing projects.

---

# 16. Material Take-Off

Every material line should support:

- Material
- Description
- Quantity
- Unit
- Estimated unit cost
- Estimated total
- Revised quantity
- Revised unit cost
- Revised total
- Purchased quantity
- Delivered quantity
- Remaining quantity
- Actual cost
- Cost variance

Recommended units:

- bag
- kg
- tonne
- m
- m²
- m³
- piece
- bundle
- litre
- truck
- load

Allow custom units.

---

# 17. Budget Versions

Never silently overwrite original estimates.

Maintain budget history.

Recommended versions:

```text
Original Estimate
Revision 1
Revision 2
Approved Estimate
Actual
```

For each revision store:

- Revision number
- Date
- Reason
- Changed by
- Previous value
- New value
- Approval status

Example:

```text
Cement

Original:
200 bags × 18,000
= TZS 3,600,000

Revision 1:
220 bags × 19,500
= TZS 4,290,000

Actual:
TZS 4,175,000
```

---

# 18. Funding Request Builder

Funding requests should be among the application's most polished workflows.

Workflow:

```text
Select Stage
→ Select Tasks
→ Pull Material Requirements
→ Add Labour Requirements
→ Calculate Supervision Fee
→ Review
→ Generate Funding Request
→ Issue to Client
```

Funding request should contain:

- Project
- Client
- Site
- Stage
- Request number
- Date
- Material breakdown
- Labour breakdown
- Supervisor fee
- Other approved charges
- Total requested
- Notes
- Payment instructions if required

---

# 19. Funding Request Versions

Funding requests should support versions.

Example:

```text
FR-004 v1
FR-004 v2
FR-004 v3
```

Never overwrite an already-issued request.

Statuses:

```text
Draft
Issued
Partially Funded
Funded
Superseded
Closed
Cancelled
```

If an issued request is changed:

- preserve the original
- create a new version
- record revision reason

---

# 20. Client Deposits

Fields:

- Funding request
- Amount
- Fee portion
- Project-fund portion
- Date received
- Method
- Reference
- Proof of payment
- Notes

Methods might include:

- Bank transfer
- Cash
- Mobile money
- Cheque
- Other

Allow multiple deposits against one funding request.

---

# 21. Procurement Workflow

Procurement should not begin only at the final payment stage.

Recommended workflow:

```text
Material Requirement
→ Purchase Order
→ Supplier Confirmation
→ Delivery
→ Payment
→ Close
```

---

# 22. Purchase Orders

Fields:

- PO number
- Project
- Stage
- Supplier
- Date
- Material lines
- Quantity ordered
- Unit price
- Expected total
- Expected delivery date
- Payment terms
- Status
- Notes

Statuses:

```text
Draft
Issued
Confirmed
Partially Delivered
Delivered
Partially Paid
Paid
Cancelled
Closed
```

Purchase orders count against available project float once they become an approved commitment.

---

# 23. Material Deliveries

A delivery should be separate from a payment.

Fields:

- Purchase order
- Supplier
- Delivery date
- Delivery note number
- Material
- Quantity delivered
- Quantity accepted
- Quantity rejected
- Delivery-note photo
- Site notes

This allows the system to distinguish:

```text
Ordered ≠ Delivered ≠ Paid
```

---

# 24. Purchases and Supplier Payments

Payment fields:

- Supplier
- Purchase order
- Invoice number
- Amount
- Payment date
- Payment method
- Payment reference
- Receipt / invoice image
- Notes

Allow:

- Deposit payment
- Partial payment
- Final payment

---

# 25. Supplier Register

Create a reusable supplier directory.

Fields:

- Supplier name
- Contact person
- Phone
- Email
- Location
- Materials supplied
- Payment terms
- Notes
- Status

Supplier profile should show:

- Total orders
- Total purchases
- Total paid
- Outstanding payable
- Recent orders
- Recent deliveries
- Attached documents

---

# 26. Subcontractor Register

Fields:

- Name
- Trade
- Phone
- Email
- Address
- Notes
- Status

Profile should show:

- Active projects
- Current tasks
- Total agreed labour
- Total paid
- Outstanding labour
- Payment history
- Completed tasks

---

# 27. Labour Agreements

Every assigned task should have a labour agreement.

Fields:

- Task
- Subcontractor
- Original agreed labour
- Revised agreed labour
- Retention percentage if applicable
- Start date
- Completion target
- Notes

Do not overwrite the original labour agreement after variations.

---

# 28. Labour Payments

Payment types:

```text
Advance
Interim
Final
Retention Release
Adjustment
```

Fields:

- Task
- Subcontractor
- Amount
- Type
- Paid on
- Method
- Reference
- Notes

Default rule:

```text
Total Labour Payments
<=
Revised Labour Agreement
```

An override must require:

- explicit confirmation
- reason
- audit entry

---

# 29. Variations / Change Orders

Construction scope changes must not be handled by editing historical records.

Create a formal variation module.

Examples:

- Additional room
- Increased wall height
- Client design change
- Extra reinforcement
- Material substitution
- Additional labour
- Quantity increase

Fields:

- Variation number
- Project
- Stage
- Task
- Description
- Reason
- Material impact
- Labour impact
- Fee impact
- Total impact
- Requested date
- Approval date
- Status
- Client reference
- Notes

Statuses:

```text
Draft
Submitted
Approved
Rejected
Funded
In Progress
Completed
Cancelled
```

Example:

```text
VO-003

Original Labour:     TZS 2,500,000
Additional Labour:   TZS   450,000
Revised Labour:      TZS 2,950,000
```

Approved variations should automatically update revised forecasts without deleting original values.

---

# 30. Site Diary

Add a lightweight daily site diary.

This is not intended to become a full construction inspection system.

Fields:

- Project
- Stage
- Date
- Weather
- Workers on site
- Main activities
- Materials received
- Major materials used
- Equipment used
- Delays
- Issues
- Instructions given
- Visitors
- Photos
- Notes

Example:

```text
04 Sep 2026

Workers on site: 14
Main work: Ground-floor blockwork
Cement used: 28 bags
Blocks used: 640
Delay: Rain stopped work at 3:20 PM
Photos: 6
```

The diary provides a chronological project record.

---

# 31. Progress Photos

Photos should be attachable to:

- Project
- Stage
- Task
- Site diary
- Purchase delivery
- Receipt
- Variation
- Stage closeout

Each progress photo should store:

- Date
- Project
- Stage
- Task
- Caption
- Category
- File URL
- Optional GPS coordinates
- Uploaded timestamp

Recommended photo categories:

```text
Progress
Material Delivery
Issue
Before
After
Receipt
Delivery Note
Variation
Closeout
```

GPS should be optional.

---

# 32. Documents

Project documents can include:

- Funding requests
- Supplier quotations
- Purchase orders
- Delivery notes
- Supplier invoices
- Receipts
- Client payment proofs
- Variation documents
- Labour agreements
- Stage closeout reports
- Progress photos
- Other supporting records

Documents should be searchable by:

- Project
- Stage
- Type
- Date
- Supplier
- Subcontractor

---

# 33. Project Alerts

The system should automatically generate actionable alerts.

Examples:

## Financial Alerts

- Negative project float
- Float below upcoming commitments
- Funding request overdue
- Client deposit incomplete
- Unallocated deposit
- Cost variance above threshold

## Procurement Alerts

- Material requirement not ordered
- Purchase order overdue
- Partial delivery outstanding
- Supplier invoice unpaid
- Missing receipt
- Missing delivery note

## Labour Alerts

- Labour payment exceeds agreement
- Final payment requested while task incomplete
- Stage complete with labour outstanding

## Control Alerts

- Completed task with unresolved variation
- Stage closeout blocked
- Missing mandatory reconciliation
- Duplicate reference number

Alerts should link directly to the record requiring action.

---

# 34. Financial Reconciliation Engine

Add a dedicated:

> **Run Financial Check**

The engine should test the current project for inconsistencies.

Recommended checks:

1. Client deposits reconcile to funding requests.
2. Deposits have valid project allocation.
3. Fee portion is excluded from project float.
4. Purchase commitments reconcile to purchase orders.
5. Paid purchases reconcile to supplier payments.
6. Procurement does not exceed material requirements without explanation.
7. Labour payments do not exceed approved labour.
8. Completed tasks have no unexplained labour balances.
9. Negative float is highlighted.
10. Missing receipts are identified.
11. Missing delivery notes are identified.
12. Duplicate supplier invoices are flagged.
13. Duplicate payment references are flagged.
14. Outstanding purchase orders are identified.
15. Unallocated client funds are identified.
16. Variations without approval are identified.
17. Closed stages have no unresolved commitments.

Example output:

```text
PROJECT FINANCIAL CHECK

Reconciliation Score: 96%

Passed: 24
Warnings: 2
Critical Issues: 0

Warnings:
- Purchase PO-034 missing supplier receipt
- Task GF-07 has TZS 350,000 labour outstanding
```

The reconciliation score is informational, not an accounting certification.

---

# 35. Stage Closeout

A stage should not simply be marked "Complete."

Use a controlled closeout workflow.

## Closeout Checklist

### Work

- All required tasks completed
- Outstanding variations resolved

### Materials

- Purchases reconciled
- Deliveries reconciled
- Remaining quantities reviewed
- Surplus materials recorded

### Labour

- Labour agreements reconciled
- Labour payments reconciled
- Retention identified
- Outstanding balances resolved

### Client Funds

- Deposits reconciled
- Current float calculated
- Stage surplus / shortfall identified

### Supervisor Fee

- Fee calculated
- Fee earned
- Fee received / outstanding identified

### Documents

- Relevant receipts attached
- Delivery notes attached
- Funding-request record preserved

Once all mandatory checks pass:

```text
Close Stage
```

After closeout optionally offer:

```text
Create Next Stage
Create Next Stage Funding Request
Carry Forward Approved Surplus Materials
Carry Forward Approved Client Float
```

---

# 36. Surplus Material Handling

At stage closeout, the app should allow surplus materials to be:

```text
Consumed
Carried Forward
Returned to Supplier
Transferred Within Same Project
Written Off
```

Materials must not be transferred between different client projects without an explicit accounting adjustment.

---

# 37. Project Closeout

At final project completion, perform a full reconciliation.

Project closeout should summarize:

- Total client funding
- Total material commitments
- Total actual material cost
- Total labour agreements
- Total labour paid
- Total fees
- Approved variations
- Remaining client float
- Supplier balances
- Subcontractor balances
- Outstanding documents
- Final project variance

Project status becomes:

```text
Completed
```

then later optionally:

```text
Archived
```

---

# 38. Reports

The app should provide useful operational reports rather than a large accounting suite.

## Project Financial Summary

Shows:

- Funding requested
- Funding received
- Fees
- Commitments
- Payments
- Available float
- Forecast shortfall
- Stage-by-stage summary

## Material Cost Report

Shows:

- Estimated
- Revised
- Actual
- Variance

## Procurement Report

Shows:

- Required
- Ordered
- Delivered
- Paid
- Outstanding

## Labour Report

Shows:

- Subcontractor
- Task
- Agreed
- Revised
- Paid
- Outstanding

## Funding Report

Shows:

- Request
- Amount requested
- Amount deposited
- Balance
- Status

## Variation Report

Shows:

- Variation
- Original scope impact
- Additional cost
- Approval status
- Funding status

## Supplier Statement

Shows:

- Orders
- Invoices
- Payments
- Outstanding balance

## Subcontractor Statement

Shows:

- Agreed labour
- Variations
- Payments
- Outstanding balance

## Stage Closeout Report

Shows:

- Stage budget
- Actual cost
- Material variance
- Labour position
- Fee position
- Client-fund position
- unresolved notes

---

# 39. Dashboard Reporting

The home dashboard should also aggregate:

- Active projects
- Total client funds held
- Total project commitments
- Total available float
- Total outstanding supplier liabilities
- Total outstanding subcontractor liabilities
- Total expected supervision fees
- Total funding shortfall across projects

Important:

Although dashboard totals may aggregate projects for management visibility, **funds must never be treated as transferable between projects**.

---

# 40. Audit Trail

Financial records must never disappear silently.

Maintain an activity ledger.

Example:

```text
04 Sep 14:35
Purchase PO-034 created

04 Sep 14:41
Expected cost changed
TZS 850,000 → TZS 875,000

04 Sep 15:02
Receipt attached

04 Sep 15:06
Payment marked paid
```

Audit fields should include:

- Event
- Record type
- Record ID
- Previous value
- New value
- Timestamp
- Reason where applicable

---

# 41. Record Deletion Policy

Financial records should normally never be hard deleted.

Use:

```text
Void
Cancel
Supersede
Archive
```

instead.

Examples:

- Funding request → cancel or supersede
- Purchase order → cancel
- Payment → void
- Variation → cancel
- Deposit → void
- Invoice → void

The original values remain visible in history.

---

# 42. Core Validation Rules

The following rules should be enforced at application or database level.

1. Stage sequence must be unique within a project.
2. Project currencies cannot change after financial transactions exist without administrative migration.
3. Labour payments cannot exceed revised labour agreement without override.
4. A completed stage cannot have unresolved mandatory labour balances.
5. Purchase commitments cannot silently exceed available funding.
6. Purchases against unfunded requests require an explicit warning and reason.
7. Negative float must remain visible.
8. Issued funding requests cannot be edited in place.
9. Approved variations cannot be deleted.
10. Paid transactions cannot be deleted.
11. Cross-project fund allocation is prohibited.
12. Material quantities should not exceed approved requirement without acknowledgement.
13. Duplicate financial references should produce warnings.
14. A closed stage cannot accept normal new transactions without reopening.
15. Stage closeout requires reconciliation.

---

# 43. Negative Float Handling

Negative float must never be hidden.

If a supervisor fronts project costs personally:

```text
Project Float: -TZS 1,250,000
```

Show:

> Supervisor funds have temporarily financed this project.

A subsequent client deposit should correct the negative balance.

Do not silently convert the difference into another project balance.

---

# 44. Additional Funding Request

When forecast shortfall is positive, allow:

```text
Prepare Additional Funding Request
```

The system should suggest the required value based on:

- Outstanding material quantities
- Labour liabilities
- Approved variations
- Remaining supervision fees
- Existing float

The supervisor can edit the final amount before issue.

---

# 45. Search and Filters

Global search should find:

- Project
- Client
- Supplier
- Subcontractor
- Purchase order
- Funding request
- Material
- Payment reference
- Invoice
- Variation

Common filters:

- Project
- Stage
- Date
- Status
- Supplier
- Subcontractor
- Document type

---

# 46. Numbering Conventions

Use project-readable reference numbers.

Examples:

```text
Project             PRJ-2026-001
Funding Request     FR-2026-001-04
Purchase Order      PO-2026-001-018
Variation           VO-2026-001-003
Supplier Payment    SP-2026-001-042
Labour Payment      LP-2026-001-016
Stage Closeout      SC-2026-001-02
```

The exact pattern may be configurable later.

Numbers should remain unique and immutable.

---

# 47. Suggested Navigation

Main navigation:

```text
Dashboard
Projects
Funding
Procurement
Labour
Reports
Contacts
Templates
Settings
```

---

# 48. Project Navigation

Inside a project:

```text
Overview
Stages
Money
Materials
Labour
Funding
Procurement
Variations
Site Diary
Documents
Activity
```

---

# 49. Project Overview Screen

The project overview should prioritize decision-making.

Top section:

```text
PROJECT FINANCIAL POSITION

Client Deposited       TZS 62,000,000
Project Commitments    TZS 48,400,000
Supervisor Fee         TZS  3,100,000
Available Float        TZS 10,500,000

Remaining Expected     TZS 14,200,000

Funding Shortfall      TZS  3,700,000
```

Then show:

- Current stage
- Progress
- Procurement status
- Labour position
- Funding status
- Recent site activity
- Alerts

---

# 50. Data Model — Expanded

The following model is indicative and should be normalized appropriately.

## projects

```text
id
project_code
name
client_name
client_phone
client_email
site
currency
started_on
expected_completion_on
completed_on
status
notes
created_at
updated_at
```

## stages

```text
id
project_id
name
seq
fee_basis
fee_amount
fee_percent
started_on
completed_on
progress_percent
status
notes
created_at
updated_at
```

## tasks

```text
id
stage_id
subcontractor_id
description
seq
labour_original
labour_revised
retention_percent
started_on
completed_on
progress_percent
status
notes
created_at
updated_at
```

## subcontractors

```text
id
name
trade
phone
email
address
notes
status
created_at
updated_at
```

## suppliers

```text
id
name
contact_person
phone
email
location
payment_terms
notes
status
created_at
updated_at
```

## material_lines

```text
id
task_id
item
description
qty_original
qty_revised
unit
est_unit_cost_original
est_unit_cost_revised
created_at
updated_at
```

## funding_requests

```text
id
request_number
project_id
stage_id
version
supersedes_request_id
issued_on
status
notes
created_at
updated_at
```

## funding_request_lines

```text
id
request_id
line_type
source_id
description
qty
unit
unit_cost
amount
created_at
```

`line_type` may be:

```text
material
labour
fee
variation
other
```

## deposits

```text
id
request_id
project_id
amount
fee_portion
project_portion
received_on
method
reference
proof_url
status
notes
created_at
updated_at
```

## purchase_orders

```text
id
po_number
project_id
stage_id
supplier_id
issued_on
expected_delivery_on
status
payment_terms
notes
created_at
updated_at
```

## purchase_order_lines

```text
id
purchase_order_id
material_line_id
qty
unit_price
amount
created_at
updated_at
```

## deliveries

```text
id
purchase_order_id
supplier_id
delivered_on
delivery_note_number
delivery_note_url
notes
created_at
updated_at
```

## delivery_lines

```text
id
delivery_id
purchase_order_line_id
qty_delivered
qty_accepted
qty_rejected
notes
created_at
```

## supplier_payments

```text
id
purchase_order_id
supplier_id
amount
payment_kind
paid_on
method
reference
invoice_number
receipt_url
status
notes
created_at
updated_at
```

## labour_payments

```text
id
task_id
subcontractor_id
amount
kind
paid_on
method
reference
status
notes
created_at
updated_at
```

## variations

```text
id
variation_number
project_id
stage_id
task_id
description
reason
material_impact
labour_impact
fee_impact
total_impact
requested_on
approved_on
status
notes
created_at
updated_at
```

## site_diary_entries

```text
id
project_id
stage_id
entry_date
weather
workers_on_site
activities
materials_used
equipment_used
delays
issues
instructions
visitors
notes
created_at
updated_at
```

## attachments

```text
id
project_id
stage_id
task_id
entity_type
entity_id
category
file_url
caption
gps_lat
gps_lng
captured_on
created_at
```

## audit_events

```text
id
project_id
entity_type
entity_id
action
old_value_json
new_value_json
reason
created_at
```

## stage_closeouts

```text
id
stage_id
financial_check_status
materials_reconciled
labour_reconciled
documents_reconciled
fee_reconciled
client_funds_reconciled
closed_on
notes
created_at
updated_at
```

---

# 51. Derived Financial Views

Whenever possible, create database views or server-side calculation functions for important balances.

Recommended:

```text
project_financial_position
stage_financial_position
task_labour_position
material_procurement_position
supplier_position
subcontractor_position
funding_request_position
```

Do not scatter critical financial formulas throughout UI components.

There should be one authoritative calculation path.

---

# 52. Recommended Technology Stack

- Next.js App Router
- TypeScript
- Supabase Postgres
- Supabase Storage
- Tailwind CSS
- Vercel

Optional additions:

- React Hook Form
- Zod
- TanStack Table
- PDF generation library
- Chart library for simple financial visualizations

Money:

```text
numeric(14,2)
```

Never use floating-point numbers for financial values.

Currency is defined once per project.

Default:

```text
TZS
```

Dates where time is irrelevant:

```text
date
```

Audit events:

```text
timestamp with time zone
```

---

# 53. File Storage

Recommended storage buckets:

```text
receipts/
delivery-notes/
funding-requests/
supplier-invoices/
progress-photos/
variations/
payment-proofs/
closeout-documents/
```

Files should be organized by project IDs rather than relying only on filenames.

---

# 54. Offline Considerations

The original product scope excludes full offline mode.

Maintain that restriction for the first release.

However, mobile forms should:

- avoid losing draft text easily
- preserve unsent form data during temporary page interruption where practical
- optimize uploaded images
- show upload progress

A true offline synchronization engine should remain a later-phase feature.

---

# 55. Performance Requirements

Site connectivity may be unreliable.

Therefore:

- Project dashboard should load quickly.
- Images should be thumbnails by default.
- Full-resolution attachments should load on demand.
- Avoid loading all project history at once.
- Paginate long activity logs.
- Cache stable reference lists where appropriate.
- Keep primary financial calculations server-side and efficient.

---

# 56. User Experience Principles

## Principle 1 — Money First

Available float and funding status must be visible before decorative project information.

## Principle 2 — Exception Driven

The system should highlight what needs action rather than requiring the user to inspect every table.

## Principle 3 — Preserve History

Do not overwrite issued or approved financial records.

## Principle 4 — Reduce Re-entry

Templates, reusable contacts, automatic calculations, and previous values should reduce manual typing.

## Principle 5 — Mobile Readability

A supervisor should understand the financial state of a project from a phone within seconds.

---

# 57. Recommended MVP

Do not build everything simultaneously.

## Phase 1 — Financial Backbone

Build:

1. Projects
2. Stages
3. Tasks
4. Subcontractors
5. Material take-offs
6. Funding request builder
7. Funding request PDF
8. Deposits
9. Available float
10. Purchase orders
11. Supplier payments
12. Labour payments
13. Stage fee
14. Project financial overview

### Validation Gate

Enter one real completed construction stage.

Verify:

- funding
- deposits
- materials
- supplier payments
- labour
- fee
- final float

Do not proceed until the figures reconcile.

---

# 58. Phase 2 — Operational Control

Add:

1. Suppliers
2. Delivery tracking
3. Purchase-order status
4. Stage templates
5. Budget revisions
6. Progress photos
7. Document attachments
8. Alerts
9. Supplier statements
10. Subcontractor statements

---

# 59. Phase 3 — Change & Forecast Control

Add:

1. Variations
2. Additional funding forecast
3. Funding-shortfall warnings
4. Funding-request versions
5. Budget variance analysis
6. Project reconciliation engine
7. Stage closeout

---

# 60. Phase 4 — Site History & Reporting

Add:

1. Site diary
2. Progress-photo timeline
3. Stage closeout reports
4. Project closeout
5. Comprehensive activity history
6. Advanced reporting dashboard

---

# 61. Explicit Non-Goals for Initial Product

Do not turn the app into a generic enterprise construction platform.

Out of scope:

- Client login
- Subcontractor login
- Supplier login
- Complex multi-user permissions
- Gantt charts
- Critical-path scheduling
- Workforce attendance
- Payroll
- Full accounting integration
- General ledger
- Tax filing
- Inventory warehouse ERP
- Heavy quality-inspection workflows
- Full snagging module
- Safety-management system
- BIM
- Drawing revision management
- Multi-currency transactions within one project
- Full offline synchronization

The lightweight Site Diary and progress photos are intentional exceptions because they directly support the supervisor's financial and execution records.

---

# 62. Open Commercial Decisions

The following decisions must remain explicit.

## 62.1 Material Estimate Model

Is the client's material estimate:

- a budget, or
- a fixed-price procurement allowance?

This determines ownership of savings.

---

## 62.2 Supervisor Fee Collection

Is the fee:

- included in the funding request, or
- invoiced separately?

---

## 62.3 Fee Recognition

Is the fee earned:

- when stage funding is received,
- progressively,
- or at stage completion?

---

## 62.4 Labour Retention

Is retention used?

If yes:

- percentage
- release conditions
- release date

must be recorded.

---

## 62.5 Multiple Subcontractors per Task

Default assumption:

```text
One task → one subcontractor
```

If actual practice requires multiple subcontractors, introduce task work packages rather than creating ambiguous payment ownership.

---

## 62.6 Surplus Materials

Decide whether surplus materials:

- carry forward
- return to supplier
- remain physically tracked
- are written off

---

# 63. Success Criteria

The application is successful when the supervisor can answer the following without opening a spreadsheet:

> How much money from Client A is still available?

> What has already been committed?

> What supplier payments remain outstanding?

> What materials remain to be bought?

> Which subcontractors are still owed money?

> Has this stage exceeded its approved budget?

> What changed after the client approved the original scope?

> How much more funding should I request?

> Can I close this stage without leaving unresolved financial obligations?

> Can I explain every major financial movement later?

---

# 64. Product North Star

The application's most important screen should communicate:

```text
PROJECT FINANCIAL POSITION

Client Deposited        TZS 62,000,000
Project Commitments     TZS 48,400,000
Supervisor Fee          TZS  3,100,000
Available Float         TZS 10,500,000

Remaining Expected Cost TZS 14,200,000
Additional Funding      TZS  3,700,000
```

This is the product's central promise:

> **The supervisor always knows where every client's money stands, what it is committed to, and what financial action must happen next.**
