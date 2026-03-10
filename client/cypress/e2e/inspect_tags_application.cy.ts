describe('Form Automation Tag Inspection', () => {
  beforeEach(() => {
    cy.visit('/form-automation/application-form');
    // Open the inspection panel
    cy.get('#inspect-tags-button').click();
  });

  it('I. Verify Applicant Information Tags', () => {
    const expectedTags = [
      'applicant_name_english',
      'applicant_name_amharic',
      'address_street',
      'address_zone',
      'city_code',
      'state_code',
      'city_name',
      'state_name',
      'zip_code',
      'house_no',
      'telephone',
      'po_box',
      'wereda',
      'email',
      'fax',
      'nationality',
      'residence_country',
      'chk_female',
      'chk_male',
      'chk_company'
    ];

    expectedTags.forEach(tag => {
      cy.get('[id^="detected-"]').contains(tag).should('be.visible');
    });
  });

  it('II. Verify Agent / Representative Tags', () => {
    const expectedTags = [
      'agent_name',
      'agent_country',
      'agent_city',
      'agent_subcity',
      'agent_woreda',
      'agent_house_no',
      'agent_telephone',
      'agent_fax',
      'agent_po_box',
      'agent_email'
    ];

    expectedTags.forEach(tag => {
      cy.get('[id^="detected-"]').contains(tag).should('be.visible');
    });
  });

  it('III. Verify Use of Mark Tags', () => {
    const expectedTags = [
      'chk_goods',
      'chk_services',
      'chk_collective'
    ];

    expectedTags.forEach(tag => {
      cy.get('[id^="detected-"]').contains(tag).should('be.visible');
    });
  });

  it('IV. Verify Mark Specification Tags', () => {
    const expectedTags = [
      'mark_type_figurative',
      'mark_type_mixed',
      'mark_type_word',
      'mark_type_three_dim',
      'mark_description',
      'mark_translation',
      'mark_transliteration',
      'mark_language_requiring_traslation',
      'mark_has_three_dim_features',
      'mark_color_indication',
      'image_field'
    ];

    expectedTags.forEach(tag => {
      cy.get('[id^="detected-"]').contains(tag).should('be.visible');
    });
  });

  it('V. Verify Priority Right Declaration Tags', () => {
    const expectedTags = [
      'priority_filing_date',
      'priority_country',
      'goods_and_services_covered_by_the_previous_application',
      'priority_right_declaration',
      'chk_priority_accompanies',
      'chk_priority_submitted_later'
    ];

    expectedTags.forEach(tag => {
      cy.get('[id^="detected-"]').contains(tag).should('be.visible');
    });
  });

  it('VI. Verify Classification Tags', () => {
    const expectedTags = [
      'goods_services_list_1',
      'goods_services_list_2',
      'goods_services_list_3',
      'goods_services_list_4',
      'goods_services_list_5',
      'goods_services_list_6',
      'disclaimer_text_amharic',
      'disclaimer_text_english'
    ];

    expectedTags.forEach(tag => {
      cy.get('[id^="detected-"]').contains(tag).should('be.visible');
    });
  });

  it('VII. Verify Checklist and Signature Tags', () => {
    const expectedTags = [
      'chk_list_copies',
      'chk_list_status',
      'chk_list_poa',
      'chk_list_priority_docs',
      'chk_list_drawing',
      'chk_list_payment',
      'chk_list_other',
      'other_documents_text',
      'applicant_sign_day',
      'applicant_sign_month',
      'applicant_sign_year_en'
    ];

    expectedTags.forEach(tag => {
      cy.get('[id^="detected-"]').contains(tag).should('be.visible');
    });
  });
});
