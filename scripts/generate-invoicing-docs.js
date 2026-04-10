import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  convertInchesToTwip
} from 'docx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'docs');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'Invoicing-Feature-Documentation.docx');

const EAIP_BRAND = {
  primary: '1A365D',
  secondary: '2B6CB0',
  accent: '3182CE',
  text: '1A202C',
  muted: '718096',
  lightBg: 'EBF8FF',
  border: 'CBD5E0'
};

const createHeading = (text, level) => {
  const sizes = {
    1: 36,
    2: 28,
    3: 24,
    4: 20
  };
  
  return new Paragraph({
    spacing: {
      before: level === 1 ? 400 : 300,
      after: level === 1 ? 200 : 150
    },
    children: [
      new TextRun({
        text,
        bold: true,
        size: sizes[level] || 24,
        color: EAIP_BRAND.primary,
        font: 'Calibri'
      })
    ]
  });
};

const createParagraph = (text, options = {}) => {
  return new Paragraph({
    spacing: { after: options.spacing || 200 },
    children: [
      new TextRun({
        text,
        bold: options.bold || false,
        italics: options.italic || false,
        size: 22,
        color: EAIP_BRAND.text,
        font: 'Calibri'
      })
    ]
  });
};

const createBullet = (text, level = 0) => {
  return new Paragraph({
    indent: { left: convertInchesToTwip(0.25 + level * 0.25) },
    spacing: { after: 100 },
    bullet: { level },
    children: [
      new TextRun({
        text,
        size: 22,
        color: EAIP_BRAND.text,
        font: 'Calibri'
      })
    ]
  });
};

const createTableRow = (cells, isHeader = false) => {
  return new TableRow({
    tableHeader: isHeader,
    children: cells.map(cell => new TableCell({
      width: cell.width ? { size: cell.width, type: WidthType.DXA } : undefined,
      shading: isHeader ? {
        type: ShadingType.CLEAR,
        fill: EAIP_BRAND.primary
      } : undefined,
      children: [
        new Paragraph({
          spacing: { after: 0 },
          children: [
            new TextRun({
              text: cell.text,
              bold: isHeader,
              size: 20,
              color: isHeader ? 'FFFFFF' : EAIP_BRAND.text,
              font: 'Calibri'
            })
          ]
        })
      ]
    }))
  });
};

const createStyledTable = (headers, rows, columnWidths) => {
  const defaultWidth = Math.floor(9000 / (headers.length || 1));
  
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      createTableRow(headers.map((h, i) => ({ 
        text: h, 
        isHeader: true, 
        width: columnWidths?.[i] || defaultWidth 
      })), true),
      ...rows.map(row => createTableRow(row.map((cell, i) => ({ 
        text: cell, 
        width: columnWidths?.[i] || defaultWidth 
      }))))
    ],
    margins: {
      top: 100,
      bottom: 100,
      left: 100,
      right: 100
    }
  });
};

const createSpacer = (height = 200) => {
  return new Paragraph({
    spacing: { after: height },
    children: []
  });
};

const createDivider = () => {
  return new Paragraph({
    border: {
      bottom: {
        color: EAIP_BRAND.border,
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6
      }
    },
    spacing: { after: 300 },
    children: []
  });
};

async function generateInvoicingDocumentation() {
  console.log('Generating Invoicing Feature Documentation...');

  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: 'EAST AFRICAN INTELLECTUAL PROPERTY',
          bold: true,
          size: 40,
          color: EAIP_BRAND.primary,
          font: 'Calibri'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: 'Trademark & IP Management System',
          size: 24,
          color: EAIP_BRAND.muted,
          font: 'Calibri'
        })
      ]
    }),
    createSpacer(200),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: 'INVOICING & BILLING',
          bold: true,
          size: 56,
          color: EAIP_BRAND.primary,
          font: 'Calibri'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: 'Feature Documentation',
          bold: true,
          size: 32,
          color: EAIP_BRAND.secondary,
          font: 'Calibri'
        })
      ]
    }),
    createSpacer(100),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 },
      children: [
        new TextRun({
          text: 'Version 1.0  |  April 2026',
          size: 20,
          color: EAIP_BRAND.muted,
          font: 'Calibri'
        })
      ]
    }),
    createSpacer(400),
    createDivider(),
    createSpacer(200),

    createHeading('Overview', 1),
    createParagraph(
      'The TPMS (Trademark Portfolio Management System) includes a comprehensive invoicing and billing module that allows law firms to track financial transactions related to trademark cases. The system supports automatic invoice generation tied to trademark lifecycle stages, manual invoice creation, and payment recording.',
      { spacing: 300 }
    ),
    createSpacer(200),

    createHeading('Invoice Generation Flow', 1),

    createHeading('Automatic Invoice Generation', 2),
    createParagraph(
      'Invoices are automatically generated when a trademark case advances through its lifecycle stages. This is a core design principle — every stage transition creates an associated invoice based on a predefined fee schedule.',
      { spacing: 250 }
    ),

    createHeading('How It Works', 3),
    createBullet('Stage Advancement: When an authorized user moves a trademark case from one stage to another (e.g., from "Formal Exam" to "Substantive Exam"), the system detects the transition.'),
    createBullet('Fee Lookup: The system looks up the applicable fee from the jurisdiction-specific fee schedule (FEE_SCHEDULE) based on the jurisdiction and new stage.'),
    createBullet('Nice Class Calculation: For stage-based fees, the system counts how many Nice Classes the trademark covers. The base fee covers the first class, and additional classes incur an extra charge per class.'),
    createBullet('Invoice Creation: The system automatically creates an Invoice Header with a unique invoice number, an Invoice Line Item describing the service, and sets currency based on jurisdiction.'),
    createSpacer(200),

    createHeading('Supported Lifecycle Stages', 3),
    createSpacer(100),
    createStyledTable(
      ['Stage', 'Description', 'Invoice Trigger'],
      [
        ['DATA_COLLECTION', 'Initial data gathering', 'No fee'],
        ['FILED', 'Application filed', 'Filing fee'],
        ['FORMAL_EXAM', 'Formal examination', 'Formal exam fee'],
        ['SUBSTANTIVE_EXAM', 'Substantive examination', 'Substantive exam fee'],
        ['AMENDMENT_PENDING', 'Amendment requested', 'Amendment fee'],
        ['PUBLISHED', 'Mark published for opposition', 'Publication fee'],
        ['CERTIFICATE_REQUEST', 'Certificate requested', 'Certificate fee'],
        ['CERTIFICATE_ISSUED', 'Certificate issued', 'Registration fee'],
        ['REGISTERED', 'Trademark fully registered', 'Final registration fee'],
        ['RENEWAL_DUE', 'Renewal window opened', 'Renewal fee'],
        ['RENEWAL_ON_TIME', 'Renewal submitted on time', 'Renewal fee'],
        ['RENEWAL_PENALTY', 'Late renewal with penalty', 'Penalty fee']
      ],
      [2500, 3500, 2500]
    ),
    createSpacer(400),

    createHeading('Manual Invoice Creation', 1),
    createParagraph(
      'Users can also create invoices manually for services not tied to lifecycle stages. This is done through the Billing & Ledger interface.',
      { spacing: 250 }
    ),

    createHeading('Required Fields', 3),
    createBullet('Client: The client the invoice is for (required)'),
    createBullet('Line Items: At least one item must be added, each with:'),
    createBullet('Description: What the charge is for', 1),
    createBullet('Category: The type of fee (e.g., FILING, EXAMINATION, LEGAL)', 1),
    createBullet('Amount: The monetary amount', 1),
    createBullet('Related Case: Optional link to a specific trademark case', 1),
    createBullet('Currency: USD, ETB, or KES'),
    createBullet('Due Date: When payment is expected'),
    createBullet('Notes: Internal notes or remarks'),
    createSpacer(200),

    createHeading('Invoice Numbering', 3),
    createParagraph('Manually created invoices follow the format: INV-{YEAR}-{SEQUENCE}'),
    createParagraph('Example: INV-2026-001, INV-2026-002', { italic: true }),
    createSpacer(400),

    createHeading('Payment Recording', 1),

    createHeading('Recording a Payment', 2),
    createParagraph(
      'Once an invoice is created, users can record payments when clients pay. The system supports partial payments, meaning an invoice can have multiple payment records.',
      { spacing: 250 }
    ),

    createHeading('Payment Recording Flow', 3),
    createBullet('Select Invoice: Navigate to the Billing & Ledger page and click on an outstanding invoice.'),
    createBullet('Enter Payment Details: Specify the amount received, payment date, method, reference number, and any internal notes.'),
    createBullet('Automatic Status Update: The system automatically updates the invoice status based on the payment amount.'),
    createSpacer(200),

    createHeading('Automatic Status Updates', 3),
    createBullet('If total paid equals or exceeds the invoice amount → Status becomes PAID'),
    createBullet('If total paid is less than the invoice amount → Status becomes PARTIALLY_PAID'),
    createSpacer(200),

    createHeading('Payment Methods', 3),
    createSpacer(100),
    createStyledTable(
      ['Method', 'Description'],
      [
        ['BANK_TRANSFER', 'Wire transfer or EFT'],
        ['CASH', 'Cash payment'],
        ['CHECK', 'Check payment'],
        ['MOBILE_MONEY', 'Mobile payment (M-Pesa, etc.)']
      ],
      [3000, 5500]
    ),
    createSpacer(400),

    createHeading('Invoice Statuses', 1),
    createSpacer(100),
    createStyledTable(
      ['Status', 'Meaning'],
      [
        ['DRAFT', 'Invoice created but not sent/confirmed'],
        ['PENDING', 'Invoice sent, awaiting payment'],
        ['PARTIALLY_PAID', 'Some payment received, more due'],
        ['PAID', 'Full payment received'],
        ['OVERDUE', 'Payment past due date']
      ],
      [2500, 6000]
    ),
    createSpacer(400),

    createHeading('Billing Dashboard', 1),
    createParagraph(
      'The Billing & Ledger page provides a real-time financial overview with summary cards and a detailed transaction ledger.',
      { spacing: 250 }
    ),

    createHeading('Summary Cards', 3),
    createBullet('Total Revenue: Sum of all invoice amounts (paid and unpaid)'),
    createBullet('Outstanding: Total unpaid amount across all invoices'),
    createBullet('Paid MTD: Amount collected in the current month'),
    createBullet('Overdue Count: Number of invoices past their due date'),
    createSpacer(200),

    createHeading('Transaction Ledger', 3),
    createParagraph('A detailed table showing all invoices with:'),
    createBullet('Trademark name and client'),
    createBullet('Service type/purpose'),
    createBullet('Invoice date'),
    createBullet('Amount'),
    createBullet('Status (with color-coded badges)'),
    createBullet('Payment method'),
    createBullet('Quick action to record payment or download PDF'),
    createSpacer(400),

    createHeading('PDF Invoice Generation', 1),
    createParagraph(
      'Users can download a professional PDF invoice for any transaction. The PDF includes company letterhead, invoice details, client information, service description, amount due, payment information, and signature line.',
      { spacing: 250 }
    ),
    createSpacer(400),

    createHeading('Fee Schedule', 1),
    createParagraph(
      'The system uses a jurisdiction-specific fee schedule. Base fees cover the first Nice Class, with additional classes incurring extra charges.',
      { spacing: 250 }
    ),

    createHeading('Ethiopia (ET)', 2),
    createSpacer(100),
    createStyledTable(
      ['Stage', 'Base Fee', 'Per Extra Class'],
      [
        ['Filing', '500 ETB', '100 ETB'],
        ['Formal Exam', '300 ETB', '50 ETB'],
        ['Substantive Exam', '500 ETB', '100 ETB'],
        ['Publication', '200 ETB', '50 ETB'],
        ['Certificate', '1,000 ETB', '200 ETB'],
        ['Renewal', '800 ETB', '150 ETB']
      ],
      [3500, 2500, 2500]
    ),
    createSpacer(300),

    createHeading('Kenya (KE)', 2),
    createSpacer(100),
    createStyledTable(
      ['Stage', 'Base Fee', 'Per Extra Class'],
      [
        ['Filing', '3,000 KES', '500 KES'],
        ['Formal Exam', '2,000 KES', '300 KES'],
        ['Substantive Exam', '3,000 KES', '500 KES'],
        ['Publication', '1,500 KES', '300 KES'],
        ['Certificate', '5,000 KES', '1,000 KES'],
        ['Renewal', '4,000 KES', '750 KES']
      ],
      [3500, 2500, 2500]
    ),
    createSpacer(400),

    createHeading('Financial Recovery Queue', 1),
    createParagraph(
      'On the Dashboard, the system surfaces unpaid invoices in the "Financial Recovery Queue" — a priority list showing which invoices are unpaid or overdue, the client and trademark associated, the amount outstanding, and days until/past due date. This helps the firm prioritize follow-ups with clients who have outstanding balances.',
      { spacing: 300 }
    ),
    createSpacer(400),

    createHeading('Currency Support', 1),
    createSpacer(100),
    createStyledTable(
      ['Currency', 'Description'],
      [
        ['USD', 'US Dollars'],
        ['ETB', 'Ethiopian Birr'],
        ['KES', 'Kenyan Shilling']
      ],
      [1500, 7000]
    ),
    createSpacer(200),
    createParagraph('Currency is automatically assigned based on the trademark\'s jurisdiction but can be overridden when creating manual invoices.'),
    createSpacer(400),

    createHeading('Best Practices', 1),
    createBullet('Review Invoices Before Stage Advancement: Since invoices are auto-generated, verify the fee amount before moving a case to a new stage.'),
    createBullet('Record Payments Promptly: Always record payments as soon as received to keep the ledger accurate.'),
    createBullet('Use Reference Numbers: Always include bank transaction IDs or receipt numbers for traceability.'),
    createBullet('Monitor the Recovery Queue: Check the Financial Recovery Queue regularly to follow up on outstanding payments.'),
    createSpacer(400),

    createDivider(),
    createSpacer(200),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: 'East African Intellectual Property',
          bold: true,
          size: 22,
          color: EAIP_BRAND.primary,
          font: 'Calibri'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: 'Addis Ababa, Ethiopia  |  info@eastafricanip.com  |  www.eastafricanip.com',
          size: 18,
          color: EAIP_BRAND.muted,
          font: 'Calibri'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [
        new TextRun({
          text: `Document generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
          size: 16,
          color: EAIP_BRAND.muted,
          font: 'Calibri',
          italics: true
        })
      ]
    })
  ];

  const doc = new Document({
    creator: 'EAIP TPMS',
    title: 'Invoicing & Billing Feature Documentation',
    description: 'Comprehensive documentation for the TPMS invoicing and billing module',
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1)
          }
        }
      },
      headers: {
        default: new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 5000, type: WidthType.DXA },
                  children: [new Paragraph({
                    children: [new TextRun({
                      text: 'EAIP TPMS',
                      bold: true,
                      size: 18,
                      color: EAIP_BRAND.primary,
                      font: 'Calibri'
                    })]
                  })]
                }),
                new TableCell({
                  width: { size: 4500, type: WidthType.DXA },
                  children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({
                      text: 'Invoicing Feature Documentation',
                      size: 18,
                      color: EAIP_BRAND.muted,
                      font: 'Calibri'
                    })]
                  })]
                })
              ]
            })
          ],
          margins: {
            bottom: 100
          }
        })
      },
      footers: {
        default: new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders: {
                    top: {
                      color: EAIP_BRAND.border,
                      space: 1,
                      style: BorderStyle.SINGLE,
                      size: 4
                    }
                  },
                  children: [new Paragraph({
                    children: [new TextRun({
                      text: 'Confidential - East African Intellectual Property',
                      size: 16,
                      color: EAIP_BRAND.muted,
                      font: 'Calibri'
                    })]
                  })]
                }),
                new TableCell({
                  borders: {
                    top: {
                      color: EAIP_BRAND.border,
                      space: 1,
                      style: BorderStyle.SINGLE,
                      size: 4
                    }
                  },
                  children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({
                      text: 'Page ',
                      size: 16,
                      color: EAIP_BRAND.muted,
                      font: 'Calibri'
                    })]
                  })]
                })
              ]
            })
          ]
        })
      },
      children
    }]
  });

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUTPUT_FILE, buffer);

  console.log(`\n✓ Documentation generated successfully!`);
  console.log(`  Location: ${OUTPUT_FILE}`);
  console.log(`  Size: ${(buffer.length / 1024).toFixed(2)} KB`);
}

generateInvoicingDocumentation().catch(console.error);
