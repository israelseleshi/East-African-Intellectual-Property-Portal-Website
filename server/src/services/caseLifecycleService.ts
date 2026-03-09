import crypto from 'crypto';
import type { CaseRow } from '../database/types.js';
import { getConnection } from '../database/db.js';
import { caseRepository } from '../repositories/caseRepository.js';
import { FEE_SCHEDULE } from '../utils/constants.js';
import { recalculateDeadlines } from '../utils/deadlines.js';

interface UpdateCaseStatusInput {
  caseId: string;
  status: string;
  userId?: string;
  actionNote?: string;
  publicationDate?: string;
}

export const caseLifecycleService = {
  async updateCaseStatus(input: UpdateCaseStatusInput): Promise<{ id: string; status: string } | null> {
    const oldCase = await caseRepository.findCaseById(input.caseId);
    if (!oldCase) {
      return null;
    }

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      await caseRepository.insertCaseHistory(connection, {
        caseId: input.caseId,
        userId: input.userId ?? null,
        action: `STATUS_CHANGE: ${oldCase.status} -> ${input.status}`,
        oldData: { status: oldCase.status },
        newData: { status: input.status, note: input.actionNote }
      });

      await caseRepository.updateCaseStatus(connection, {
        caseId: input.caseId,
        status: input.status,
        hadFilingDate: Boolean(oldCase.filing_date),
        hadRegistrationDate: Boolean(oldCase.registration_dt),
        publicationDate: input.publicationDate
      });

      const invoiceStage = input.status === 'REGISTERED' ? 'CERTIFICATE_ISSUED' : input.status;
      const jurisdiction = oldCase.jurisdiction as 'ET' | 'KE';
      const fees = FEE_SCHEDULE[jurisdiction];
      if (fees && fees[invoiceStage]) {
        const fee = fees[invoiceStage];
        const classCount = await caseRepository.countNiceClasses(connection, input.caseId);
        const totalAmount = fee.amount + (fee.per_extra_class_amount * Math.max(0, classCount - 1));
        const invoiceId = crypto.randomUUID();
        const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

        await caseRepository.insertInvoice(connection, {
          id: invoiceId,
          clientId: oldCase.client_id,
          invoiceNumber,
          currency: oldCase.jurisdiction === 'ET' ? 'ETB' : 'KES',
          totalAmount,
          notes: `Auto-generated for ${input.status}`
        });

        await caseRepository.insertInvoiceItem(connection, {
          invoiceId,
          caseId: input.caseId,
          description: fee.description,
          category: fee.category,
          amount: totalAmount
        });
      }

      await connection.commit();

      const updatedCase: CaseRow = { ...oldCase, status: input.status };
      if (input.status === 'PUBLISHED' && input.publicationDate) {
        (updatedCase as CaseRow & { publication_date?: Date }).publication_date = new Date(input.publicationDate);
      }
      await recalculateDeadlines(input.caseId, input.status, updatedCase, connection);

      return { id: input.caseId, status: input.status };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};
