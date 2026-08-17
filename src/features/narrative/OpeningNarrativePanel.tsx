import React from 'react';
import { useWizard } from '../../stores/WizardContext';
import { useNarrative } from './useNarrative';
import styles from './OpeningNarrativePanel.module.css';

export function OpeningNarrativePanel() {
  const { dispatch } = useWizard();
  // Fetch or use default wargaming narrative data
  const { data } = useNarrative('exercise-01', false);

  const handleNext = () => {
    dispatch({ type: 'NEXT_STEP' });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.scrollArea}>
        {/* Welcome Header */}
        <div className={styles.welcomeHeader}>
          <h2 className={styles.welcomeTitle}>{data.welcomeBrigade}</h2>
          <p className={styles.teamSubtext}>
            You are in {data.team} <span className={styles.blueTeamBadge} />
          </p>
        </div>

        <div className={styles.divider} />

        {/* Situation Overview */}
        <section className={styles.section}>
          <h3 className={styles.sectionHeading}>Situation Overview</h3>
          <p className={styles.paragraph}>{data.situationOverview.corridorInfo}</p>
          <p className={styles.paragraph}>
            <span className={styles.redForceTag}>RED FORCE</span> {data.situationOverview.redForce}
          </p>
          <p className={styles.paragraph}>
            <span className={styles.blueForceTag}>BLUE FORCE</span> {data.situationOverview.blueForce}
          </p>
        </section>

        <div className={styles.divider} />

        {/* Mission Statements */}
        <section className={styles.section}>
          <h3 className={styles.sectionHeading}>Mission Statements</h3>
          <p className={styles.paragraph}>
            <span className={styles.blueForceTag}>BLUE:</span> {data.missionStatements.blueMission}
          </p>
        </section>

        <div className={styles.divider} />

        {/* Controller Intent & Adjudication Principles */}
        <section className={styles.section}>
          <h3 className={styles.sectionHeading}>Controller Intent &amp; Adjudication Principles</h3>
          <p className={styles.paragraph}>Umpires will:</p>
          <ul className={styles.rulesList}>
            {data.controllerIntent.umpiresRules.map((rule, idx) => (
              <li key={idx} className={styles.ruleItem}>
                {idx + 1}) {rule}
              </li>
            ))}
          </ul>
          <p className={styles.paragraph}>{data.controllerIntent.adjudicationMatrixDesc}</p>
          <p className={styles.paragraph}>{data.controllerIntent.doctrineNote}</p>
        </section>

        <div className={styles.divider} />

        {/* Victory Conditions & Termination Criteria */}
        <section className={styles.section}>
          <h3 className={styles.sectionHeading}>Victory Conditions &amp; Termination Criteria</h3>
          <ul className={styles.rulesList}>
            {data.victoryConditions.primaryConditions.map((cond, idx) => (
              <li key={idx} className={styles.ruleItem}>
                • {cond}
              </li>
            ))}
          </ul>
          <p className={styles.paragraph}>{data.victoryConditions.terminationCriteria}</p>
        </section>

        <div className={styles.divider} />

        {/* Reporting After Action */}
        <section className={styles.section}>
          <h3 className={styles.sectionHeading}>Reporting After Action</h3>
          <ul className={styles.rulesList}>
            {data.reportingAfterAction.formats.map((fmt, idx) => (
              <li key={idx} className={styles.ruleItem}>
                • {fmt}
              </li>
            ))}
          </ul>
          <p className={styles.paragraph}>
            <strong>Evaluation Criteria:</strong> {data.reportingAfterAction.evaluationCriteria}
          </p>
        </section>
      </div>

      {/* Bottom Action Row with Next Button */}
      <div className={styles.bottomActionRow}>
        <button type="button" className={styles.nextButton} onClick={handleNext}>
          Next
        </button>
      </div>
    </div>
  );
}
