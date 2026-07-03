import { useState } from 'react';
import { HelpCircle, MessageSquare, Plus, Sparkles } from 'lucide-react';
import type { HunkComment } from '../../types';

type TranslateFn = (k: string, opts?: Record<string, unknown>) => string;

// Inline review thread under a hunk. Renders existing comments as small
// stacked bubbles; the [+ Note] / [+ Ask] affordance opens a compact
// composer that posts back to the parent FileRow's state.
export function HunkCommentThread({
  hunkKey, comments, composing, onOpenCompose, onCancelCompose, onSubmit, onReply, onToggleResolve, t,
}: {
  hunkKey: string;
  comments: HunkComment[];
  composing: boolean;
  onOpenCompose: () => void;
  onCancelCompose: () => void;
  onSubmit: (text: string, kind: 'note' | 'ask') => void;
  onReply: (parentId: string, text: string) => void;
  onToggleResolve: (commentId: string) => void;
  t: TranslateFn;
}) {
  void hunkKey;
  const [text, setText] = useState('');
  const [kind, setKind] = useState<'note' | 'ask'>('note');
  const muted = 'text-[color:var(--fg-muted)]';
  const faint = 'text-[color:var(--fg-subtle)]';
  const border = 'border-[color:var(--border-muted)]';
  const surface = 'bg-[color:var(--bg-surface-muted)]';

  const hasAny = comments.length > 0 || composing;
  if (!hasAny) {
    return (
      <div className={`flex items-center justify-end px-2 py-1 border-t ${border} ${surface}`}>
        <button
          type="button"
          onClick={onOpenCompose}
          className={`flex items-center gap-1 text-xs font-mono opacity-60 hover:opacity-100 transition-opacity ${muted}`}
          title={t('comment.addNote')}
        >
          <Plus className="w-2.5 h-2.5" />
          <MessageSquare className="w-2.5 h-2.5" />
        </button>
      </div>
    );
  }

  return (
    <div className={`border-t ${border} ${surface}`}>
      {comments.length > 0 && (
        <>
          <div className={`px-2 pt-1.5 pb-0.5 text-2xs font-bold uppercase tracking-eyebrow ${faint}`}>
            {t('comment.header', { count: comments.length })}
          </div>
          <div className="px-2 pb-1.5 space-y-1.5">
            {comments.map((c) => (
              <CommentNode
                key={c.id}
                comment={c}
                onReply={(replyText) => { onReply(c.id, replyText); }}
                onToggleResolve={() => { onToggleResolve(c.id); }}
                t={t}
              />
            ))}
          </div>
        </>
      )}
      {composing ? (
        <div className={`px-2 pb-2 ${comments.length === 0 ? 'pt-2' : ''}`}>
          <div className={`rounded-md border ${border} bg-[var(--bg-surface)] overflow-hidden`}>
            <textarea
              autoFocus
              value={text}
              onChange={(e) => { setText(e.target.value); }}
              placeholder={t('comment.placeholder')}
              rows={2}
              className="w-full px-2 py-1.5 bg-transparent outline-none resize-none text-sm leading-relaxed text-[color:var(--fg-strong)] placeholder:text-[color:var(--fg-subtle)]"
              spellCheck={false}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === 'Escape') { e.preventDefault(); onCancelCompose(); setText(''); return; }
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  onSubmit(text, kind); setText('');
                }
              }}
            />
            <div className={`flex items-center justify-between px-1.5 py-1 border-t ${border}`}>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => { setKind('note'); }}
                  aria-pressed={kind === 'note'}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono transition-colors ${
                    kind === 'note'
                      ? 'bg-[color:var(--bg-active)] text-[color:var(--fg-strong)]'
                      : 'text-[color:var(--fg-subtle)] hover:text-[color:var(--fg-default)]'
                  }`}
                >
                  <MessageSquare className="w-2.5 h-2.5" />
                  {t('comment.kindNote')}
                </button>
                <button
                  type="button"
                  onClick={() => { setKind('ask'); }}
                  aria-pressed={kind === 'ask'}
                  style={kind === 'ask'
                    ? { background: 'color-mix(in srgb, var(--intent-warn-vivid) 15%, transparent)', color: 'var(--intent-warn-fg)' }
                    : undefined}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono transition-colors ${
                    kind === 'ask'
                      ? ''
                      : 'text-[color:var(--fg-subtle)] hover:text-[color:var(--fg-default)]'
                  }`}
                >
                  <HelpCircle className="w-2.5 h-2.5" />
                  {t('comment.kindAsk')}
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { onCancelCompose(); setText(''); }}
                  className={`px-1.5 py-0.5 rounded text-xs ${muted} hover:opacity-100 opacity-70`}
                >
                  {t('comment.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => { onSubmit(text, kind); setText(''); }}
                  disabled={!text.trim()}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                    text.trim()
                      ? 'bg-[color:var(--fg-strong)] text-[color:var(--bg-surface)] hover:opacity-90'
                      : 'bg-[color:var(--bg-elevated)] text-[color:var(--fg-subtle)] cursor-not-allowed'
                  }`}
                >
                  {t('comment.submit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={`flex items-center justify-end px-2 py-1 border-t ${border}`}>
          <button
            type="button"
            onClick={onOpenCompose}
            className={`flex items-center gap-1 text-xs font-mono opacity-60 hover:opacity-100 transition-opacity ${muted}`}
            title={t('comment.addNote')}
          >
            <Plus className="w-2.5 h-2.5" />
            <MessageSquare className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// Single comment node — handles its own reply composer + resolve toggle.
// Recursive: replies render as a nested CommentNode tree (one level deep
// in practice, since real review threads rarely go deeper).
function CommentNode({
  comment, onReply, onToggleResolve, t, depth = 0,
}: {
  comment: HunkComment;
  onReply: (text: string) => void;
  onToggleResolve: () => void;
  t: TranslateFn;
  depth?: number;
}) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const muted = 'text-[color:var(--fg-muted)]';
  const faint = 'text-[color:var(--fg-subtle)]';
  const border = 'border-[color:var(--border-muted)]';
  const isAgent = comment.author === 'agent';
  const cardBg = comment.resolved
    ? 'bg-[color:var(--bg-surface-muted)] opacity-60'
    : 'bg-[color:var(--bg-surface-muted)]';
  // Avatar tone: agent is the same neutral as everywhere else; "ask"
  // user comments get amber to nudge the eye toward unanswered questions.
  const avatarStyle: React.CSSProperties | undefined = !isAgent && comment.kind === 'ask'
    ? { background: 'color-mix(in srgb, var(--intent-warn-vivid) 15%, transparent)', color: 'var(--intent-warn-fg)' }
    : undefined;
  const avatarTone = isAgent
    ? 'bg-[color:var(--bg-active)] text-[color:var(--fg-default)]'
    : comment.kind === 'ask'
      ? ''
      : 'bg-[color:var(--bg-hover)] text-[color:var(--fg-muted)]';
  const Icon = isAgent ? Sparkles : comment.kind === 'ask' ? HelpCircle : MessageSquare;

  return (
    <div className={depth > 0 ? `pl-3 ml-3 border-l ${border}` : ''}>
      <div
        className={`flex items-start gap-2 px-2 py-1.5 rounded-md text-sm leading-relaxed border ${border} ${cardBg}`}
      >
        <span
          style={avatarStyle}
          className={`shrink-0 mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded-md ${avatarTone}`}
          title={
            isAgent ? t('reply.agentLabel')
            : comment.kind === 'ask' ? t('comment.kindAsk')
            : t('comment.kindNote')
          }
        >
          <Icon className="w-2.5 h-2.5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className={`text-xs font-mono ${muted}`}>
              {isAgent ? t('reply.agentLabel') : t('reply.userLabel')}
            </span>
            <span className={`text-2xs font-mono ${faint}`}>{comment.at}</span>
            {comment.resolved && (
              <span
                style={{ background: 'var(--intent-success-bg)', color: 'var(--intent-success-fg)' }}
                className="text-2xs font-mono px-1.5 py-px rounded"
              >
                {t('reply.resolved')}
              </span>
            )}
          </div>
          <div className="whitespace-pre-wrap break-words text-[color:var(--fg-default)]">
            {comment.text}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            {!replying && depth === 0 && (
              <button
                type="button"
                onClick={() => { setReplying(true); }}
                className={`text-xs font-mono opacity-70 hover:opacity-100 transition-opacity ${muted}`}
              >
                ↩ {t('reply.openCompose')}
              </button>
            )}
            {depth === 0 && (
              <button
                type="button"
                onClick={onToggleResolve}
                className={`text-xs font-mono opacity-70 hover:opacity-100 transition-opacity ${muted}`}
              >
                {comment.resolved ? t('reply.reopen') : t('reply.resolve')}
              </button>
            )}
          </div>
        </div>
      </div>

      {replying && (
        <div className="mt-1 ml-6">
          <div className={`rounded-md border ${border} bg-[var(--bg-surface)] overflow-hidden`}>
            <textarea
              autoFocus
              value={replyText}
              onChange={(e) => { setReplyText(e.target.value); }}
              placeholder={t('reply.placeholder')}
              rows={2}
              className="w-full px-2 py-1.5 bg-transparent outline-none resize-none text-sm leading-relaxed text-[color:var(--fg-strong)] placeholder:text-[color:var(--fg-subtle)]"
              spellCheck={false}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === 'Escape') { e.preventDefault(); setReplying(false); setReplyText(''); return; }
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  if (replyText.trim()) { onReply(replyText); setReplyText(''); setReplying(false); }
                }
              }}
            />
            <div className={`flex items-center justify-end gap-1 px-1.5 py-1 border-t ${border}`}>
              <button
                type="button"
                onClick={() => { setReplying(false); setReplyText(''); }}
                className={`px-1.5 py-0.5 rounded text-xs ${muted} opacity-70`}
              >
                {t('comment.cancel')}
              </button>
              <button
                type="button"
                onClick={() => { if (replyText.trim()) { onReply(replyText); setReplyText(''); setReplying(false); } }}
                disabled={!replyText.trim()}
                className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                  replyText.trim()
                    ? 'bg-[color:var(--fg-strong)] text-[color:var(--bg-surface)] hover:opacity-90'
                    : 'bg-[color:var(--bg-elevated)] text-[color:var(--fg-subtle)] cursor-not-allowed'
                }`}
              >
                {t('reply.submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-1 space-y-1">
          {comment.replies.map((r) => (
            <CommentNode
              key={r.id}
              comment={r}
              onReply={() => { /* nested replies collapse to flat for v1 */ }}
              onToggleResolve={() => { /* only top-level can be resolved */ }}
              t={t}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
