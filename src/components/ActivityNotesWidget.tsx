import { useState, useEffect, useCallback } from 'react';
import type { ActivityNotePreview, ActivityNoteDetail } from '@/lib/activityNotes';
import { fetchNotes, fetchNote, deleteNote, createNote } from '@/lib/activityNotes';

interface ActivityNotesWidgetProps {
  adminToken: string;
  deviceId: string;
  lang: 'ru' | 'en';
}

function useThemeColors() {
  const [colors, setColors] = useState<Record<string, string>>({});
  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    const vars = ['--accent', '--accent2', '--muted', '--warn', '--success', '--danger', '--border', '--surface', '--surface2', '--text', '--bg'];
    const result: Record<string, string> = {};
    for (const v of vars) result[v] = style.getPropertyValue(v).trim();
    setColors(result);
  }, []);
  return colors;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const ActivityNotesWidget: React.FC<ActivityNotesWidgetProps> = ({ adminToken, deviceId, lang }) => {
  const theme = useThemeColors();
  const [notes, setNotes] = useState<ActivityNotePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<ActivityNoteDetail | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteTag, setNewNoteTag] = useState('');
  const [newNoteRedact, setNewNoteRedact] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    if (!adminToken) return;
    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const data = await fetchNotes({
        adminToken,
        deviceId,
        from: today.toISOString(),
        limit: 20,
      });
      setNotes(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [adminToken, deviceId]);

  useEffect(() => {
    loadNotes();
    const timer = setInterval(loadNotes, 60000);
    return () => clearInterval(timer);
  }, [loadNotes]);

  const handleView = async (id: string) => {
    try {
      const detail = await fetchNote(id, adminToken);
      setSelectedNote(detail);
      setShowViewDialog(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load note');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmMsg = lang === 'ru' ? 'Удалить заметку?' : 'Delete note?';
    if (!confirm(confirmMsg)) return;
    try {
      await deleteNote(id, adminToken);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (selectedNote?.id === id) {
        setShowViewDialog(false);
        setSelectedNote(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    setSubmitting(true);
    try {
      await createNote({
        adminToken,
        deviceId,
        text: newNoteText.trim(),
        tag: newNoteTag.trim() || undefined,
        redact: newNoteRedact,
      });
      setNewNoteText('');
      setNewNoteTag('');
      setShowAddDialog(false);
      await loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const t = {
    title: lang === 'ru' ? 'Заметки' : 'Notes',
    add: lang === 'ru' ? 'Добавить' : 'Add',
    view: lang === 'ru' ? 'Показать' : 'View',
    delete: lang === 'ru' ? 'Удалить' : 'Delete',
    copy: lang === 'ru' ? 'Копировать' : 'Copy',
    copied: lang === 'ru' ? 'Скопировано' : 'Copied',
    close: lang === 'ru' ? 'Закрыть' : 'Close',
    save: lang === 'ru' ? 'Сохранить' : 'Save',
    cancel: lang === 'ru' ? 'Отмена' : 'Cancel',
    noNotes: lang === 'ru' ? 'Нет заметок за сегодня' : 'No notes today',
    noteText: lang === 'ru' ? 'Текст заметки' : 'Note text',
    tag: lang === 'ru' ? 'Тег' : 'Tag',
    redact: lang === 'ru' ? 'Скрывать секреты' : 'Redact secrets',
    loading: lang === 'ru' ? 'Загрузка...' : 'Loading...',
    notConfigured: lang === 'ru' ? 'Токен не настроен' : 'Token not configured',
  };

  if (!adminToken) {
    return (
      <div style={{ padding: 16, color: theme['--muted'] || '#a7b3c2' }}>
        {t.notConfigured}
      </div>
    );
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: theme['--surface'] || '#111823',
    border: `1px solid ${theme['--border'] || '#243244'}`,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: theme['--accent'] || '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 13,
  };

  const buttonSecondaryStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: theme['--surface2'] || '#1a2332',
    color: theme['--text'] || '#e7eef7',
    border: `1px solid ${theme['--border'] || '#243244'}`,
  };

  const dialogOverlay: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const dialogContent: React.CSSProperties = {
    backgroundColor: theme['--surface'] || '#111823',
    border: `1px solid ${theme['--border'] || '#243244'}`,
    borderRadius: 8,
    padding: 20,
    maxWidth: 500,
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: theme['--text'] || '#e7eef7' }}>
          {t.title}
        </h3>
        <button style={buttonStyle} onClick={() => setShowAddDialog(true)}>
          {t.add}
        </button>
      </div>

      {error && (
        <div style={{ color: theme['--danger'] || '#ef4444', marginBottom: 12, fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: theme['--muted'] || '#a7b3c2', fontSize: 13 }}>{t.loading}</div>
      ) : notes.length === 0 ? (
        <div style={{ color: theme['--muted'] || '#a7b3c2', fontSize: 13 }}>{t.noNotes}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notes.map((note) => (
            <div
              key={note.id}
              style={{
                backgroundColor: theme['--surface2'] || '#1a2332',
                border: `1px solid ${theme['--border'] || '#243244'}`,
                borderRadius: 6,
                padding: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: theme['--muted'] || '#a7b3c2', marginBottom: 4 }}>
                    {formatTime(note.createdAt)}
                    {note.app && (
                      <span style={{
                        marginLeft: 8,
                        backgroundColor: theme['--accent'] || '#3b82f6',
                        color: '#fff',
                        padding: '1px 6px',
                        borderRadius: 3,
                        fontSize: 10,
                      }}>
                        {note.app}
                      </span>
                    )}
                    {note.tag && (
                      <span style={{
                        marginLeft: 4,
                        backgroundColor: theme['--warn'] || '#f59e0b',
                        color: '#000',
                        padding: '1px 6px',
                        borderRadius: 3,
                        fontSize: 10,
                      }}>
                        {note.tag}
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: theme['--text'] || '#e7eef7',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {note.preview}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    style={{ ...buttonSecondaryStyle, padding: '4px 8px', fontSize: 11 }}
                    onClick={() => handleView(note.id)}
                  >
                    {t.view}
                  </button>
                  <button
                    style={{ ...buttonSecondaryStyle, padding: '4px 8px', fontSize: 11, color: theme['--danger'] || '#ef4444' }}
                    onClick={() => handleDelete(note.id)}
                  >
                    {t.delete}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Dialog */}
      {showViewDialog && selectedNote && (
        <div style={dialogOverlay} onClick={() => setShowViewDialog(false)}>
          <div style={dialogContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: theme['--muted'] || '#a7b3c2', marginBottom: 4 }}>
                {new Date(selectedNote.createdAt).toLocaleString()}
                {selectedNote.app && ` | ${selectedNote.app}`}
                {selectedNote.tag && ` | #${selectedNote.tag}`}
              </div>
              {selectedNote.title && (
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: theme['--text'] || '#e7eef7' }}>
                  {selectedNote.title}
                </div>
              )}
            </div>
            <pre style={{
              backgroundColor: theme['--bg'] || '#0a0f16',
              border: `1px solid ${theme['--border'] || '#243244'}`,
              borderRadius: 4,
              padding: 12,
              fontSize: 13,
              color: theme['--text'] || '#e7eef7',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 300,
              overflow: 'auto',
              margin: 0,
            }}>
              {selectedNote.text}
            </pre>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button
                style={buttonSecondaryStyle}
                onClick={() => copyToClipboard(selectedNote.text)}
              >
                {copiedText === selectedNote.text ? t.copied : t.copy}
              </button>
              <button style={buttonStyle} onClick={() => setShowViewDialog(false)}>
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Dialog */}
      {showAddDialog && (
        <div style={dialogOverlay} onClick={() => setShowAddDialog(false)}>
          <div style={dialogContent} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 12px', color: theme['--text'] || '#e7eef7' }}>{t.add}</h4>
            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder={t.noteText}
              style={{
                width: '100%',
                minHeight: 120,
                backgroundColor: theme['--bg'] || '#0a0f16',
                border: `1px solid ${theme['--border'] || '#243244'}`,
                borderRadius: 4,
                padding: 10,
                color: theme['--text'] || '#e7eef7',
                fontSize: 13,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                type="text"
                value={newNoteTag}
                onChange={(e) => setNewNoteTag(e.target.value)}
                placeholder={t.tag}
                style={{
                  flex: 1,
                  backgroundColor: theme['--bg'] || '#0a0f16',
                  border: `1px solid ${theme['--border'] || '#243244'}`,
                  borderRadius: 4,
                  padding: '6px 10px',
                  color: theme['--text'] || '#e7eef7',
                  fontSize: 13,
                }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: theme['--text'] || '#e7eef7' }}>
                <input
                  type="checkbox"
                  checked={newNoteRedact}
                  onChange={(e) => setNewNoteRedact(e.target.checked)}
                />
                {t.redact}
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button style={buttonSecondaryStyle} onClick={() => setShowAddDialog(false)} disabled={submitting}>
                {t.cancel}
              </button>
              <button style={buttonStyle} onClick={handleAddNote} disabled={submitting || !newNoteText.trim()}>
                {submitting ? '...' : t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityNotesWidget;
