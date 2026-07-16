INVENTORY SYSTEM (Stock Management)

Inventory means all physical stock used in restaurant operations.

For PIZZORA, inventory has 5 major sections:

Raw Materials
Stock Movement
Recipe Consumption
Purchase Management
Waste / Damage Tracking
1. Raw Material Master

First, create master inventory list.

Examples for PIZZORA:

Pizza Ingredients
Flour
Yeast
Mozzarella Cheese
Pizza Sauce
Pepperoni
Mushroom
Chicken
Capsicum
Onion
Burger Ingredients
Bun
Patty
Mayo
Lettuce
Tomato
Drinks
Coffee beans
Milk
Sugar
Ice cream
Chocolate syrup
Packaging
Pizza box
Paper bag
Tissue
Sauce cup
Inventory Item Fields

Each stock item must store:

Field	Example
Item ID	INV001
Name	Mozzarella Cheese
SKU	CHE-001
Category	Dairy
Unit	Kg
Supplier	ABC Foods
Cost Price	900/kg
Current Stock	18kg
Min Stock	5kg
Max Stock	50kg
Reorder Level	7kg
Expiry Date	12/07/2026
2. Inventory Categories

Recommended categories for PIZZORA:

Food Raw Materials

Used in cooking

Beverages

Coffee, syrup

Packaging

Boxes, cups

Cleaning

Detergent, sanitizer

Kitchen Supplies

Foil, gloves

Utility Consumables

Gas cylinders

3. Unit Management

Important.

Different products use different units.

Examples:

Weight:

Gram
Kg

Liquid:

ml
Liter

Count:

Piece
Packet
Box

Example conversion:

1 Kg = 1000 gram
1 Liter = 1000 ml

Needed because purchases and recipes use different units.

4. Stock Opening

When system starts, enter initial stock.

Example:

Cheese = 20kg
Chicken = 30kg
Flour = 100kg

This becomes opening balance.

Formula:

Closing Stock =
Opening + Purchase − Consumption − Waste

5. Stock Movement

Every stock movement must be recorded.

Types:

Stock IN

Inventory increases.

Examples:

Purchase
Return
Transfer received
Stock OUT

Inventory decreases.

Examples:

Cooking
Waste
Damage
Transfer sent

Example movement log:

Date	Item	Type	Qty
12 Jun	Cheese	Purchase	+20kg
12 Jun	Cheese	Sales usage	-3kg
6. Purchase Management

Track daily buying.

Example:

Morning market purchase.

Need:

Purchase ID
Supplier
Date
Invoice number
Product list
Quantity
Price
Purchase Order Flow
Purchase Request
↓
Manager Approval
↓
Purchase Order
↓
Goods Received
↓
Stock Updated
↓
Supplier Payment
Purchase Example

Supplier: Fresh Foods Ltd

Products:

Chicken 50kg
Cheese 20kg
Sauce 10L

Total: 62,000 BDT

System auto updates stock.

7. Supplier Management

Need supplier database.

Fields:

Supplier ID
Company Name
Contact Person
Phone
Email
Address
Payment Terms

Track:

Total purchased
Total paid
Due amount

Example:

ABC Supplier
Purchased: 120,000
Paid: 90,000
Due: 30,000

8. Recipe Mapping

Critical.

Without recipe mapping inventory cannot automate.

Example:

Pepperoni Pizza (10 inch)
Ingredient	Quantity
Dough	1
Cheese	150g
Sauce	80g
Pepperoni	100g

If 5 pizzas sold:

Cheese deduction:

150 × 5 = 750g

Stock auto deduct.

9. Production / Prep Stock

Restaurant prepares semi-finished items.

Examples:

Pizza dough
Sauces
Chopped vegetables

Track prep stock separately.

Example:

Morning:
Prepare 80 dough balls

Used today:
65

Remaining:
15

10. Low Stock Alert

System alerts manager.

Example:

Cheese stock = 3kg
Minimum = 5kg

Alert:
LOW STOCK

Notifications:

Dashboard
Email
SMS
11. Expiry Management

Very important.

Track expiry.

Examples:

Milk
Cheese
Meat

Alert:

Expiring today
Expiring in 3 days
12. Batch / Lot Tracking

Advanced.

Example:

Cheese batch:
CHE-2026-001

Track:

Supplier
Purchase date
Expiry

Useful during quality issues.

13. Waste Management

Very important for real profit.

Waste types:

Burnt food
Spoiled ingredients
Expired items
Customer returns

Example:

Burnt pizza:
Cost loss = 250 BDT

Track:

Item
Qty
Reason
Staff
Cost
14. Stock Audit / Physical Count

Sometimes system ≠ actual stock.

Need physical verification.

Example:

System says cheese = 10kg
Actual = 8kg

Difference = -2kg

Adjustment required.

Audit frequency:

Daily
Weekly
Monthly
EXPENSE MANAGEMENT

Now money outflow.

Expenses = all non-inventory spending.

Expense Categories

Recommended categories:

1. Utilities
Electricity
Gas
Water
Internet
2. Salary

Employee payroll

3. Rent

Branch rent

4. Marketing
Facebook ads
Banners
Campaigns
5. Maintenance
AC repair
Oven service
6. Packaging

Boxes, tissues

7. Cleaning

Cleaning materials

8. Transport

Delivery fuel

9. Software

Hosting, domain, ERP

10. Miscellaneous

Other expenses

Expense Entry Fields

Every expense:

Field	Example
Expense ID	EXP001
Category	Utility
Subcategory	Electricity
Branch	Sylhet
Amount	12,000
Date	1 June
Payment Method	Cash
Invoice	Bill copy
Recurring Expenses

Monthly auto-generated.

Examples:

Rent
Internet
Salary

Set recurrence:

Weekly
Monthly
Yearly
Approval Workflow

For security.

Example:

Expense entered by manager
↓

Owner approves
↓

Payment released

PAYROLL SYSTEM

Employee salary management.

Employee Data

Need:

Employee ID
Name
Role
Salary
Join date
Shift
Salary Components

Salary =

Basic

Bonus
Overtime
− Deduction
− Fine

Example:

Basic = 20,000
Bonus = 2,000
Late fine = 500

Net = 21,500

Payment Methods
Cash
Bank
bKash

Generate salary slip.

ASSET MANAGEMENT

Assets = long-term property.

Examples:

Oven
Refrigerator
AC
Tables
Chairs
Printer

Fields:

Asset ID
Name
Cost
Purchase date
Warranty
Maintenance history

Status:

Active
Repair
Retired
FINANCE / ACCOUNTING

Now business numbers.

Revenue

Money IN.

Sources:

POS sales
Online orders
Delivery
Expenses

Money OUT.

Sources:

Purchase
Utility
Salary
Rent
Cost of Goods Sold (COGS)

Cost to produce sold food.

Example:

Pizza sold at 600
Ingredient cost = 220

COGS = 220

Gross Profit

Formula:

Gross Profit = Revenue − COGS

Example:

Revenue = 100,000
COGS = 40,000

Gross Profit = 60,000

Net Profit

Formula:

Net Profit = Revenue − COGS − Expenses

Example:

Revenue = 100,000
COGS = 40,000
Expenses = 25,000

Net Profit = 35,000

Daily Closing Report

At end of day calculate:

Sales

Today total revenue

Purchase

Today bought inventory

Expense

All expenses

Waste Loss

Food wasted

Profit

Actual profit

Example:

Sales = 50,000
Purchase = 10,000
Expense = 8,000
Waste = 2,000

Profit = 30,000

Dashboard Analytics

Owner dashboard should show:

Today
Sales
Orders
Expenses
Profit
This Month
Revenue
Expense
Growth %
Alerts
Low stock
Due payments
Expiry
Final Finance Flow

Complete flow:

Purchase inventory
↓
Stock increases
↓
POS sells food
↓
Recipe deducts stock
↓
Revenue increases
↓
Expenses recorded
↓
Profit calculated
↓
Reports generated