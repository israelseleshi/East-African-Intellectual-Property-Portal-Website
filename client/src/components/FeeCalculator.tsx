import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { formatCurrency } from '../utils/formatters';

interface Fee {
  id: string;
  stage: string;
  category: 'OFFICIAL_FEE' | 'PROFESSIONAL_FEE' | 'DISBURSEMENT';
  amount: number;
  currency: string;
  description: string;
}

interface FeeCalculatorProps {
  caseId: string;
  jurisdiction?: string;
  currentStage?: string;
}

const STAGE_LABELS: Record<string, string> = {
  'DRAFT': 'Draft',
  'DATA_COLLECTION': 'Data Collection',
  'READY_TO_FILE': 'Ready to File',
  'FILED': 'Filed',
  'FORMAL_EXAM': 'Formal Examination',
  'SUBSTANTIVE_EXAM': 'Substantive Examination',
  'AMENDMENT_PENDING': 'Amendment Pending',
  'PUBLISHED': 'Published',
  'CERTIFICATE_REQUEST': 'Certificate Request',
  'CERTIFICATE_ISSUED': 'Certificate Issued',
  'REGISTERED': 'Registered',
  'RENEWAL_DUE': 'Renewal Due',
  'RENEWAL_ON_TIME': 'Renewal On Time',
  'RENEWAL_PENALTY': 'Renewal with Penalty'
};

const CATEGORY_COLORS: Record<string, string> = {
  'OFFICIAL_FEE': 'bg-blue-100 text-blue-800',
  'PROFESSIONAL_FEE': 'bg-purple-100 text-purple-800',
  'DISBURSEMENT': 'bg-orange-100 text-orange-800'
};

const CATEGORY_LABELS: Record<string, string> = {
  'OFFICIAL_FEE': 'Official Fee',
  'PROFESSIONAL_FEE': 'Professional Fee',
  'DISBURSEMENT': 'Disbursement'
};

export function FeeCalculator({ caseId, jurisdiction, currentStage }: FeeCalculatorProps) {
  const [feesByStage, setFeesByStage] = useState<Record<string, Fee[]>>({});
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const api = useApi();

  useEffect(() => {
    if (caseId) {
      loadCaseFees();
    } else if (jurisdiction && currentStage) {
      loadStageFees(jurisdiction, currentStage);
    }
  }, [caseId, jurisdiction, currentStage]);

  const loadCaseFees = async () => {
    try {
      const data = await api.get(`/fees/case/${caseId}`);
      setFeesByStage(data.fees_by_stage || {});
      setTotalAmount(data.total_amount || 0);
      // Expand current stage by default
      if (data.current_stage) {
        setExpandedStages(new Set([data.current_stage]));
      }
    } catch (error) {
      console.error('Failed to load case fees:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStageFees = async (j: string, s: string) => {
    try {
      const data = await api.get(`/fees/calculate/${j}/${s}`);
      setFeesByStage({ [s]: data.fees || [] });
      setTotalAmount(data.total_amount || 0);
      setExpandedStages(new Set([s]));
    } catch (error) {
      console.error('Failed to load stage fees:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStage = (stage: string) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stage)) {
      newExpanded.delete(stage);
    } else {
      newExpanded.add(stage);
    }
    setExpandedStages(newExpanded);
  };

  const calculateStageTotal = (fees: Fee[]) => {
    return fees.reduce((sum, fee) => sum + parseFloat(String(fee.amount)), 0);
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading fees...</div>;
  }

  const stages = Object.keys(feesByStage);

  if (stages.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg">
        No fee schedule available for this jurisdiction/stage
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Fee Estimate</h3>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(totalAmount, feesByStage[stages[0]]?.[0]?.currency || 'USD')}
            </div>
            <div className="text-sm text-gray-500">Estimated Total</div>
          </div>
        </div>
      </div>

      {/* Fee Breakdown */}
      <div className="divide-y">
        {stages.map((stage) => {
          const fees = feesByStage[stage];
          const stageTotal = calculateStageTotal(fees);
          const isExpanded = expandedStages.has(stage);

          return (
            <div key={stage} className="">
              <button
                onClick={() => toggleStage(stage)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                  <span className="font-medium">{STAGE_LABELS[stage] || stage}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    {fees.length} item{fees.length !== 1 ? 's' : ''}
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(stageTotal, fees[0]?.currency || 'USD')}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 bg-gray-50/50">
                  <table className="w-full text-sm">
                    <thead className="text-gray-500">
                      <tr>
                        <th className="text-left py-2">Type</th>
                        <th className="text-left py-2">Description</th>
                        <th className="text-right py-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {fees.map((fee) => (
                        <tr key={fee.id}>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${CATEGORY_COLORS[fee.category]}`}>
                              {CATEGORY_LABELS[fee.category]}
                            </span>
                          </td>
                          <td className="py-2 text-gray-700">{fee.description}</td>
                          <td className="py-2 text-right font-medium">
                            {formatCurrency(fee.amount, fee.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2">
                      <tr>
                        <td colSpan={2} className="py-2 text-right font-medium">Stage Total:</td>
                        <td className="py-2 text-right font-bold">
                          {formatCurrency(stageTotal, fees[0]?.currency || 'USD')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Grand Total ({stages.length} stage{stages.length !== 1 ? 's' : ''})</span>
          <span className="text-xl font-bold">
            {formatCurrency(totalAmount, feesByStage[stages[0]]?.[0]?.currency || 'USD')}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          * Fees are estimates based on current fee schedules. Actual fees may vary.
        </p>
      </div>
    </div>
  );
}
