import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Skeleton } from './ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { notesApi } from '@/api/notes';

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
  GENERAL: 'bg-[var(--eai-bg)] text-[var(--eai-text-secondary)] border-[var(--eai-border)]',
  CLIENT_COMMUNICATION: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  PHONE_CALL: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  INTERNAL: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  STRATEGY: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  REPLY: 'bg-[var(--eai-bg)] text-[var(--eai-text-secondary)] border-[var(--eai-border)]'
};

export function CaseNotesTab({ caseId }: CaseNotesTabProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<Note['note_type']>('GENERAL');
  const [isPrivate, setIsPrivate] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);

  const loadNotes = useCallback(async () => {
    try {
      const data = await notesApi.listByCase(caseId);
      // Organize into threads
      const threadedNotes = organizeThreads(data);
      setNotes(threadedNotes);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

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
      await notesApi.create({
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
      await notesApi.reply(parentNoteId, replyContent);
      setReplyContent('');
      setReplyingTo(null);
      loadNotes();
    } catch (error) {
      console.error('Failed to add reply:', error);
    }
  };

  const handlePin = async (noteId: string, pinned: boolean) => {
    try {
      await notesApi.setPinned(noteId, pinned);
      loadNotes();
    } catch (error) {
      console.error('Failed to pin note:', error);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await notesApi.remove(noteId);
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
      <div className="bg-[var(--eai-surface)] border border-[var(--eai-border)] rounded-xl p-4 shadow-sm">
        <h4 className="font-bold text-[14px] text-[var(--eai-text)] mb-3 tracking-tight">Add Note</h4>
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Enter note content..."
          className="apple-input mb-3 min-h-[100px]"
        />
        <div className="flex items-center gap-4 mb-4">
          <select
            value={noteType}
            onChange={(e) => setNoteType(e.target.value as Note['note_type'])}
            className="apple-input h-9 px-3 text-[13px] bg-transparent cursor-pointer"
          >
            {Object.entries(NOTE_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key} className="bg-[var(--eai-surface)] text-[var(--eai-text)]">{label}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-[13px] text-[var(--eai-text-secondary)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--eai-border)] text-[var(--eai-primary)] focus:ring-[var(--eai-primary)] transition-all bg-transparent"
            />
            Private (internal only)
          </label>
        </div>
        <Button 
          onClick={handleAddNote} 
          disabled={!newNote.trim()}
          className="apple-button-primary"
        >
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
    <div className={`bg-[var(--eai-surface)] border border-[var(--eai-border)] rounded-xl p-4 shadow-sm transition-all hover:shadow-md ${note.is_pinned ? 'border-amber-400 bg-amber-500/5' : ''} ${isReply ? 'ml-8' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold tracking-wider border ${NOTE_TYPE_COLORS[note.note_type]}`}>
            {NOTE_TYPE_LABELS[note.note_type]}
          </span>
          {note.is_private && (
            <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold tracking-wider bg-red-500/10 text-red-500 border border-red-500/20">
              Private
            </span>
          )}
          {note.is_pinned && (
            <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
              Pinned
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isReply && (
            <button
              onClick={() => onPin(note.id, !note.is_pinned)}
              className={`p-1.5 rounded-md transition-colors ${note.is_pinned ? 'text-amber-500 bg-amber-500/10' : 'text-[var(--eai-muted)] hover:text-amber-500 hover:bg-amber-500/10'}`}
              title={note.is_pinned ? 'Unpin' : 'Pin'}
            >
              <svg className="w-4 h-4" fill={note.is_pinned ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </button>
          )}
          <button
            onClick={() => onDelete(note.id)}
            className="p-1.5 rounded-md text-[var(--eai-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <p className="text-[14px] leading-relaxed text-[var(--eai-text)] mb-4 whitespace-pre-wrap">{note.content}</p>

      <div className="flex items-center justify-between text-[12px] text-[var(--eai-text-secondary)] border-t border-[var(--eai-border)]/50 pt-3">
        <span className="font-medium">{note.user_name || 'System'} • {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}</span>
        {!isReply && (
          <button
            onClick={() => setReplyingTo(replyingTo === note.id ? null : note.id)}
            className="text-[var(--eai-primary)] font-bold hover:underline transition-all"
          >
            Reply
          </button>
        )}
      </div>

      {/* Reply Form */}
      {replyingTo === note.id && (
        <div className="mt-4 flex gap-2 animate-in slide-in-from-top-2 duration-200">
          <input
            type="text"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            className="apple-input flex-1 h-9 px-3 text-[13px]"
            onKeyPress={(e) => e.key === 'Enter' && onReply(note.id)}
            autoFocus
          />
          <Button size="sm" onClick={() => onReply(note.id)} disabled={!replyContent.trim()} className="apple-button-primary h-9">
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
