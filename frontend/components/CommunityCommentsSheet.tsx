import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Pencil, RefreshCcw, Send, Trash2 } from 'lucide-react';
import { commentApi, CommentItemResponse } from '../api/commentApi';
import { getThemePalette, useResolvedTheme } from '../theme';
import { AppModal } from './AppModal';
import { AutoTextArea } from './UI';

const PAGE_SIZE = 10;
const activeCommentRequests = new Set<string>();

interface InlineCommentSectionProps {
  open: boolean;
  accessToken?: string | null;
  currentUserId?: string | null;
  recordId: number | null;
  onCommentCountChange: (recordId: number, nextCount: number) => void;
}

const formatCommentTime = (value: string) => {
  const target = new Date(value);
  const diffMs = Date.now() - target.getTime();
  if (Number.isNaN(diffMs) || diffMs < 0)
    return target.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return target.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
};

export const CommunityCommentsSheet: React.FC<InlineCommentSectionProps> = ({
  open,
  accessToken,
  currentUserId,
  recordId,
  onCommentCountChange,
}) => {
  const theme = useResolvedTheme();
  const palette = getThemePalette(theme);

  const [comments, setComments] = useState<CommentItemResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [draft, setDraft] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CommentItemResponse | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const countChangeRef = useRef(onCommentCountChange);
  const previousRecordIdRef = useRef<number | null>(null);

  useEffect(() => { countChangeRef.current = onCommentCountChange; }, [onCommentCountChange]);

  // 첫 페이지 로드
  const loadFirstPage = useCallback(async () => {
    if (!open || !accessToken || !recordId) return;
    const requestKey = String(recordId);
    if (activeCommentRequests.has(requestKey)) return;
    activeCommentRequests.add(requestKey);
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await commentApi.getComments(accessToken, recordId, PAGE_SIZE);
      setComments(response.items ?? []);
      setTotalCount(response.totalElements ?? response.items.length);
      setTotalPages(response.totalPages ?? 1);
      setCurrentPage(0);
      countChangeRef.current(recordId, response.totalElements ?? response.items.length);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '댓글을 불러오지 못했습니다.');
    } finally {
      activeCommentRequests.delete(requestKey);
      setIsLoading(false);
    }
  }, [accessToken, open, recordId]);

  // 다음 페이지 추가 로드
  const loadNextPage = async () => {
    if (!accessToken || !recordId || isLoadingMore) return;
    const nextPage = currentPage + 1;
    if (nextPage >= totalPages) return;
    setIsLoadingMore(true);
    try {
      const response = await commentApi.getComments(accessToken, recordId, PAGE_SIZE, nextPage);
      setComments((prev) => [...prev, ...(response.items ?? [])]);
      setCurrentPage(nextPage);
      setTotalPages(response.totalPages ?? 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '댓글을 더 불러오지 못했습니다.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // open / recordId 변경 시 초기화 + 첫 페이지 로드
  useEffect(() => {
    if (!open) {
      setComments([]);
      setTotalCount(0);
      setTotalPages(1);
      setCurrentPage(0);
      setDraft('');
      setEditingCommentId(null);
      setEditingText('');
      setDeleteTarget(null);
      setLoadError(null);
      setActionError(null);
      previousRecordIdRef.current = null;
      return;
    }
    if (previousRecordIdRef.current !== recordId) {
      setComments([]);
      setTotalCount(0);
      setTotalPages(1);
      setCurrentPage(0);
      setDraft('');
      setEditingCommentId(null);
      setEditingText('');
      setDeleteTarget(null);
      setLoadError(null);
      setActionError(null);
      previousRecordIdRef.current = recordId;
    }
    void loadFirstPage();
  }, [open, loadFirstPage, recordId]);

  const handleCreateComment = async () => {
    const content = draft.trim();
    if (!accessToken || !content || !recordId) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await commentApi.createComment(accessToken, recordId, content);
      setDraft('');
      await loadFirstPage();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '댓글을 남기지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    const content = editingText.trim();
    if (!accessToken || !editingCommentId || !content) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await commentApi.updateComment(accessToken, editingCommentId, content);
      setEditingCommentId(null);
      setEditingText('');
      await loadFirstPage();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '댓글을 수정하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!accessToken || !deleteTarget) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await commentApi.deleteComment(accessToken, deleteTarget.commentId);
      if (editingCommentId === deleteTarget.commentId) {
        setEditingCommentId(null);
        setEditingText('');
      }
      setDeleteTarget(null);
      await loadFirstPage();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '댓글을 삭제하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open || !recordId) return null;

  const hasMore = currentPage + 1 < totalPages;

  return (
    <>
      <div
        className="overflow-hidden"
        style={{ animation: 'slideDown 0.26s cubic-bezier(0.2,0.8,0.2,1) forwards' }}
      >
        <div
          className="rounded-b-[24px] border-x border-b flex flex-col"
          style={{
            background: theme === 'dark' ? 'rgba(18,26,42,0.96)' : 'rgba(248,250,252,0.98)',
            borderColor: palette.border,
            maxHeight: '52vh',
          }}
        >
          {/* ── 댓글 헤더 ── */}
          <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 shrink-0">
            <MessageCircle size={12} strokeWidth={1.8} style={{ color: palette.faintText }} />
            <span className="text-[11px] font-semibold" style={{ color: palette.mutedText }}>
              댓글 {totalCount}
            </span>
          </div>

          {/* ── 댓글 목록 (독립 스크롤) ── */}
          <div className="overflow-y-auto no-scrollbar px-4 flex-1" style={{ minHeight: 0 }}>
            {isLoading ? (
              <div className="space-y-2 py-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-2.5 py-2.5">
                    <div className="w-6 h-6 rounded-full animate-pulse shrink-0" style={{ background: palette.border }} />
                    <div className="flex-1 space-y-1.5 pt-0.5">
                      <div className="h-2.5 w-16 rounded-full animate-pulse" style={{ background: palette.border }} />
                      <div className="h-3 w-44 rounded-full animate-pulse" style={{ background: palette.border }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <div className="py-5 text-center">
                <p className="text-[12px] mb-3" style={{ color: palette.mutedText }}>{loadError}</p>
                <button
                  type="button"
                  onClick={() => void loadFirstPage()}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full"
                  style={{ background: palette.cardBgSoft, color: palette.mutedText }}
                >
                  <RefreshCcw size={11} strokeWidth={2} />
                  다시 시도
                </button>
              </div>
            ) : comments.length === 0 ? (
              <p className="text-[12px] py-5 text-center" style={{ color: palette.faintText }}>
                첫 댓글을 차분히 남겨보세요.
              </p>
            ) : (
              <>
                {comments.map((comment, idx) => {
                  const isMine = currentUserId != null && String(comment.userId) === currentUserId;
                  const isEditing = editingCommentId === comment.commentId;
                  const isLast = idx === comments.length - 1 && !hasMore;

                  return (
                    <div
                      key={comment.commentId}
                      className="flex gap-2.5 py-3"
                      style={{ borderBottom: isLast ? 'none' : `1px solid ${palette.divider}` }}
                    >
                      <div
                        className="w-6 h-6 rounded-full shrink-0 grid place-items-center text-[10px] font-bold text-white mt-0.5"
                        style={{ background: 'linear-gradient(135deg, #C4B5FD, #8B5CF6)' }}
                      >
                        {(comment.nickname || '익').slice(0, 1)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5 mb-0.5">
                          <span className="text-[12px] font-semibold" style={{ color: palette.strongText }}>
                            {comment.nickname || '익명의 기록자'}
                          </span>
                          <span className="text-[10px]" style={{ color: palette.faintText }}>
                            {formatCommentTime(comment.updatedAt || comment.createdAt)}
                          </span>
                        </div>

                        {isEditing ? (
                          <div>
                            <AutoTextArea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              maxLength={500}
                              rows={2}
                              disabled={isSubmitting}
                              className="text-[13px] !min-h-[40px] !p-2.5 !rounded-xl"
                            />
                            <div className="flex items-center gap-2 mt-1.5">
                              <button
                                type="button"
                                onClick={() => { setEditingCommentId(null); setEditingText(''); }}
                                className="text-[11px] px-2.5 py-1 rounded-full"
                                style={{ background: palette.cardBgSoft, color: palette.mutedText }}
                              >
                                취소
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleSaveEdit()}
                                disabled={isSubmitting || !editingText.trim()}
                                className="text-[11px] px-2.5 py-1 rounded-full font-bold text-white disabled:opacity-50"
                                style={{ background: theme === 'dark' ? '#64748B' : '#475569' }}
                              >
                                저장
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[13px] leading-[1.65] break-keep" style={{ color: palette.strongText }}>
                            {comment.content}
                          </p>
                        )}
                      </div>

                      {isMine && !isEditing && (
                        <div className="flex items-start gap-1 shrink-0 pt-0.5">
                          <button
                            type="button"
                            onClick={() => { setEditingCommentId(comment.commentId); setEditingText(comment.content); setActionError(null); }}
                            className="p-1.5 rounded-full"
                            style={{ color: palette.faintText }}
                            aria-label="수정"
                          >
                            <Pencil size={12} strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(comment)}
                            className="p-1.5 rounded-full"
                            style={{ color: '#FDA4AF' }}
                            aria-label="삭제"
                          >
                            <Trash2 size={12} strokeWidth={2} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 더 보기 */}
                {hasMore && (
                  <div className="pt-1 pb-1 text-center" style={{ borderTop: `1px solid ${palette.divider}` }}>
                    <button
                      type="button"
                      onClick={() => void loadNextPage()}
                      disabled={isLoadingMore}
                      className="text-[12px] font-semibold py-2 px-4 rounded-full transition-opacity disabled:opacity-50"
                      style={{ color: palette.mutedText, background: palette.cardBgSoft }}
                    >
                      {isLoadingMore ? '불러오는 중...' : `댓글 더 보기 (${totalCount - comments.length}개 남음)`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── 입력창 (하단 고정) ── */}
          <div
            className="px-4 pt-3 pb-4 shrink-0"
            style={{ borderTop: `1px solid ${palette.divider}` }}
          >
            {actionError && (
              <p className="text-[11px] mb-2" style={{ color: '#E11D48' }}>{actionError}</p>
            )}
            <div className="flex items-end gap-2">
              <AutoTextArea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="조용히 남기고 싶은 말을 적어보세요."
                maxLength={500}
                rows={1}
                disabled={isSubmitting}
                className="flex-1 text-[13px] !min-h-[40px] !p-3 !rounded-2xl"
                style={{
                  background: palette.cardBg,
                  borderColor: palette.border,
                  color: palette.strongText,
                }}
              />
              <button
                type="button"
                onClick={() => void handleCreateComment()}
                disabled={isSubmitting || !draft.trim()}
                className="w-9 h-9 rounded-full grid place-items-center text-white shrink-0 disabled:opacity-40 transition-opacity mb-0.5"
                style={{ background: theme === 'dark' ? '#64748B' : '#94A3B8' }}
                aria-label="댓글 남기기"
              >
                <Send size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <AppModal
        open={deleteTarget !== null}
        icon={<Trash2 size={20} />}
        title="댓글을 삭제할까요?"
        description="삭제한 댓글은 커뮤니티 목록과 댓글 수에서 제외됩니다."
        confirmLabel="삭제하기"
        confirmVariant="danger"
        confirmDisabled={isSubmitting}
        cancelDisabled={isSubmitting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDeleteComment()}
      />
    </>
  );
};
