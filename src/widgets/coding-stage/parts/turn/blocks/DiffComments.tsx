import { useState } from 'react';
import { HelpCircle, MessageSquare, Plus, Sparkles } from 'lucide-react';
import type { HunkComment } from '../../types';

type TranslateFn = (k: string, opts?: Record<string, unknown>) => string;

// Inline review thread under a hunk. Renders existing comments as small
// stacked bubbles; the [+ Note] / [+ Ask] affordance opens a compact
// composer that posts back to the parent FileRow's state.
export function HunkCommentThread({
  hunkKey, comments, composing, onOpenCompose, onCancelCompose, onSubmit, onReply, onToggleResolve, isDark, t,
}: {
  hunkKey: string;
  comments: HunkComment[];
  composing: boolean;
  onOpenCompose: () => void;
  onCancelCompose: () => void;
  onSubmit: (text: string, kind: 'note' | 'ask') => void;
  onReply: (parentId: string, text: string) => void;
  onToggleResolve: (commentId: string) => void;
  isDark: boolean;
  t: TranslateFn;
}) {
  void hunkKey;
  const [text, setText] = useState('');
  const [kind, setKind] = useState<'note' | 'ask'>('note');
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const faint = isDark ? 'text-white/35' : 'text-black/40';
  const border = isDark ? 'border-white/[0.06]' : 'border-black/[0.06]';
  const surface = isDark ? 'bg-white/[0.02]' : 'bg-black/[0.015]';

  const hasAny = comments.length > 0 || composing;
  if (!hasAny) {
    return (
      <div className={`flex items-center justify-end px-2 py-1 border-t ${border} ${surface}`}>
        <button
          type="button"
          onClick={onOpenCompose}
          className={`flex items-center gap-1 text-[10px] font-mono opacity-60 hover:opacity-100 transition-opacity ${muted}`}
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
          <div className={`px-2 pt-1.5 pb-0.5 text-[9px] font-bold uppercase tracking-[0.18em] ${faint}`}>
            {t('comment.header', { count: comments.length })}
          </div>
          <div className="px-2 pb-1.5 space-y-1.5">
            {comments.map((c) => (
              <CommentNode
                key={c.id}
                comment={c}
                onReply={(replyText) => { onReply(c.id, replyText); }}
                onToggleResolve={() => { onToggleResolve(c.id); }}
                isDark={isDark}
                t={t}
              />
            ))}
          </div>
        </>
      )}
      {composing ? (
        <div className={`px-2 pb-2 ${comments.length === 0 ? 'pt-2' : ''}`}>
          <div className={`rounded-md border ${border} ${isDark ? 'bg-[#11141a]' : 'bg-white'} overflow-hidden`}>
            <textarea
              autoFocus
              value={text}
              onChange={(e) => { setText(e.target.value); }}
              placeholder={t('comment.placeholder')}
              rows={2}
              className={`w-full px-2 py-1.5 bg-transparent outline-none resize-none text-[11px] leading-relaxed ${
                isDark ? 'text-white/85 placeholder:text-white/30' : 'text-black/85 placeholder:text-black/35'
              }`}
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
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    kind === 'note'
                      ? (isDark ? 'bg-white/[0.08] text-white/85' : 'bg-black/[0.06] text-black/85')
                      : (isDark ? 'text-white/40 hover:text-white/70' : 'text-black/40 hover:text-black/70')
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
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    kind === 'ask'
                      ? ''
                      : (isDark ? 'text-white/40 hover:text-white/70' : 'text-black/40 hover:text-black/70')
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
                  className={`px-1.5 py-0.5 rounded text-[10px] ${muted} hover:opacity-100 opacity-70`}
                >
                  {t('comment.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => { onSubmit(text, kind); setText(''); }}
                  disabled={!text.trim()}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                    text.trim()
                      ? (isDark ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90')
                      : (isDark ? 'bg-white/[0.05] text-white/30 cursor-not-allowed' : 'bg-black/[0.04] text-black/30 cursor-not-allowed')
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
            className={`flex items-center gap-1 text-[10px] font-mono opacity-60 hover:opacity-100 transition-opacity ${muted}`}
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
  comment, onReply, onToggleResolve, isDark, t, depth = 0,
}: {
  comment: HunkComment;
  onReply: (text: string) => void;
  onToggleResolve: () => void;
  isDark: boolean;
  t: TranslateFn;
  depth?: number;
}) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const faint = isDark ? 'text-white/35' : 'text-black/40';
  const border = isDark ? 'border-white/[0.06]' : 'border-black/[0.06]';
  const isAgent = comment.author === 'agent';
  const cardBg = comment.resolved
    ? (isDark ? 'bg-white/[0.015] opacity-60' : 'bg-black/[0.01] opacity-60')
    : (isDark ? 'bg-white/[0.025]' : 'bg-white');
  // Avatar tone: agent is the same neutral as everywhere else; "ask"
  // user comments get amber to nudge the eye toward unanswered questions.
  const avatarStyle: React.CSSProperties | undefined = !isAgent && comment.kind === 'ask'
    ? { background: 'color-mix(in srgb, var(--intent-warn-vivid) 15%, transparent)', color: 'var(--intent-warn-fg)' }
    : undefined;
  const avatarTone = isAgent
    ? (isDark ? 'bg-white/[0.08] text-white/70' : 'bg-black/[0.06] text-black/70')
    : comment.kind === 'ask'
      ? ''
      : (isDark ? 'bg-white/[0.05] text-white/55' : 'bg-black/[0.04] text-black/55');
  const Icon = isAgent ? Sparkles : comment.kind === 'ask' ? HelpCircle : MessageSquare;

  return (
    <div className={depth > 0 ? `pl-3 ml-3 border-l ${border}` : ''}>
      <div
        className={`flex items-start gap-2 px-2 py-1.5 rounded-md text-[11px] leading-relaxed border ${border} ${cardBg}`}
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
            <span className={`text-[10px] font-mono ${muted}`}>
              {isAgent ? t('reply.agentLabel') : t('reply.userLabel')}
            </span>
            <span className={`text-[9px] font-mono ${faint}`}>{comment.at}</span>
            {comment.resolved && (
              <span
                style={{ background: 'var(--intent-success-bg)', color: 'var(--intent-success-fg)' }}
                className="text-[9px] font-mono px-1.5 py-px rounded"
              >
                {t('reply.resolved')}
              </span>
            )}
          </div>
          <div className={`whitespace-pre-wrap break-words ${isDark ? 'text-white/80' : 'text-black/80'}`}>
            {comment.text}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            {!replying && depth === 0 && (
              <button
                type="button"
                onClick={() => { setReplying(true); }}
                className={`text-[10px] font-mono opacity-70 hover:opacity-100 transition-opacity ${muted}`}
              >
                ↩ {t('reply.openCompose')}
              </button>
            )}
            {depth === 0 && (
              <button
                type="button"
                onClick={onToggleResolve}
                className={`text-[10px] font-mono opacity-70 hover:opacity-100 transition-opacity ${muted}`}
              >
                {comment.resolved ? t('reply.reopen') : t('reply.resolve')}
              </button>
            )}
          </div>
        </div>
      </div>

      {replying && (
        <div className="mt-1 ml-6">
          <div className={`rounded-md border ${border} ${isDark ? 'bg-[#11141a]' : 'bg-white'} overflow-hidden`}>
            <textarea
              autoFocus
              value={replyText}
              onChange={(e) => { setReplyText(e.target.value); }}
              placeholder={t('reply.placeholder')}
              rows={2}
              className={`w-full px-2 py-1.5 bg-transparent outline-none resize-none text-[11px] leading-relaxed ${
                isDark ? 'text-white/85 placeholder:text-white/30' : 'text-black/85 placeholder:text-black/35'
              }`}
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
                className={`px-1.5 py-0.5 rounded text-[10px] ${muted} opacity-70`}
              >
                {t('comment.cancel')}
              </button>
              <button
                type="button"
                onClick={() => { if (replyText.trim()) { onReply(replyText); setReplyText(''); setReplying(false); } }}
                disabled={!replyText.trim()}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  replyText.trim()
                    ? (isDark ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90')
                    : (isDark ? 'bg-white/[0.05] text-white/30 cursor-not-allowed' : 'bg-black/[0.04] text-black/30 cursor-not-allowed')
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
              isDark={isDark}
              t={t}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
