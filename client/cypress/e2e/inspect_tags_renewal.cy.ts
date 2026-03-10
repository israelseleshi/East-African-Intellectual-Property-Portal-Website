describe('Renewal Form Tag Inspection', () => {
  beforeEach(() => {
    cy.visit('/form-automation/renewal-form');
    // Open the inspection panel
    cy.get('#inspect-tags-button').click();
  });

  it('I. Verify Applicant Name Tags', () => {
    const expectedTags = [
      'renewal_applicant_name',
      'renewal_applicant_name_amharic'
    ];

    expectedTags.forEach(tag => {
      cy.get('[id^="detected-"]').contains(tag).should('be.visible');
    });
  });

  it('II. Verify Address & Contact Tags', () => {
    const expectedTags = [
      'renewal_address_street',
      'renewal_address_zone',
      'renewal_city_code',
      'renewal_city_name',
      'renewal_state_code',
      'renewal_state_name',
      'renewal_zip_code',
      'renewal_wereda',
      'renewal_house_no',
      'renewal_telephone',
      'renewal_email',
      'renewal_fax',
      'renewal_po_box',
      'renewal_nationality',
      'renewal_residence_country',
      'renewal_chk_female',
      'renewal_chk_male',
      'renewal_chk_company'
    ];

    expectedTags.forEach(tag => {
      cy.get('[id^="detected-"]').contains(tag).should('be.visible');
    });
  });

  it('III. Verify Use of Mark Tags', () => {
    const expectedTags = [
      'renewal_chk_goods_mark',
      'renewal_chk_service_mark',
      'renewal_chk_collective_mark'
    ];

    expectedTags.forEach(tag => {
      cy.get('[id^="detected-"]').contains(tag).should('be.visible');
    });
  });

  it('IV. Verify Representation of Mark Tags', () => {
    const expectedTags = [
      'renewal_mark_logo'
    ];

    expectedTags.forEach(tag => {
      cy.get('[id^="detected-"]').contains(tag).should('be.visible');
    });
  });

  it('V. Verify Case Details Tags', () => {
    const expectedTags = [
      'renewal_app_no',
      'renewal_reg_no',
      'renewal_reg_date'
    ];

    expectedTags.forEach(tag => {
      cy.get('[id^="detected-"]').contains(tag).should('be.visible');
    });
  });

  it('VI. Verify Classification Tags', () => {
    const expectedTags = [
      'renewal_goods_services_1',
      'renewal_goods_services_2',
      'renewal_goods_services_3',
      'renewal_goods_services_4',
      'renewal_goods_services_5',
      'renewal_goods_services_6'
    ];

    expectedTags.forEach(tag => {
      cy.get('[id^="detected-"]').contains(tag).should('be.visible');
    });
  });

  it('VII. Verify Signature Tags', () => {
    const expectedTags = [
      'renewal_sign_day',
      'renewal_sign_month',
      'renewal_sign_year'
    ];

    expectedTags.forEach(tag => {
      cy.get('[id^="detected-"]').contains(tag).should('be.visible');
    });
  });

  it('VIII. Verify Agent Details Tags', () => {
    const expectedTags = [
      'renewal_agent_name',
      'renewal_agent_country',
      'renewal_agent_city',
      'renewal_agent_subcity',
      'renewal_agent_email',
      'renewal_agent_pobox',
      'renewal_agent_wereda',
      'renewal_agent_telephone',
      'renewal_agent_house_no',
      'renewal_agent_fax'
    ];

    expectedTags.forEach(tag => {
      cy.get('[id^="detected-"]').contains(tag).should('be.visible');
    });
  });
});
