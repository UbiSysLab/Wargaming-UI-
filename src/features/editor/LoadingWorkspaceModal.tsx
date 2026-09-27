// LoadingWorkspaceModal.tsx
import React, { useEffect, useState, useRef } from 'react';
import styles from './LoadingWorkspaceModal.module.css';

interface LoadingWorkspaceModalProps {
  onComplete: () => void;
  isLoading?: boolean;
  activeStage?: string;
  minDurationMs?: number;
}

const GENERATING_STAGES = [
  'Initializing Operations Environment...',
  'Splitting OPORD Structure & Headings...',
  'Extracting Terrain, Situation & Mission Objectives (Stage 1)...',
  'Generating Operational Phases & Unit Task Graph (Stage 2)...',
  'Correlating Forces, Control Measures & Objectives...',
  'Extracting Logistics, Comms & Merging Schema (Stage 3)...',
  'Validating JSON Schema & Finalizing Operations Workspace...',
];

export function LoadingWorkspaceModal({
  onComplete,
  isLoading = false,
  activeStage,
  minDurationMs = 2200,
}: LoadingWorkspaceModalProps) {
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);

  const startTimeRef = useRef<number>(Date.now());
  const completedRef = useRef<boolean>(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // 1. Monotonic progress simulation
  useEffect(() => {
    if (completedRef.current) return;

    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      if (completedRef.current) {
        clearInterval(interval);
        return;
      }

      const elapsed = Date.now() - startTimeRef.current;

      if (isLoading) {
        // While backend is working: smooth asymptotic climb towards 92% and HOLD
        const maxHoldPct = 92;
        const simulated = Math.round(maxHoldPct * (1 - Math.exp(-elapsed / 7000)));

        setProgress((prev) => {
          // Strictly monotonic: progress NEVER snaps backwards
          const nextVal = Math.min(maxHoldPct, Math.max(prev, simulated));
          const currentStage = Math.min(
            GENERATING_STAGES.length - 1,
            Math.floor((nextVal / maxHoldPct) * GENERATING_STAGES.length)
          );
          setStageIndex(currentStage);
          return nextVal;
        });
      } else {
        // Standalone simulation when not driven by external loading
        const duration = Math.max(1200, minDurationMs);
        const pct = Math.min(100, Math.round((elapsed / duration) * 100));
        setProgress(pct);

        const currentStage = Math.min(
          GENERATING_STAGES.length - 1,
          Math.floor((pct / 100) * GENERATING_STAGES.length)
        );
        setStageIndex(currentStage);

        if (pct >= 100) {
          clearInterval(interval);
          if (!completedRef.current) {
            completedRef.current = true;
            holdTimerRef.current = setTimeout(() => {
              onCompleteRef.current();
            }, 2000);
          }
        }
      }
    }, 40);

    return () => clearInterval(interval);
  }, [isLoading, minDurationMs]);

  // 2. When backend finishes (isLoading transitions from true -> false)
  useEffect(() => {
    if (!isLoading && !completedRef.current) {
      completedRef.current = true;
      setProgress(100);
      setStageIndex(GENERATING_STAGES.length - 1);

      // Hold for exactly 2 seconds (2000 ms) before revealing the next screen
      holdTimerRef.current = setTimeout(() => {
        onCompleteRef.current();
      }, 2000);
    }

    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, [isLoading]);

  const currentSubtitle =
    progress >= 100
      ? 'Operations Workspace Ready!'
      : activeStage || GENERATING_STAGES[stageIndex];

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Loading Operations Workspace">
      <div className={styles.modalCard}>
        <h2 className={styles.modalTitle}>Loading Operations Workspace</h2>
        <div className={styles.modalSubtitle}>{currentSubtitle}</div>
        <div className={styles.progressTrack}>
          <div
            className={`${styles.progressBar} ${isLoading ? styles.progressBarActive : ''}`}
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <div className={styles.progressValue}>
          {progress >= 100 ? '100% Complete' : `${progress}%`}
        </div>
      </div>
    </div>
  );
}
