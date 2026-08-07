import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2, BookOpen, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchActiveAssignment, fetchAssignmentVersion, getSignedFileUrl,
  updateAssignmentProgress, createReadingSession, updateReadingSession,
  recordMilestone, recordFinalMilestone, completeAssignment, fetchReviewReasons,
  markAssignmentReturnedLater,
} from '@/lib/reader';
import type { ReaderAssignment, ReviewReason } from '@/types/database';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const MILESTONE_PAGES = [3, 10, 15, 45];

export function ScreenplayReaderPage() {
  const { assignmentId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<ReaderAssignment | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControlPanel, setShowControlPanel] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishStep, setFinishStep] = useState<'choice' | 'finished' | 'stopped'>('choice');
  const [reviewReasons, setReviewReasons] = useState<ReviewReason[]>([]);
  const [rendering, setRendering] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionStartRef = useRef<number>(Date.now());
  const sessionReadingTimeRef = useRef<number>(0);
  const sessionIdRef = useRef<string | null>(null);
  const pageInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageChangeTimeRef = useRef<number>(Date.now());
  const milestonesRef = useRef<Set<number>>(new Set());

  // Load assignment
  useEffect(() => {
    if (!profile) return;
    (async () => {
      const a = await fetchActiveAssignment(profile.id);
      if (!a) {
        setError('No active assignment found.');
        setLoading(false);
        return;
      }
      setAssignment(a);
      setCurrentPage(a.current_page);
      const version = await fetchAssignmentVersion(a);
      if (!version) {
        setError('Screenplay file not found.');
        setLoading(false);
        return;
      }
      const url = await getSignedFileUrl(version.file_path);
      if (!url) {
        setError('Unable to access screenplay file.');
        setLoading(false);
        return;
      }
      try {
        const pdf = await pdfjsLib.getDocument({ url }).promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setLoading(false);

        // Create reading session
        const session = await createReadingSession(a.id, profile.id, a.current_page);
        sessionIdRef.current = session?.id ?? null;
        sessionStartRef.current = Date.now();
        pageChangeTimeRef.current = Date.now();

        // Show control panel if already past page 3
        if (a.current_page >= 3) setShowControlPanel(true);
      } catch {
        setError('Failed to load PDF.');
        setLoading(false);
      }
    })();
  }, [profile]);

  // Load review reasons
  useEffect(() => {
    fetchReviewReasons().then(setReviewReasons);
  }, []);

  // Render page
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return;
    setRendering(true);
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport }).promise;
    } catch {
      // page render error
    } finally {
      setRendering(false);
    }
  }, [pdfDoc, scale]);

  useEffect(() => {
    if (pdfDoc && !loading) renderPage(currentPage);
  }, [pdfDoc, currentPage, scale, renderPage, loading]);

  // Track reading time per page
  useEffect(() => {
    const interval = setInterval(() => {
      sessionReadingTimeRef.current = Date.now() - sessionStartRef.current;
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle page change
  async function goToPage(page: number) {
    if (!pdfDoc || !assignment || page < 1 || page > numPages) return;
    const now = Date.now();
    const timeOnPage = now - pageChangeTimeRef.current;
    pageChangeTimeRef.current = now;

    setCurrentPage(page);
    const progress = Math.round((page / numPages) * 100);
    const totalReadingTime = (assignment.total_reading_time_ms || 0) + timeOnPage;

    await updateAssignmentProgress(assignment.id, page, progress, totalReadingTime);
    if (sessionIdRef.current) {
      await updateReadingSession(sessionIdRef.current, {
        end_page: page,
        pages_read: page - (assignment.current_page || 1) + 1,
        time_spent_ms: sessionReadingTimeRef.current,
      });
    }

    // Record milestones
    for (const mp of MILESTONE_PAGES) {
      if (page >= mp && !milestonesRef.current.has(mp)) {
        milestonesRef.current.add(mp);
        await recordMilestone(assignment.id, assignment.reader_id, mp, totalReadingTime);
      }
    }

    // Show control panel at page 3
    if (page >= 3) setShowControlPanel(true);
  }

  function handlePrev() { goToPage(currentPage - 1); }
  function handleNext() { goToPage(currentPage + 1); }

  function handleZoomIn() { setScale((s) => Math.min(s + 0.2, 3)); }
  function handleZoomOut() { setScale((s) => Math.max(s - 0.2, 0.5)); }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); handlePrev(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); handleNext(); }
      else if (e.key === '+' || e.key === '=') { handleZoomIn(); }
      else if (e.key === '-') { handleZoomOut(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  });

  async function handleReturnLater() {
    if (!assignment || !profile) return;
    const totalReadingTime = (assignment.total_reading_time_ms || 0) + sessionReadingTimeRef.current;
    await updateAssignmentProgress(assignment.id, currentPage, Math.round((currentPage / numPages) * 100), totalReadingTime);
    await markAssignmentReturnedLater(assignment.id);
    if (sessionIdRef.current) {
      await updateReadingSession(sessionIdRef.current, {
        session_end: new Date().toISOString(),
        end_page: currentPage,
        time_spent_ms: sessionReadingTimeRef.current,
        returned_later: true,
      });
    }
    navigate('/app/assigned');
  }

  async function handleFinishReview() {
    setShowFinishModal(true);
    setFinishStep('choice');
  }

  async function submitReview(params: {
    decision: 'finished' | 'stopped';
    finished: boolean;
    recommendation: string | null;
    feedback: string;
    notes?: string;
    stopReason?: string;
  }) {
    if (!assignment || !profile) return;
    const totalReadingTime = (assignment.total_reading_time_ms || 0) + sessionReadingTimeRef.current;
    const sessionCount = assignment.session_count + 1;

    if (params.decision === 'finished') {
      await recordFinalMilestone(assignment.id, assignment.reader_id, numPages, totalReadingTime);
    }

    if (sessionIdRef.current) {
      await updateReadingSession(sessionIdRef.current, {
        session_end: new Date().toISOString(),
        end_page: currentPage,
        time_spent_ms: sessionReadingTimeRef.current,
        finished: params.decision === 'finished',
        abandoned: params.decision === 'stopped',
      });
    }

    await completeAssignment({
      assignmentId: assignment.id,
      decision: params.decision,
      finished: params.finished,
      recommendation: params.recommendation,
      feedback: params.feedback,
      notes: params.notes,
      stopReason: params.stopReason,
      pageAbandoned: params.decision === 'stopped' ? currentPage : null,
      readingTimeMs: totalReadingTime,
      sessionCount,
    });

    setShowFinishModal(false);
    navigate('/app/reviews');
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading screenplay...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">{error}</p>
          <button onClick={() => navigate('/app/assigned')} className="mt-4 text-sm text-primary hover:underline">Back to assignments</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/app/assigned')} className=" p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-foreground">Reading</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleZoomOut} className=" p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground"><ZoomOut className="h-4 w-4" /></button>
          <span className="text-xs text-muted-foreground">{Math.round(scale * 100)}%</span>
          <button onClick={handleZoomIn} className=" p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground"><ZoomIn className="h-4 w-4" /></button>
          <div className="mx-1 h-4 w-px bg-border" />
          <button onClick={toggleFullscreen} className=" p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground">
            {document.fullscreenElement ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* PDF canvas */}
      <div className="relative flex flex-1 items-center justify-center overflow-auto bg-muted/30 p-4">
        {rendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <canvas ref={canvasRef} className="max-w-full shadow-elevated" />
        {/* Watermark overlay */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rotate-[-30deg] text-6xl font-bold text-foreground/5">WhittleScript</span>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-between border-t border-border bg-surface px-4 py-2.5">
        <button
          onClick={handlePrev}
          disabled={currentPage <= 1}
          className="flex items-center gap-1  px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            ref={pageInputRef}
            type="number"
            min={1}
            max={numPages}
            value={currentPage}
            onChange={(e) => {
              const p = parseInt(e.target.value, 10);
              if (p >= 1 && p <= numPages) goToPage(p);
            }}
            className="w-14  border border-input bg-background px-2 py-1 text-center text-sm text-foreground"
          />
          <span>/ {numPages}</span>
          <span className="ml-2 text-xs">{Math.round((currentPage / numPages) * 100)}%</span>
        </div>
        <button
          onClick={handleNext}
          disabled={currentPage >= numPages}
          className="flex items-center gap-1  px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Control panel (appears at page 3) */}
      {showControlPanel && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 animate-fade-in">
          <div className="flex items-center gap-2  border border-border bg-surface px-3 py-2 shadow-elevated">
            <button onClick={() => goToPage(currentPage + 1)} className=" px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-hover">
              Continue Reading
            </button>
            <button onClick={handleReturnLater} className=" px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-surface-hover">
              Return Later
            </button>
            <button onClick={handleFinishReview} className=" bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
              Finish Review
            </button>
          </div>
        </div>
      )}

      {/* Finish review modal */}
      {showFinishModal && (
        <FinishReviewModal
          step={finishStep}
          setStep={setFinishStep}
          reasons={reviewReasons}
          currentPage={currentPage}
          numPages={numPages}
          onSubmit={submitReview}
          onCancel={() => setShowFinishModal(false)}
        />
      )}
    </div>
  );
}

interface FinishReviewModalProps {
  step: 'choice' | 'finished' | 'stopped';
  setStep: (s: 'choice' | 'finished' | 'stopped') => void;
  reasons: ReviewReason[];
  currentPage: number;
  numPages: number;
  onSubmit: (params: {
    decision: 'finished' | 'stopped';
    finished: boolean;
    recommendation: string | null;
    feedback: string;
    notes?: string;
    stopReason?: string;
  }) => void;
  onCancel: () => void;
}

function FinishReviewModal({ step, setStep, reasons, currentPage, numPages, onSubmit, onCancel }: FinishReviewModalProps) {
  const [finished, setFinished] = useState<boolean | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [notes, setNotes] = useState('');
  const [stopReason, setStopReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const FEEDBACK_MIN = 120;
  const FEEDBACK_MAX = 500;
  const feedbackLen = feedback.trim().length;
  const feedbackValid = feedbackLen >= FEEDBACK_MIN && feedbackLen <= FEEDBACK_MAX;

  async function handleSubmit() {
    if (step === 'choice' && finished !== null) {
      if (finished) setStep('finished');
      else setStep('stopped');
      return;
    }
    if (step === 'finished' && feedbackValid && recommendation !== null) {
      setSubmitting(true);
      await onSubmit({
        decision: 'finished',
        finished: true,
        recommendation,
        feedback: feedback.trim(),
        notes: notes.trim() || undefined,
      });
      setSubmitting(false);
    } else if (step === 'stopped' && feedbackValid && stopReason) {
      setSubmitting(true);
      await onSubmit({
        decision: 'stopped',
        finished: false,
        recommendation: null,
        feedback: feedback.trim(),
        stopReason,
      });
      setSubmitting(false);
    }
  }

  const canSubmit =
    step === 'choice' ? finished !== null :
    step === 'finished' ? feedbackValid && recommendation !== null :
    step === 'stopped' ? feedbackValid && stopReason !== '' :
    false;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onCancel}>
      <div className="w-full max-w-lg  border border-border bg-surface shadow-elevated animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-border p-5">
          <h3 className="text-lg font-semibold text-foreground">
            {step === 'choice' ? 'Finish Review' : step === 'finished' ? 'Submit Review' : 'Stopped Reading'}
          </h3>
        </div>
        <div className="p-5 space-y-4">
          {step === 'choice' && (
            <div>
              <p className="mb-3 text-sm text-muted-foreground">Did you finish the screenplay?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFinished(true)}
                  className={` border-2 p-4 text-center transition-all ${finished === true ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                >
                  <BookOpen className="mx-auto h-6 w-6 text-foreground" />
                  <p className="mt-2 text-sm font-medium text-foreground">Yes, I finished</p>
                </button>
                <button
                  onClick={() => setFinished(false)}
                  className={` border-2 p-4 text-center transition-all ${finished === false ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                >
                  <ChevronRight className="mx-auto h-6 w-6 text-foreground" />
                  <p className="mt-2 text-sm font-medium text-foreground">No, I stopped</p>
                </button>
              </div>
            </div>
          )}

          {step === 'finished' && (
            <>
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Would you recommend this screenplay?</p>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setRecommendation('yes')}
                    className={` border-2 py-2.5 text-sm font-medium transition-all ${recommendation === 'yes' ? 'border-success bg-success/10 text-success' : 'border-border text-muted-foreground hover:border-success/30'}`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setRecommendation('no')}
                    className={` border-2 py-2.5 text-sm font-medium transition-all ${recommendation === 'no' ? 'border-error bg-error/10 text-error' : 'border-border text-muted-foreground hover:border-error/30'}`}
                  >
                    No
                  </button>
                  <button
                    onClick={() => setRecommendation('unsure')}
                    className={` border-2 py-2.5 text-sm font-medium transition-all ${recommendation === 'unsure' ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground hover:border-accent/30'}`}
                  >
                    Unsure
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Your recommendation is audience analysis data only and does not affect your credits.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Written Feedback <span className="text-error">*</span></label>
                <textarea required value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={5} className="input-field resize-none" placeholder="Share your honest, constructive feedback. Explain why you feel this way — reference specific characters, scenes, dialogue, pacing, or structure. (120-500 characters)" />
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className={feedbackLen < FEEDBACK_MIN ? 'text-error' : feedbackLen > FEEDBACK_MAX ? 'text-error' : 'text-muted-foreground'}>
                    {feedbackLen < FEEDBACK_MIN ? `At least ${FEEDBACK_MIN - feedbackLen} more characters needed` : feedbackLen > FEEDBACK_MAX ? `${feedbackLen - FEEDBACK_MAX} characters over limit` : 'Feedback meets minimum length'}
                  </span>
                  <span className={feedbackLen > FEEDBACK_MAX ? 'text-error' : 'text-muted-foreground'}>{feedbackLen} / {FEEDBACK_MAX}</span>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Private Notes (optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input-field resize-none" placeholder="Notes only visible to you..." />
              </div>
            </>
          )}

          {step === 'stopped' && (
            <>
              <div className=" bg-secondary px-4 py-3 text-sm text-secondary-foreground">
                You stopped at page {currentPage} of {numPages}.
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Why did you stop? <span className="text-error">*</span></label>
                <div className="space-y-2">
                  {reasons.map((r) => (
                    <button
                      key={r.code}
                      onClick={() => setStopReason(r.code)}
                      className={`flex w-full items-center gap-2  border px-3 py-2 text-sm transition-all ${stopReason === r.code ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Anonymous Feedback <span className="text-error">*</span></label>
                <textarea required value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={5} className="input-field resize-none" placeholder="Explain why you stopped. Reference specific characters, scenes, dialogue, pacing, or structure. (120-500 characters)" />
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className={feedbackLen < FEEDBACK_MIN ? 'text-error' : feedbackLen > FEEDBACK_MAX ? 'text-error' : 'text-muted-foreground'}>
                    {feedbackLen < FEEDBACK_MIN ? `At least ${FEEDBACK_MIN - feedbackLen} more characters needed` : feedbackLen > FEEDBACK_MAX ? `${feedbackLen - FEEDBACK_MAX} characters over limit` : 'Feedback meets minimum length'}
                  </span>
                  <span className={feedbackLen > FEEDBACK_MAX ? 'text-error' : 'text-muted-foreground'}>{feedbackLen} / {FEEDBACK_MAX}</span>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border p-5">
          <button onClick={onCancel} className=" border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className=" bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : step === 'choice' ? 'Continue' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
