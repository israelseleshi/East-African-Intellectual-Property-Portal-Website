CREATE TABLE agents (
  id char(36) NOT NULL,
  name varchar(255) NOT NULL,
  country varchar(100) NOT NULL,
  city varchar(100) NOT NULL,
  subcity varchar(100) DEFAULT NULL,
  woreda varchar(100) DEFAULT NULL,
  house_no varchar(50) DEFAULT NULL,
  telephone varchar(50) DEFAULT NULL,
  email varchar(255) DEFAULT NULL,
  po_box varchar(50) DEFAULT NULL,
  fax varchar(50) DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE case_history (
  id char(36) NOT NULL,
  case_id char(36) NOT NULL,
  user_id char(36) DEFAULT NULL,
  action varchar(100) NOT NULL,
  old_data longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(old_data)),
  new_data longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(new_data)),
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  deleted_at timestamp NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY case_id (case_id),
  CONSTRAINT case_history_ibfk_1 FOREIGN KEY (case_id) REFERENCES trademark_cases (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE case_notes (
  id char(36) NOT NULL DEFAULT uuid(),
  case_id char(36) NOT NULL,
  user_id char(36) DEFAULT NULL,
  note_type varchar(30) DEFAULT 'GENERAL',
  content text NOT NULL,
  is_private tinyint(1) DEFAULT 0,
  is_pinned tinyint(1) DEFAULT 0,
  parent_note_id char(36) DEFAULT NULL,
  deleted_at timestamp NULL DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY user_id (user_id),
  KEY parent_note_id (parent_note_id),
  KEY idx_case_notes_case (case_id,created_at),
  CONSTRAINT case_notes_ibfk_1 FOREIGN KEY (case_id) REFERENCES trademark_cases (id) ON DELETE CASCADE,
  CONSTRAINT case_notes_ibfk_2 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT case_notes_ibfk_3 FOREIGN KEY (parent_note_id) REFERENCES case_notes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE clients (
  id char(36) NOT NULL,
  name varchar(255) NOT NULL,
  local_name varchar(255) DEFAULT NULL,
  type enum('INDIVIDUAL','COMPANY','PARTNERSHIP') NOT NULL,
  gender enum('MALE','FEMALE','OTHER') DEFAULT NULL,
  nationality varchar(100) DEFAULT NULL,
  residence_country varchar(100) DEFAULT NULL,
  email varchar(255) DEFAULT NULL,
  address_street text DEFAULT NULL,
  city varchar(100) DEFAULT NULL,
  state_name varchar(100) DEFAULT NULL,
  city_code varchar(50) DEFAULT NULL,
  state_code varchar(50) DEFAULT NULL,
  zip_code varchar(20) DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  deleted_at timestamp NULL DEFAULT NULL,
  address_zone varchar(100) DEFAULT NULL,
  wereda varchar(100) DEFAULT NULL,
  house_no varchar(50) DEFAULT NULL,
  po_box varchar(50) DEFAULT NULL,
  telephone varchar(50) DEFAULT NULL,
  fax varchar(50) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_clients_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE deadlines (
  id char(36) NOT NULL,
  case_id char(36) NOT NULL,
  type varchar(100) NOT NULL,
  due_date date NOT NULL,
  is_completed tinyint(1) DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  deleted_at timestamp NULL DEFAULT NULL,
  status enum('PENDING','COMPLETED','MISSED','SUPERSEDED') DEFAULT 'PENDING',
  PRIMARY KEY (id),
  KEY case_id (case_id),
  CONSTRAINT deadlines_ibfk_1 FOREIGN KEY (case_id) REFERENCES trademark_cases (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE fee_schedules (
  id char(36) NOT NULL DEFAULT uuid(),
  jurisdiction varchar(10) NOT NULL,
  stage varchar(50) NOT NULL,
  category varchar(20) NOT NULL,
  amount decimal(10,2) NOT NULL,
  currency varchar(3) DEFAULT 'USD',
  effective_date date NOT NULL,
  expiry_date date DEFAULT NULL,
  description text DEFAULT NULL,
  is_active tinyint(1) DEFAULT 1,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp NULL DEFAULT NULL,
  created_by char(36) DEFAULT NULL,
  deleted_at timestamp NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY unique_fee_version (jurisdiction,stage,category,effective_date),
  KEY created_by (created_by),
  CONSTRAINT fee_schedules_ibfk_1 FOREIGN KEY (jurisdiction) REFERENCES jurisdictions (code) ON DELETE CASCADE,
  CONSTRAINT fee_schedules_ibfk_2 FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE invoice_items (
  id char(36) NOT NULL,
  invoice_id char(36) NOT NULL,
  case_id char(36) DEFAULT NULL,
  description varchar(255) NOT NULL,
  category enum('OFFICIAL_FEE','PROFESSIONAL_FEE','DISBURSEMENT') NOT NULL,
  amount decimal(15,2) NOT NULL,
  deleted_at timestamp NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY invoice_id (invoice_id),
  KEY case_id (case_id),
  CONSTRAINT invoice_items_ibfk_1 FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE,
  CONSTRAINT invoice_items_ibfk_2 FOREIGN KEY (case_id) REFERENCES trademark_cases (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


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
  deleted_at timestamp NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY invoice_number (invoice_number),
  KEY client_id (client_id),
  KEY idx_invoices_deleted (deleted_at),
  CONSTRAINT invoices_ibfk_1 FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE jurisdictions (
  code varchar(10) NOT NULL,
  name varchar(100) NOT NULL,
  country_code varchar(2) DEFAULT NULL,
  opposition_period_days int(11) NOT NULL DEFAULT 60,
  renewal_period_years int(11) NOT NULL DEFAULT 10,
  grace_period_months int(11) DEFAULT 6,
  currency_code varchar(3) NOT NULL DEFAULT 'USD',
  is_active tinyint(1) DEFAULT 1,
  requires_power_of_attorney tinyint(1) DEFAULT 1,
  requires_notarization tinyint(1) DEFAULT 0,
  multi_class_filing_allowed tinyint(1) DEFAULT 1,
  rules_summary text DEFAULT NULL,
  official_language varchar(50) DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp NULL DEFAULT NULL,
  cert_request_window_days int(11) DEFAULT 20,
  cert_issuance_expected_days int(11) DEFAULT 30,
  PRIMARY KEY (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE mark_assets (
  id char(36) NOT NULL,
  case_id char(36) NOT NULL,
  type enum('LOGO','POA','PRIORITY','OFFICE_ACTION_RESPONSE','REGISTRATION_CERTIFICATE') NOT NULL,
  file_path text NOT NULL,
  is_active tinyint(1) DEFAULT 1,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  deleted_at timestamp NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY case_id (case_id),
  CONSTRAINT mark_assets_ibfk_1 FOREIGN KEY (case_id) REFERENCES trademark_cases (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE nice_class_mappings (
  id int(11) NOT NULL AUTO_INCREMENT,
  case_id char(36) NOT NULL,
  class_no int(11) NOT NULL,
  description text NOT NULL,
  deleted_at timestamp NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY case_id (case_id),
  KEY class_no (class_no),
  CONSTRAINT nice_class_mappings_ibfk_1 FOREIGN KEY (case_id) REFERENCES trademark_cases (id) ON DELETE CASCADE,
  CONSTRAINT nice_class_mappings_ibfk_2 FOREIGN KEY (class_no) REFERENCES nice_classes (class_number)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE nice_classes (
  class_number int(11) NOT NULL,
  general_description text DEFAULT NULL,
  PRIMARY KEY (class_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE oppositions (
  id char(36) NOT NULL DEFAULT uuid(),
  case_id char(36) NOT NULL,
  opponent_name varchar(255) NOT NULL,
  opponent_address text DEFAULT NULL,
  opponent_representative varchar(255) DEFAULT NULL,
  grounds text NOT NULL,
  opposition_date date NOT NULL,
  deadline_date date NOT NULL,
  status varchar(20) DEFAULT 'PENDING',
  response_filed_date date DEFAULT NULL,
  response_document_path varchar(500) DEFAULT NULL,
  outcome varchar(50) DEFAULT NULL,
  notes text DEFAULT NULL,
  deleted_at timestamp NULL DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp NULL DEFAULT NULL,
  created_by char(36) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY created_by (created_by),
  KEY idx_oppositions_case (case_id),
  KEY idx_oppositions_status (status),
  KEY idx_oppositions_deadline (deadline_date),
  CONSTRAINT oppositions_ibfk_1 FOREIGN KEY (case_id) REFERENCES trademark_cases (id) ON DELETE CASCADE,
  CONSTRAINT oppositions_ibfk_2 FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE payments (
  id varchar(36) NOT NULL,
  invoice_id varchar(36) NOT NULL,
  amount decimal(15,2) NOT NULL,
  payment_date date NOT NULL,
  payment_method enum('BANK_TRANSFER','CASH','CHECK','MOBILE_MONEY') NOT NULL,
  reference_number varchar(100) DEFAULT NULL,
  notes text DEFAULT NULL,
  PRIMARY KEY (id),
  KEY invoice_id (invoice_id),
  CONSTRAINT payments_ibfk_1 FOREIGN KEY (invoice_id) REFERENCES invoices (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE trademark_cases (
  id char(36) NOT NULL,
  client_id char(36) NOT NULL,
  agent_id char(36) DEFAULT NULL,
  jurisdiction enum('ER','DJ','SO','SL','KE','TZ','UG','RW','BI','SD','ET') NOT NULL,
  mark_name varchar(255) NOT NULL,
  translation text DEFAULT NULL,
  mark_transliteration text DEFAULT NULL,
  mark_language_requiring_traslation varchar(100) DEFAULT NULL,
  transliteration text DEFAULT NULL,
  transliteration_lang varchar(100) DEFAULT NULL,
  mark_type enum('WORD','LOGO','COMBINED','MIXED','THREE_DIMENSION','OTHER') NOT NULL,
  is_three_dimensional tinyint(1) DEFAULT 0,
  mark_has_three_dim_features text DEFAULT NULL,
  disclaimer text DEFAULT NULL,
  mark_image text DEFAULT NULL,
  mark_description text DEFAULT NULL,
  color_indication varchar(255) DEFAULT NULL,
  status enum('DRAFT','FILED','FORMAL_EXAM','SUBSTANTIVE_EXAM','PUBLISHED','REGISTERED','EXPIRING','RENEWAL','AMENDMENT_PENDING','OPPOSED','ABANDONED','WITHDRAWN') DEFAULT 'DRAFT',
  filing_number varchar(100) DEFAULT NULL,
  certificate_number varchar(100) DEFAULT NULL,
  filing_date date DEFAULT NULL,
  registration_dt date DEFAULT NULL,
  client_expiry_date date DEFAULT NULL,
  expiry_date date DEFAULT NULL,
  next_action_date date DEFAULT NULL,
  priority enum('YES','NO') DEFAULT 'NO',
  priority_country varchar(100) DEFAULT NULL,
  priority_filing_date date DEFAULT NULL,
  goods_prev_application text DEFAULT NULL,
  priority_declaration text DEFAULT NULL,
  client_instructions text DEFAULT NULL,
  remark text DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  user_id char(36) DEFAULT NULL,
  representative_name varchar(255) DEFAULT NULL,
  flow_stage varchar(50) DEFAULT 'DATA_COLLECTION',
  deleted_at timestamp NULL DEFAULT NULL,
  chk_list_copies tinyint(1) DEFAULT 0,
  chk_list_status tinyint(1) DEFAULT 0,
  chk_list_poa tinyint(1) DEFAULT 0,
  chk_list_priority_docs tinyint(1) DEFAULT 0,
  chk_list_drawing tinyint(1) DEFAULT 0,
  chk_list_payment tinyint(1) DEFAULT 0,
  chk_list_other tinyint(1) DEFAULT 0,
  mark_translation_lang varchar(255) DEFAULT NULL,
  is_figurative tinyint(1) DEFAULT 0,
  is_word tinyint(1) DEFAULT 0,
  is_mixed tinyint(1) DEFAULT 0,
  is_three_dim tinyint(1) DEFAULT 0,
  priority_country_name varchar(255) DEFAULT NULL,
  priority_date_val date DEFAULT NULL,
  PRIMARY KEY (id),
  KEY client_id (client_id),
  KEY fk_case_user (user_id),
  KEY idx_cases_deleted (deleted_at),
  KEY fk_cases_agent (agent_id),
  CONSTRAINT fk_case_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_cases_agent FOREIGN KEY (agent_id) REFERENCES agents (id),
  CONSTRAINT trademark_cases_ibfk_1 FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE trademark_cases_backup_20260313 (
  id char(36) NOT NULL,
  client_id char(36) NOT NULL,
  agent_id char(36) DEFAULT NULL,
  jurisdiction enum('ER','DJ','SO','SL','KE','TZ','UG','RW','BI','SD','ET') NOT NULL,
  mark_name varchar(255) NOT NULL,
  translation text DEFAULT NULL,
  mark_transliteration text DEFAULT NULL,
  mark_language_requiring_traslation varchar(100) DEFAULT NULL,
  transliteration text DEFAULT NULL,
  transliteration_lang varchar(100) DEFAULT NULL,
  mark_type enum('WORD','LOGO','COMBINED','MIXED','THREE_DIMENSION','OTHER') NOT NULL,
  is_three_dimensional tinyint(1) DEFAULT 0,
  mark_has_three_dim_features text DEFAULT NULL,
  disclaimer text DEFAULT NULL,
  mark_image text DEFAULT NULL,
  mark_description text DEFAULT NULL,
  color_indication varchar(255) DEFAULT NULL,
  status enum('DRAFT','FILED','FORMAL_EXAM','SUBSTANTIVE_EXAM','PUBLISHED','REGISTERED','EXPIRING','RENEWAL','AMENDMENT_PENDING','OPPOSED','ABANDONED','WITHDRAWN') DEFAULT 'DRAFT',
  filing_number varchar(100) DEFAULT NULL,
  certificate_number varchar(100) DEFAULT NULL,
  filing_date date DEFAULT NULL,
  registration_dt date DEFAULT NULL,
  client_expiry_date date DEFAULT NULL,
  expiry_date date DEFAULT NULL,
  next_action_date date DEFAULT NULL,
  priority enum('YES','NO') DEFAULT 'NO',
  priority_country varchar(100) DEFAULT NULL,
  priority_filing_date date DEFAULT NULL,
  goods_prev_application text DEFAULT NULL,
  priority_declaration text DEFAULT NULL,
  client_instructions text DEFAULT NULL,
  remark text DEFAULT NULL,
  eipa_form_json longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(eipa_form_json)),
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  user_id char(36) DEFAULT NULL,
  representative_name varchar(255) DEFAULT NULL,
  flow_stage varchar(50) DEFAULT 'DATA_COLLECTION',
  deleted_at timestamp NULL DEFAULT NULL,
  chk_list_copies tinyint(1) DEFAULT 0,
  chk_list_status tinyint(1) DEFAULT 0,
  chk_list_poa tinyint(1) DEFAULT 0,
  chk_list_priority_docs tinyint(1) DEFAULT 0,
  chk_list_drawing tinyint(1) DEFAULT 0,
  chk_list_payment tinyint(1) DEFAULT 0,
  chk_list_other tinyint(1) DEFAULT 0,
  mark_translation_lang varchar(255) DEFAULT NULL,
  is_figurative tinyint(1) DEFAULT 0,
  is_word tinyint(1) DEFAULT 0,
  is_mixed tinyint(1) DEFAULT 0,
  is_three_dim tinyint(1) DEFAULT 0,
  priority_country_name varchar(255) DEFAULT NULL,
  priority_date_val date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE user_refresh_tokens (
  id char(36) NOT NULL,
  user_id char(36) NOT NULL,
  token_hash char(64) NOT NULL,
  expires_at datetime NOT NULL,
  revoked_at datetime DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  KEY idx_user_refresh_user (user_id),
  CONSTRAINT fk_user_refresh_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


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
  deleted_at timestamp NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY email (email),
  KEY idx_users_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
