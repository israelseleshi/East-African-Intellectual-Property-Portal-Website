# East African IP TPMS - Database Schema & Design

## 1. Overview
The system uses a **MySQL/MariaDB** relational database.
- **Core Strategy:** Normalized tables with strict foreign key constraints.
- **ID Strategy:** UUIDs (`CHAR(36)`) for all primary entities (Clients, Cases) to prevent enumeration attacks and allow easy data merging. Auto-increment Integers are used only for reference tables (Nice Classes).

---

## 2. Core Entities (The "Vault")

### `users`
System users (Lawyers, Admins).
- **Relationships:**
    - 1 User manages * (Many) `trademark_cases` (Owner/Handler).
    - 1 User generates * (Many) `case_history` logs.
- **Schema:**
```sql
CREATE TABLE users (
  id char(36) NOT NULL,
  full_name varchar(255) NOT NULL,
  email varchar(255) NOT NULL,
  phone varchar(50) DEFAULT NULL,
  firm_name varchar(255) DEFAULT NULL,
  password_hash varchar(255) NOT NULL,
  role enum('ADMIN','LAWYER','PARTNER') DEFAULT 'LAWYER',
  is_active tinyint(1) DEFAULT 1,
  is_verified tinyint(1) DEFAULT 0,
  verification_code varchar(6) DEFAULT NULL,
  last_login datetime DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (id),
  UNIQUE KEY email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

### `clients`
The IP owners (Applicants).
- **Relationships:**
    - 1 Client owns * (Many) `trademark_cases`.
    - 1 Client has * (Many) `invoices`.
- **Schema:**
```sql
CREATE TABLE clients (
  id char(36) NOT NULL,
  name varchar(255) NOT NULL,
  type enum('INDIVIDUAL','COMPANY','PARTNERSHIP') NOT NULL,
  nationality varchar(100) DEFAULT NULL,
  email varchar(255) DEFAULT NULL,
  address_street text DEFAULT NULL,
  city varchar(100) DEFAULT NULL,
  zip_code varchar(20) DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

### `trademark_cases`
The central record. Represents ONE trademark in ONE jurisdiction.
- **Relationships:**
    - * Cases belong to 1 Client.
    - 1 Case has * (Many) `deadlines`.
    - 1 Case has * (Many) `nice_class_mappings` (Multi-class applications).
    - 1 Case has * (Many) `mark_assets` (Files).
- **Schema:**
```sql
CREATE TABLE trademark_cases (
  id char(36) NOT NULL,
  client_id char(36) NOT NULL,
  jurisdiction enum('ER','DJ','SO','SL','KE','TZ','UG','RW','BI','SD','ET') NOT NULL,
  mark_name varchar(255) NOT NULL,
  mark_type enum('WORD','LOGO','COMBINED','MIXED','THREE_DIMENSION','OTHER') NOT NULL,
  mark_image text DEFAULT NULL,
  color_indication varchar(255) DEFAULT NULL,
  status enum('DRAFT','FILED','FORMAL_EXAM','SUBSTANTIVE_EXAM','PUBLISHED','REGISTERED','EXPIRING','RENEWAL') DEFAULT 'DRAFT',
  filing_number varchar(100) DEFAULT NULL,
  certificate_number varchar(100) DEFAULT NULL,
  filing_date date DEFAULT NULL,
  registration_dt date DEFAULT NULL,
  client_expiry_date date DEFAULT NULL,
  expiry_date date DEFAULT NULL,
  next_action_date date DEFAULT NULL,
  client_instructions text DEFAULT NULL,
  remark text DEFAULT NULL,
  priority enum('YES','NO') DEFAULT 'NO',
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  user_id char(36) DEFAULT NULL,
  flow_stage varchar(50) DEFAULT 'DATA_COLLECTION',
  PRIMARY KEY (id),
  KEY client_id (client_id),
  KEY fk_case_user (user_id),
  CONSTRAINT fk_case_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT trademark_cases_ibfk_1 FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

---

## 3. Financial Module (The "Ledger")

### `invoices`
Represents a bill sent to a client.
- **Relationships:**
    - * Invoices belong to 1 Client.
    - 1 Invoice contains * (Many) `invoice_items`.
- **Schema:**
```sql
CREATE TABLE invoices (
  id char(36) NOT NULL,
  client_id char(36) NOT NULL,
  invoice_number varchar(50) NOT NULL,
  status enum('DRAFT','SENT','PAID','OVERDUE') DEFAULT 'DRAFT',
  issue_date date NOT NULL,
  due_date date NOT NULL,
  currency enum('USD','ETB','KES') DEFAULT 'USD',
  exchange_rate decimal(10,4) DEFAULT 1.0000,
  total_amount decimal(15,2) NOT NULL,
  notes text DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  UNIQUE KEY invoice_number (invoice_number),
  KEY client_id (client_id),
  CONSTRAINT invoices_ibfk_1 FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

### `invoice_items`
Individual line items (Official Fees, Professional Fees).
- **Relationships:**
    - * Items belong to 1 `invoice`.
    - * Items may optionally link to 1 `trademark_case` (for disbursements).
- **Schema:**
```sql
CREATE TABLE invoice_items (
  id char(36) NOT NULL,
  invoice_id char(36) NOT NULL,
  case_id char(36) DEFAULT NULL,
  description varchar(255) NOT NULL,
  category enum('OFFICIAL_FEE','PROFESSIONAL_FEE','DISBURSEMENT') NOT NULL,
  amount decimal(15,2) NOT NULL,
  PRIMARY KEY (id),
  KEY invoice_id (invoice_id),
  KEY case_id (case_id),
  CONSTRAINT invoice_items_ibfk_1 FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE,
  CONSTRAINT invoice_items_ibfk_2 FOREIGN KEY (case_id) REFERENCES trademark_cases (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

---

## 4. Document Automation (The "Factory")

### `document_templates`
Stores paths to `.docx` master files.
- **Schema:**
```sql
CREATE TABLE document_templates (
  id char(36) NOT NULL,
  name varchar(100) NOT NULL,
  description text DEFAULT NULL,
  file_path text NOT NULL,
  jurisdiction enum('ET','KE','ALL') DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

### `generated_documents`
History of documents created by the system.
- **Relationships:**
    - * Docs belong to 1 `trademark_case`.
    - 1 Doc comes from 1 `document_template`.
- **Schema:**
```sql
CREATE TABLE generated_documents (
  id char(36) NOT NULL,
  case_id char(36) NOT NULL,
  template_id char(36) DEFAULT NULL,
  file_path text NOT NULL,
  created_by char(36) DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  KEY case_id (case_id),
  CONSTRAINT generated_documents_ibfk_1 FOREIGN KEY (case_id) REFERENCES trademark_cases (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

---

## 5. Support Tables

### `nice_classes`
Reference table for Nice Classifications.
- **Schema:**
```sql
CREATE TABLE nice_classes (
  class_number int(11) NOT NULL,
  general_description text DEFAULT NULL,
  PRIMARY KEY (class_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

### `nice_class_mappings`
- `nice_class_mappings` links Cases (Many) <--> Nice Classes (Many). One case can have multiple classes (e.g., Class 9 and 42).
- **Schema:**
```sql
CREATE TABLE nice_class_mappings (
  id int(11) NOT NULL AUTO_INCREMENT,
  case_id char(36) NOT NULL,
  class_no int(11) NOT NULL,
  description text NOT NULL,
  PRIMARY KEY (id),
  KEY case_id (case_id),
  KEY class_no (class_no),
  CONSTRAINT nice_class_mappings_ibfk_1 FOREIGN KEY (case_id) REFERENCES trademark_cases (id) ON DELETE CASCADE,
  CONSTRAINT nice_class_mappings_ibfk_2 FOREIGN KEY (class_no) REFERENCES nice_classes (class_number)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

### `deadlines` (Engine)
- * Deadlines belong to 1 Case.
- Used by the "Watchdog" service to alert lawyers.
- **Schema:**
```sql
CREATE TABLE deadlines (
  id char(36) NOT NULL,
  case_id char(36) NOT NULL,
  type varchar(100) NOT NULL,
  due_date date NOT NULL,
  is_completed tinyint(1) DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  KEY case_id (case_id),
  CONSTRAINT deadlines_ibfk_1 FOREIGN KEY (case_id) REFERENCES trademark_cases (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

### `mark_assets` (Files)
- Stores paths to uploaded files.
- `type` ENUM: 'LOGO', 'POA', 'PRIORITY'.
- **Schema:**
```sql
CREATE TABLE mark_assets (
  id char(36) NOT NULL,
  case_id char(36) NOT NULL,
  type enum('LOGO','POA','PRIORITY') NOT NULL,
  file_path text NOT NULL,
  is_active tinyint(1) DEFAULT 1,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  KEY case_id (case_id),
  CONSTRAINT mark_assets_ibfk_1 FOREIGN KEY (case_id) REFERENCES trademark_cases (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

### `case_history` (Audit)
- Immutable log of WHO changed WHAT and WHEN.
- Stores JSON snapshots of `old_data` vs `new_data`.
- **Schema:**
```sql
CREATE TABLE case_history (
  id char(36) NOT NULL,
  case_id char(36) NOT NULL,
  user_id char(36) DEFAULT NULL,
  action varchar(100) NOT NULL,
  old_data longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(old_data)),
  new_data longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(new_data)),
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  KEY case_id (case_id),
  CONSTRAINT case_history_ibfk_1 FOREIGN KEY (case_id) REFERENCES trademark_cases (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```
