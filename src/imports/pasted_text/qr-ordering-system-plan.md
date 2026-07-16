RIZQARA RESTAURANT — QR Table Ordering System (Full System Plan)
Core Idea (Your Concept — Structured)

Every table has:

Table Number
QR Code
Guest Menu Access (No login)

Customer flow:

Customer sits at table
Scans QR code
Menu opens instantly
Customer selects food
Places order
Kitchen receives order
Food prepared and served
Invoice generated
Customer pays
Order saved in database

Exactly like modern restaurants.

1) Admin Panel — NEW SECTION
Section Name

Table Management

This is where the restaurant layout and tables are controlled.

TABLE MANAGEMENT DASHBOARD

Shows:

Restaurant Layout
All Tables
Table Status
QR Codes

Table Card Structure

Each table will show:

Table Number
QR Code
Status
Capacity
Current Order

Example:

Table 01
Seats: 4
Status: Available

Table Status Types

Available
Occupied
Ordering
Cooking
Served
Paid

2) Restaurant Layout System (Visual Map)

You said:

show the full restaurant structure like where is the table

So we build a visual floor layout, not just a list.

Layout Example

Dining Hall

Table 01
Table 02
Table 03

VIP Room

Table 04
Table 05

Outdoor

Table 06

Admin Actions

Admin can:

Add table
Move table
Rename table
Delete table
Change capacity

3) QR Code System

Every table gets a unique QR code.

Example QR URL

rizqararestaurant.com/menu/table-01

rizqararestaurant.com/menu/table-02

rizqararestaurant.com/menu/table-03

What QR Code Opens

Guest Menu Mode

No login
No account
No password

Just menu.

QR Code Features

Unique per table
Printable
Downloadable
Regeneratable

4) Guest Mode Ordering System

This is the heart of the feature.

When Customer Scans QR

System detects:

Table Number

Example:

Table 05

Header Shows

Table 05

Welcome to Rizqara Restaurant

Customer Can:

View menu
Add items
Change quantity
Remove items
Add notes

Example:

Less spicy
No onion
Extra sauce

5) Order Flow (Exact System Logic)
Step 1 — Add Items

Customer selects:

Chicken Kebab
2 pcs

Fried Rice
1 plate

Step 2 — Cart

Shows:

Items
Quantity
Total price

Step 3 — Place Order

Button:

Place Order

Step 4 — Confirmation Screen

Message:

Thank you for your order
Please wait while we prepare your food show a countdown for cooking UI like cook staring 

Status:

Order Received

6) Admin Order System

When order is placed:

Admin instantly receives notification. 

Admin Dashboard — Orders Panel

Shows:

Table Number
Order Items
Time
Status

Example Order

Table 03

Chicken Kebab — 2
Fried Rice — 1

Total: 450 BDT

Status:

Pending

Admin Can Change Status

Pending
Confirmed
Cooking
Ready
Served
Paid

7) Kitchen Display System (Optional but Powerful)

This is what professional restaurants use.

Kitchen Screen Shows

Table Number
Items
Time
Status

Example:

Table 04

Beef Kebab
Fried Rice

Status:

Cooking

8) Invoice System

After food is served:

System generates invoice automatically.

Invoice Includes

Order ID
Table Number
Items
Quantity
Price
Total
Date
Time

Example

Invoice

Table: 05

Chicken Kebab — 2 — 240 BDT
Fried Rice — 1 — 180 BDT

Total: 420 BDT

Admin Options

Print invoice
Download PDF
Mark as paid

9) Payment Handling

Payment is manual at the table or counter.

Payment Types

Cash
bKash
Nagad

After Payment

Status changes to:

Paid

System Automatically

Saves order
Stores invoice
Updates sales

10) Database Structure (Simple & Real)
TABLES COLLECTION

id
table_number
capacity
status
qr_code

ORDERS COLLECTION

id
table_number
items
total
status
created_at

ORDER ITEMS COLLECTION

id
order_id
product_id
quantity
price

11) Admin Panel under table management 


12) Real-Time Features (Important)
Notifications

Admin receives:

New order alert

Status Updates

Customer sees:

Order received
Cooking
Ready
Served

13) Security & Rules

Customer cannot:

Access admin panel
Edit orders
Delete orders

Admin can:

Manage tables
Confirm orders
Print invoices
View history

14) UI Design — Table Layout Example
Admin Screen

Restaurant Floor Layout

[ T01 ] [ T02 ] [ T03 ]

[ T04 ] [ T05 ] [ T06 ]

Color Status

Green — Available
Orange — Ordering
Red — Occupied
Blue — Cooking


Table UI — The Core Concept

This screen is basically a live restaurant map where staff can instantly see:

Where each table is
Which table is busy
Which table placed an order
Which table is waiting for food
Which table is paid

Think of it like a control center for the restaurant.

1) Table UI Layout Structure
Page Layout

Top Bar
Sidebar
Main Floor Layout

----------------------------------------
Sidebar |      Restaurant Floor
        |
        |   [ T01 ]   [ T02 ]   [ T03 ]
        |
        |   [ T04 ]   [ T05 ]   [ T06 ]
        |
        |   [ T07 ]   [ T08 ]   [ T09 ]
----------------------------------------
2) Table Card Design (The Box You See)

Each table is a card.

Table Card Must Show

Table Number
Seats
Status
Total Amount
Timer

Example Table Card
------------------------
Table 05

Seats: 4

Status: Cooking

Total: 650 BDT

Time: 12 min
------------------------
3) Table Status Colors (Very Important)

Users should understand status instantly — no reading needed.

Green
Available

Orange
Ordering

Blue
Cooking

Purple
Ready

Red
Occupied

Gray
Paid

Example
[ T01 ]  → Green → Available
[ T02 ]  → Orange → Ordering
[ T03 ]  → Blue → Cooking
[ T04 ]  → Red → Occupied
4) Table UI — Real Restaurant Layout

Don’t just list tables.

Show the real physical layout.

Example Layout

Dining Area

[ T01 ]   [ T02 ]   [ T03 ]

[ T04 ]   [ T05 ]   [ T06 ]

VIP Room

[ V01 ]   [ V02 ]

Outdoor

[ O01 ]   [ O02 ]
5) Table UI — Responsive Grid

Use:

CSS Grid

Example:

grid-template-columns:
repeat(auto-fit, minmax(160px, 1fr));

This automatically adjusts for:

Desktop
Tablet
Mobile

6) Table UI — Click Behavior

When staff clicks a table:

A panel opens.

On Click — Show Table Details

Table Number
Status
Orders
Total
Actions

Example Panel
Table 05

Orders:

Chicken Kebab ×2
Fried Rice ×1

Total:

450 BDT

Buttons:

Confirm Order
Start Cooking
Mark as Served
Mark as Paid
7) Table UI — Add Table Button

Top-right corner.

Button:

Add Table

Add Table Form

Table Number
Seats
Area

Example:

Table Number: 07
Seats: 4
Area: Dining

8) Table UI — Drag & Drop Layout (Premium Feature)

Admin can move tables visually.

Example:

Drag:

T05

Move to:

VIP Area

Tools you can use:

React DnD
Framer Motion

9) Table UI — Timer System

Every active table shows time.

Example:

Time:

12 min

This helps staff know:

How long customer has been waiting.

10) Table UI — Real-Time Updates

When customer orders:

The table status changes automatically.

Status Flow

Available
↓
Ordering
↓
Cooking
↓
Ready
↓
Served
↓
Paid

11) Table UI — Backend Data Structure

Simple and clean.

Table Object
{
  id: 1,
  tableNumber: "T05",
  seats: 4,
  area: "Dining",
  status: "Cooking",
  total: 450
}
12) Table UI — Example React Component Structure
components/

TableGrid.jsx
TableCard.jsx
TableDetailsModal.jsx
AddTableModal.jsx

our restaurant have 10 table now 