# Application Form Tags (69 Total)

| Section | Expected # of Tags | PDF Tag Name | Status |
| :--- | :--- | :--- | :--- |
| **I. Applicant** | 20 | `applicant_name_english`, `applicant_name_amharic`, `address_street`, `address_zone`, `city_code`, `state_code`, `city_name`, `state_name`, `zip_code`, `house_no`, `telephone`, `po_box`, `wereda`, `email`, `fax`, `nationality`, `residence_country`, `chk_female`, `chk_male`, `chk_company` | ✅ Completely Supported |
| **II. Agent** | 10 | `agent_name`, `agent_country`, `agent_city`, `agent_subcity`, `agent_wereda`, `agent_house_no`, `agent_telephone`, `agent_po_box`, `agent_email`, `agent_fax` | ✅ Completely Supported via the newly added `AgentSection` |
| **III. Use of Mark** | 3 | `chk_goods`, `chk_services`, `chk_collective` | ✅ Completely Supported | 
| **IV. Details of Mark** | 17 | `mark_type_figurative`, `mark_type_mixed`, `mark_type_word`, `mark_type_three_dim`, `mark_description`, `mark_translation`, `mark_transliteration`, `mark_language_requiring_traslation`, `mark_has_three_dim_features`, `mark_color_indication`, `image_field`, `goods_services_list_1`, `goods_services_list_2`, `goods_services_list_3`, `goods_services_list_4`, `goods_services_list_5`, `goods_services_list_6` | ✅ Missing UI fields added, 6 goods/services line inputs map correctly |
| **V. Disclaimer** | 2 | `disclaimer_text_amharic`, `disclaimer_text_english` | ✅ Completely Supported |
| **VI. Priority Right** | 6 | `priority_right_declaration`, `priority_filing_date_1`, `priority_filing_date`, `priority_country`, `chk_priority_accompanies`, `chk_priority_submitted_later` | ✅ Completely Supported |
| **VII. Checklist** | 11 | `chk_list_copies`, `chk_list_status`, `chk_list_poa`, `chk_list_priority_docs`, `chk_list_drawing`, `chk_list_payment`, `chk_list_other`, `other_documents_text`, `applicant_sign_day_en`, `applicant_sign_month`, `applicant_sign_year_en` | ✅ Checkbox options mapped, dynamic date breakdown built in code |

---

# Renewal Form Tags (33 Total)

| Section | Expected # of Tags | PDF Tag Name | Status |
| :--- | :--- | :--- | :--- |
| **I. Applicant** | 13 | `renewal_applicant_name`, `renewal_applicant_name_amharic`, `renewal_address_street`, `renewal_address_zone`, `renewal_city_code`, `renewal_city_name`, `renewal_state_code`, `renewal_state_name`, `renewal_zip_code`, `renewal_wereda`, `renewal_house_no`, `renewal_telephone`, `renewal_email`, `renewal_fax`, `renewal_po_box`, `renewal_nationality`, `renewal_residence_country`, `renewal_chk_female`, `renewal_chk_male`, `renewal_chk_company` | ✅ Completely Supported (Additional address/contact UI elements inherited from dynamic fields) |
| **II. Agent** | 10 | `renewal_agent_name`, `renewal_agent_country`, `renewal_agent_city`, `renewal_agent_subcity`, `renewal_agent_email`, `renewal_agent_pobox`, `renewal_agent_wereda`, `renewal_agent_telephone`, `renewal_agent_house_no`, `renewal_agent_fax` | ✅ Completely Supported |
| **III. Mark Info** | 7 | `renewal_chk_goods_mark`, `renewal_chk_service_mark`, `renewal_chk_collective_mark`, `renewal_mark_logo`, `renewal_app_no`, `renewal_reg_no`, `renewal_reg_date` | ✅ Completely Supported |
| **IV. Goods/Services** | 6 | `renewal_goods_services_1`, `renewal_goods_services_2`, `renewal_goods_services_3`, `renewal_goods_services_4`, `renewal_goods_services_5`, `renewal_goods_services_6` | ✅ Mapped properly |
| **V. Signature** | 3 | `renewal_sign_day`, `renewal_sign_month`, `renewal_sign_year`, `renewal_signature` | ✅ Breakdown supported natively in codebase |
