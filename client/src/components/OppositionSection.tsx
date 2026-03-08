import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Button } from './ui/button';
import { addDays, formatDistanceToNow } from 'date-fns';
import { formatDate } from '@/utils/formatters';

interface Opposition {
  id: string;
  opponent_name: string;
  opponent_address?: string;
  opponent_representative?: string;
  grounds: string;
  opposition_date: string;
  deadline_date: string;
  status: 'PENDING' | 'RESPONDED' | 'WITHDRAWN' | 'RESOLVED';
  response_filed_date?: string;
  outcome?: string;
  notes?: string;
  mark_name?: string;
  jurisdiction?: string;
}

interface OppositionSectionProps {
  caseId: string;
  jurisdiction: string;
}

export function OppositionSection({ caseId, jurisdiction }: OppositionSectionProps) {
  const [oppositions, setOppositions] = useState<Opposition[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const api = useApi();

  // Form state
  const [opponentName, setOpponentName] = useState('');
  const [opponentAddress, setOpponentAddress] = useState('');
  const [grounds, setGrounds] = useState('');
  const [oppositionDate, setOppositionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadOppositions();
  }, [caseId]);

  const loadOppositions = async () => {
    try {
      const data = await api.get(`/oppositions/case/${caseId}`);
      setOppositions(data);
    } catch (error) {
      console.error('Failed to load oppositions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.post('/oppositions', {
        caseId,
        opponentName,
        opponentAddress,
        grounds,
        oppositionDate,
        notes
      });

      // Reset form
      setOpponentName('');
      setOpponentAddress('');
      setGrounds('');
      setOppositionDate(new Date().toISOString().split('T')[0])
      setNotes('');
      setShowForm(false);

      loadOppositions();
    } catch (error) {
      console.error('Failed to create opposition:', error);
    }
  };

  const handleUpdateStatus = async (id: string, status: Opposition['status']) => {
    try {
      await api.patch(`/oppositions/${id}/status`, {
        status,
        responseFiledDate: status === 'RESPONDED' ? new Date().toISOString().split('T')[0] : undefined
      });
      loadOppositions();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getDeadlineColor = (deadline: string, status: string) => {
    if (status !== 'PENDING') return 'text-gray-500';
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'text-red-600 font-bold';
    if (days < 7) return 'text-orange-600 font-medium';
    if (days < 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  const pendingCount = oppositions.filter(o => o.status === 'PENDING').length;

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading oppositions...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">Oppositions</h3>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
              {pendingCount} pending
            </span>
          )}
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          {showForm ? 'Cancel' : '+ Record Opposition'}
        </Button>
      </div>

      {/* Add Opposition Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-4 space-y-4">
          <h4 className="font-medium">Record New Opposition</h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Opponent Name *</label>
              <input
                type="text"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Opposition Date *</label>
              <input
                type="date"
                value={oppositionDate}
                onChange={(e) => setOppositionDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Opponent Address</label>
            <input
              type="text"
              value={opponentAddress}
              onChange={(e) => setOpponentAddress(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Address or representative"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Grounds for Opposition *</label>
            <textarea
              value={grounds}
              onChange={(e) => setGrounds(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              rows={3}
              required
              placeholder="Legal grounds for opposition (e.g., likelihood of confusion, bad faith)"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
            <p className="text-blue-800">
              <strong>Deadline:</strong> Response due {jurisdiction === 'ET' ? '60 days' : jurisdiction === 'KE' ? '60 days' : '60-90 days'} from opposition date
              {oppositionDate && (
                <span className="ml-1">
                  ({formatDate(addDays(new Date(oppositionDate), jurisdiction === 'ET' ? 60 : 60))})
                </span>
              )}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!opponentName || !grounds}>
              Record Opposition
            </Button>
          </div>
        </form>
      )}

      {/* Oppositions List */}
      {oppositions.length === 0 ? (
        <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg">
          No oppositions recorded for this case
        </div>
      ) : (
        <div className="space-y-3">
          {oppositions.map((opp) => (
            <div
              key={opp.id}
              className={`bg-white border rounded-lg p-4 ${opp.status === 'PENDING' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium">{opp.opponent_name}</h4>
                  {opp.opponent_address && (
                    <p className="text-sm text-gray-500">{opp.opponent_address}</p>
                  )}
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  opp.status === 'PENDING' ? 'bg-red-100 text-red-800' :
                  opp.status === 'RESPONDED' ? 'bg-blue-100 text-blue-800' :
                  opp.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {opp.status}
                </span>
              </div>

              <p className="text-sm text-gray-700 mb-3">{opp.grounds}</p>

              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div>
                  <span className="text-gray-500">Opposition Date:</span>
                  <span className="ml-1">{formatDate(opp.opposition_date)}</span>
                </div>
                <div className={getDeadlineColor(opp.deadline_date, opp.status)}>
                  <span className="text-gray-500">Response Deadline:</span>
                  <span className="ml-1 font-medium">
                    {formatDate(opp.deadline_date)}
                    {opp.status === 'PENDING' && (
                      <span className="ml-1 text-xs">
                        ({formatDistanceToNow(new Date(opp.deadline_date), { addSuffix: true })})
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {opp.response_filed_date && (
                <div className="text-sm text-green-700 mb-3">
                  ✓ Response filed on {formatDate(opp.response_filed_date)}
                  {opp.outcome && <span className="ml-2">({opp.outcome})</span>}
                </div>
              )}

              {opp.status === 'PENDING' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleUpdateStatus(opp.id, 'RESPONDED')}
                  >
                    Mark Responded
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(opp.id, 'RESOLVED')}
                  >
                    Mark Resolved
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
