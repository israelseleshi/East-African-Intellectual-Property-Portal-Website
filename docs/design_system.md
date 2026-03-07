
# **DESIGN_SYSTEM.md**

## **1. Visual Foundation (Apple Human Interface Guidelines)**

The system will adopt a **"Pro"** aesthetic: minimal, functional, and deeply focused on content over decoration.

### **1.1 Color Palette**

| Element | Light Mode | Dark Mode | Usage |
| --- | --- | --- | --- |
| **Background** | `#F5F5F7` (System Gray 6) | `#000000` | Main window background |
| **Surface** | `#FFFFFF` | `#1C1C1E` (System Gray 4) | Cards, sidebars, and modals |
| **Primary** | `#007AFF` (Apple Blue) | `#0A84FF` | Primary actions, status indicators |
| **Success** | `#34C759` | `#30D158` | "Registered" status, paid invoices |
| **Warning** | `#FF9500` | `#FF9F0A` | Upcoming deadlines (30 days) |
| **Critical** | `#FF3B30` | `#FF453A` | Past due deadlines, office actions |

### **1.2 Typography**

* **Primary Font:** San Francisco (System UI).
* **Secondary Font:** New York (Apple Serif) — *Used sparingly for legal document headers to provide a "official" feel.*
* **Sizing:**
* **Large Title:** 34pt (Bold)
* **Headline:** 17pt (Semibold)
* **Body:** 15pt (Regular)
* **Caption:** 12pt (Regular) — *Used for metadata and help text.*



---

## **2. Component Architecture (Shadcn + Cult UI)**

### **2.1 The "Glass" Sidebar**

* **Interaction:** Uses `backdrop-blur-md` with a subtle `1px` border.
* **Organization:** Categorized into "Dashboard," "Inventory," "Deadlines," and "Finance."

### **2.2 High-Density Data Tables**

* **Logic:** Lawyers need to see 20+ rows at once without scrolling.
* **Features:** - Status Badges: Color-coded according to the state machine.
* Jurisdiction Icons: Flags for Ethiopia, Kenya, etc., for instant recognition.



### **2.3 Command Palette (Cmd + K)**

* 
**Power Feature:** A central search bar that allows the lawyer to type "Betpawa" and jump directly to that case detail.



---

## **3. UX Principles**

### **3.1 The "Three-Click" Rule**

A lawyer must be able to reach any Trademark Filing, Invoice, or generated PDF within exactly three clicks from the main dashboard.

### **3.2 Contextual Intelligence**

* 
**Dynamic Forms:** If "Ethiopia" is selected, the form must automatically show fields for "Wereda," "Sub-City," and "House No".


* **Optimistic UI:** When a lawyer changes a status from "Filed" to "Formal Exam," the UI updates instantly while the API syncs in the background.

### **3.3 Multi-Language Rendering**

* The UI must gracefully handle both English and Amharic script (Ge'ez) side-by-side, specifically for Ethiopian filings .



---

## **4. Specific Interaction Logic**

| Element | Interaction | UX Goal |
| --- | --- | --- |
| **Deadline Alert** | Pulsing Amber Ring around the date | Urgency without noise |
| **Mark Image** | Hover-to-enlarge with metadata overlay | Visual verification 

 |
| **Invoice Toggle** | Smooth slide transition between USD/ETB | Financial clarity 

 |

