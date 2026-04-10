import crypto from 'crypto';
import { getConnection } from '../database/db.js';
import { financialRepository } from '../repositories/financialRepository.js';

interface RecordPaymentInput {
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
}

interface InvoiceItemInput {
  caseId?: string;
  description: string;
  category: string;
  amount: number;
}

interface CreateInvoiceInput {
  clientId: string;
  items: InvoiceItemInput[];
  currency?: string;
  dueDate?: string;
  notes?: string;
}

interface UpdateInvoiceInput {
  id: string;
  items?: InvoiceItemInput[];
  currency?: string;
  dueDate?: string;
  notes?: string;
  status?: string;
}

export const financialService = {
  async recordPayment(input: RecordPaymentInput): Promise<{ id: string; status: 'success' }> {
    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      const paymentId = crypto.randomUUID();
      await financialRepository.insertPayment(connection, {
        id: paymentId,
        invoiceId: input.invoiceId,
        amount: input.amount,
        paymentDate: input.paymentDate,
        paymentMethod: input.paymentMethod,
        referenceNumber: input.referenceNumber ?? null,
        notes: input.notes ?? null
      });

      const [totalPaid, totalAmount] = await Promise.all([
        financialRepository.getTotalPaidForInvoice(connection, input.invoiceId),
        financialRepository.getInvoiceTotalAmount(connection, input.invoiceId)
      ]);

      if (totalAmount !== null) {
        const newStatus = totalPaid >= totalAmount ? 'PAID' : 'PARTIALLY_PAID';
        await financialRepository.updateInvoiceStatus(connection, input.invoiceId, newStatus);
      }

      await connection.commit();
      return { id: paymentId, status: 'success' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async listPaymentsForInvoice(invoiceId: string) {
    return financialRepository.listPaymentsForInvoice(invoiceId);
  },

  async createInvoice(input: CreateInvoiceInput): Promise<{ id: string; invoiceNumber: string; totalAmount: number; status: 'DRAFT' }> {
    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      const currentCount = await financialRepository.getInvoiceCount(connection);
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(currentCount + 1).padStart(3, '0')}`;
      const totalAmount = input.items.reduce((sum, item) => sum + Number(item.amount), 0);
      const invoiceId = crypto.randomUUID();

      await financialRepository.insertInvoice(connection, {
        id: invoiceId,
        clientId: input.clientId,
        invoiceNumber,
        dueDate: input.dueDate ?? new Date(),
        currency: input.currency ?? 'USD',
        totalAmount,
        notes: input.notes ?? ''
      });

      for (const item of input.items) {
        await financialRepository.insertInvoiceItem(connection, {
          id: crypto.randomUUID(),
          invoiceId,
          caseId: item.caseId ?? null,
          description: item.description,
          category: item.category,
          amount: Number(item.amount)
        });
      }

      await connection.commit();
      return { id: invoiceId, invoiceNumber, totalAmount, status: 'DRAFT' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async listInvoices() {
    return financialRepository.listInvoices();
  },

  async getInvoiceById(invoiceId: string) {
    const invoice = await financialRepository.getInvoiceById(invoiceId);
    if (!invoice) return null;

    const [items, payments] = await Promise.all([
      financialRepository.listInvoiceItems(invoiceId),
      financialRepository.listPaymentsForInvoice(invoiceId)
    ]);

    const paidAmount = payments.reduce((sum, payment) => {
      const raw = (payment as any).amount;
      const amount = typeof raw === 'number' ? raw : Number(raw || 0);
      return sum + amount;
    }, 0);

    return {
      ...invoice,
      items,
      payments,
      paid_amount: paidAmount,
      outstanding_amount: Math.max(Number((invoice as any).total_amount || 0) - paidAmount, 0)
    };
  },

  async updateInvoice(input: UpdateInvoiceInput) {
    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      let totalAmount: number | undefined;
      if (input.items && input.items.length > 0) {
        totalAmount = input.items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        await financialRepository.replaceInvoiceItems(
          connection,
          input.id,
          input.items.map((item) => ({
            id: crypto.randomUUID(),
            invoiceId: input.id,
            caseId: item.caseId ?? null,
            description: item.description,
            category: item.category,
            amount: Number(item.amount)
          }))
        );
      }

      await financialRepository.updateInvoice(connection, input.id, {
        currency: input.currency,
        dueDate: input.dueDate,
        notes: input.notes,
        status: input.status,
        totalAmount
      });

      await connection.commit();
      return financialService.getInvoiceById(input.id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async deleteInvoice(invoiceId: string) {
    const connection = await getConnection();
    try {
      await connection.beginTransaction();
      await financialRepository.softDeleteInvoice(connection, invoiceId);
      await connection.commit();
      return { success: true as const };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};
