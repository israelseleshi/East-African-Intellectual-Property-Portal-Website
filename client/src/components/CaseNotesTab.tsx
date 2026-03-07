import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Skeleton } from './ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

interface Note {
  id: string;
  content: string;
  note_type: 'GENERAL' | 'CLIENT_COMMUNICATION' | 'PHONE_CALL' | 'INTERNAL' | 'STRATEGY' | 'REPLY';
  is_private: boolean;
  is_pinned: boolean;
  user_name?: string;
  created_at: string;
  parent_note_id?: string;
  replies?: Note[];
}

interface CaseNotesTabProps {
  caseId: string;
}

const NOTE_TYPE_LABELS: Record<string, string> = {
  GENERAL: 'General',
  CLIENT_COMMUNICATION: 'Client Communication',
  PHONE_CALL: 'Phone Call',
  INTERNAL: 'Internal Note',
  STRATEGY: 'Strategy',
  REPLY: 'Reply'
};

const NOTE_TYPE_COLORS: Record<string, string> = {
  GENERAL: 'bg-gray-100 text-gray-800',
  CLIENT_COMMUNICATION: 'bg-blue-100 text-blue-800',
  PHONE_CALL: 'bg-green-100 text-green-800',
  INTERNAL: 'bg-yellow-100 text-yellow-800',
  STRATEGY: 'bg-purple-100 text-purple-800',
  REPLY: 'bg-gray-50 text-gray-600'
};

export function CaseNotesTab({ caseId }: CaseNotesTabProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<Note['note_type']>('GENERAL');
  const [isPrivate, setIsPrivate] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const api = useApi();

  const loadNotes = useCallback(async () => {
    try {
      const data = await api.get(`/notes/case/${caseId}`);
      // Organize into threads
      const threadedNotes = organizeThreads(data);
      setNotes(threadedNotes);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  }, [caseId, api]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const organizeThreads = (flatNotes: Note[]): Note[] => {
    const noteMap = new Map<string, Note>();
    const rootNotes: Note[] = [];

    // First pass: create map
    flatNotes.forEach(note => {
      noteMap.set(note.id, { ...note, replies: [] });
    });

    // Second pass: organize into threads
    flatNotes.forEach(note => {
      const noteWithReplies = noteMap.get(note.id)!;
      if (note.parent_note_id && noteMap.has(note.parent_note_id)) {
        const parent = noteMap.get(note.parent_note_id)!;
        parent.replies = parent.replies || [];
        parent.replies.push(noteWithReplies);
      } else {
        rootNotes.push(noteWithReplies);
      }
    });

    // Sort: pinned first, then by date
    return rootNotes.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      await api.post('/notes', {
        caseId,
        content: newNote,
        noteType,
        isPrivate
      });
      setNewNote('');
      setNoteType('GENERAL');
      setIsPrivate(false);
      loadNotes();
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const handleReply = async (parentNoteId: string) => {
    if (!replyContent.trim()) return;

    try {
      await api.post(`/notes/${parentNoteId}/reply`, {
        content: replyContent
      });
      setReplyContent('');
      setReplyingTo(null);
      loadNotes();
    } catch (error) {
      console.error('Failed to add reply:', error);
    }
  };

  const handlePin = async (noteId: string, pinned: boolean) => {
    try {
      await api.patch(`/notes/${noteId}/pin`, { pinned });
      loadNotes();
    } catch (error) {
      console.error('Failed to pin note:', error);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await api.delete(`/notes/${noteId}`);
      loadNotes();
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="apple-card p-4 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-24 w-full" />
          <div className="flex gap-3">
            <Skeleton className="h-8 w-32 rounded-md" />
            <Skeleton className="h-8 w-40 rounded-md" />
          </div>
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="apple-card p-4 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-24 rounded-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-6 rounded-md" />
                  <Skeleton className="h-6 w-6 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add New Note */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium mb-3">Add Note</h4>
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Enter note content..."
          className="mb-3"
          rows={3}
        />
        <div className="flex items-center gap-3 mb-3">
          <select
            value={noteType}
            onChange={(e) => setNoteType(e.target.value as Note['note_type'])}
            className="px-3 py-1.5 border rounded-md text-sm"
          >
            {Object.entries(NOTE_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="rounded"
            />
            Private (internal only)
          </label>
        </div>
        <Button onClick={handleAddNote} disabled={!newNote.trim()}>
          Add Note
        </Button>
      </div>

      {/* Notes List */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No notes yet</div>
        ) : (
          notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              onPin={handlePin}
              onDelete={handleDelete}
              onReply={handleReply}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface NoteItemProps {
  note: Note;
  onPin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
  onReply: (parentId: string) => void;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  replyContent: string;
  setReplyContent: (content: string) => void;
  isReply?: boolean;
}

function NoteItem({ note, onPin, onDelete, onReply, replyingTo, setReplyingTo, replyContent, setReplyContent, isReply }: NoteItemProps) {
  return (
    <div className={`bg-white border rounded-lg p-4 ${note.is_pinned ? 'border-yellow-400 bg-yellow-50/30' : ''} ${isReply ? 'ml-8' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${NOTE_TYPE_COLORS[note.note_type]}`}>
            {NOTE_TYPE_LABELS[note.note_type]}
          </span>
          {note.is_private && (
            <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">
              Private
            </span>
          )}
          {note.is_pinned && (
            <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">
              📌 Pinned
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isReply && (
            <button
              onClick={() => onPin(note.id, !note.is_pinned)}
              className="p-1 text-gray-400 hover:text-yellow-500"
              title={note.is_pinned ? 'Unpin' : 'Pin'}
            >
              {note.is_pinned ? '📌' : '📍'}
            </button>
          )}
          <button
            onClick={() => onDelete(note.id)}
            className="p-1 text-gray-400 hover:text-red-500"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>

      <p className="text-gray-800 mb-3 whitespace-pre-wrap">{note.content}</p>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{note.user_name || 'Unknown'} • {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}</span>
        {!isReply && (
          <button
            onClick={() => setReplyingTo(replyingTo === note.id ? null : note.id)}
            className="text-blue-600 hover:text-blue-800"
          >
            Reply
          </button>
        )}
      </div>

      {/* Reply Form */}
      {replyingTo === note.id && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            className="flex-1 px-3 py-2 border rounded-md text-sm"
            onKeyPress={(e) => e.key === 'Enter' && onReply(note.id)}
          />
          <Button size="sm" onClick={() => onReply(note.id)} disabled={!replyContent.trim()}>
            Send
          </Button>
        </div>
      )}

      {/* Replies */}
      {note.replies && note.replies.length > 0 && (
        <div className="mt-3 space-y-2">
          {note.replies.map((reply) => (
            <NoteItem
              key={reply.id}
              note={reply}
              onPin={onPin}
              onDelete={onDelete}
              onReply={onReply}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              isReply={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
