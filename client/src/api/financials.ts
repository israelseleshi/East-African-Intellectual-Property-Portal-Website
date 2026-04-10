import { apiClient } from './httpClient';
import { deleteFinancial, getFinancial, patchFinancial, postFinancial } from './financialResolver';

export interface PaymentPayload {
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
}

export const financialsApi = {
  async recordPayment(payload: PaymentPayload) {
    return postFinancial('/payments', payload);
  },

  async listPaymentsForInvoice(invoiceId: string) {
    return getFinancial(`/payments/invoice/${invoiceId}`);
  },

  async createInvoice(payload: Record<string, unknown>) {
    return postFinancial('/invoices', payload);
  },

  async listInvoices() {
    return getFinancial('/invoices') as Promise<any[]>;
  },

  async getInvoice(invoiceId: string) {
    return getFinancial(`/invoices/${invoiceId}`) as Promise<any>;
  },

  async updateInvoice(invoiceId: string, payload: Record<string, unknown>) {
    return patchFinancial(`/invoices/${invoiceId}`, payload) as Promise<any>;
  },

  async deleteInvoice(invoiceId: string) {
    return deleteFinancial(`/invoices/${invoiceId}`) as Promise<{ success: boolean }>;
  },

  async listFeesByCase(caseId: string) {
    const response = await apiClient.get(`/fees/case/${caseId}`);
    return response.data;
  },

  async calculateFees(jurisdiction: string, stage: string) {
    const response = await apiClient.get(`/fees/calculate/${jurisdiction}/${stage}`);
    return response.data;
  }
};
