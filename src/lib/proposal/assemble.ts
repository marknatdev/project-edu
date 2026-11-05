import type { Idea, Interview, Proposal, ProposalVariables, IdeaVariablesLite } from '@/types/domain';

export interface StudentAnswersInput {
  problemStatement?: string;
  objectives?: string[] | string;
  hypothesis?: string;
  methodology?: string;
  independentVar?: string | string[];
  dependentVar?: string | string[];
  controlledVar?: string | string[];
  [key: string]: unknown;
}

export interface ProposalAssemblySources {
  idea?:
    | (Partial<Omit<Idea, 'variables'>> & {
        title?: string;
        description?: string;
        variables?:
          | Partial<IdeaVariablesLite>
          | {
              independent?: string;
              dependent?: string;
              controlled?: string | string[];
              [key: string]: unknown;
            };
      })
    | null;
  interview?: Pick<Interview, 'goal' | 'constraints'> | null;
  studentAnswers?: StudentAnswersInput;
  existingProposal?: Partial<Proposal> | null;
  preserveEdits?: boolean;
}

/**
 * Splits delimited text into clean trimmed string arrays.
 * Handles newlines, semicolons, bullet points, and commas outside parentheses.
 */
function parseStringList(val: string | string[] | undefined | null): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter((s) => s.length > 0);
  }

  const trimmed = val.trim();
  if (!trimmed) return [];

  // If newlines present, split by line
  if (trimmed.includes('\n')) {
    return trimmed
      .split('\n')
      .map((s) => s.replace(/^[\s•\-\*\d\.\)]+/, '').trim())
      .filter((s) => s.length > 0);
  }

  // If semicolons present, split by semicolon
  if (trimmed.includes(';')) {
    return trimmed
      .split(';')
      .map((s) => s.replace(/^[\s•\-\*\d\.\)]+/, '').trim())
      .filter((s) => s.length > 0);
  }

  // Check if commas exist outside parentheses
  // e.g. "A, B, C" vs "Description (1%, 2%)"
  let parenDepth = 0;
  let hasOuterComma = false;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === '(' || ch === '[' || ch === '{') parenDepth++;
    else if (ch === ')' || ch === ']' || ch === '}') parenDepth = Math.max(0, parenDepth - 1);
    else if (ch === ',' && parenDepth === 0) {
      hasOuterComma = true;
      break;
    }
  }

  if (hasOuterComma) {
    const parts: string[] = [];
    let current = '';
    parenDepth = 0;
    for (let i = 0; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (ch === '(' || ch === '[' || ch === '{') parenDepth++;
      else if (ch === ')' || ch === ']' || ch === '}') parenDepth = Math.max(0, parenDepth - 1);

      if (ch === ',' && parenDepth === 0) {
        const cleaned = current.replace(/^[\s•\-\*\d\.\)]+/, '').trim();
        if (cleaned) parts.push(cleaned);
        current = '';
      } else {
        current += ch;
      }
    }
    const tailCleaned = current.replace(/^[\s•\-\*\d\.\)]+/, '').trim();
    if (tailCleaned) parts.push(tailCleaned);
    return parts;
  }

  // Single item without delimiters
  const single = trimmed.replace(/^[\s•\-\*\d\.\)]+/, '').trim();
  return single ? [single] : [];
}

/**
 * Pure function to assemble a 1-page Proposal pre-filled ONLY from the student's own answers.
 * Implements ADR 0002: strictly zero AI-generated or invented content.
 * When student answers are empty, returns clean empty strings/arrays.
 */
export function assembleProposal(sources: ProposalAssemblySources): Proposal {
  const { idea, studentAnswers, existingProposal, preserveEdits } = sources;

  // Title: student's own idea title or provided title
  let title = '';
  if (preserveEdits && existingProposal?.title?.trim()) {
    title = existingProposal.title.trim();
  } else if (idea?.title?.trim()) {
    title = idea.title.trim();
  }

  // 1. ที่มาและความสำคัญ (problemStatement)
  let problemStatement = '';
  if (preserveEdits && existingProposal?.problemStatement?.trim()) {
    problemStatement = existingProposal.problemStatement.trim();
  } else if (studentAnswers?.problemStatement?.trim()) {
    problemStatement = studentAnswers.problemStatement.trim();
  } else if (idea?.description?.trim()) {
    problemStatement = idea.description.trim();
  }

  // 2. วัตถุประสงค์ (objectives)
  let objectives: string[] = [];
  if (preserveEdits && existingProposal?.objectives && existingProposal.objectives.length > 0) {
    objectives = [...existingProposal.objectives];
  } else if (studentAnswers?.objectives) {
    objectives = parseStringList(studentAnswers.objectives);
  }

  // 3. สมมติฐาน (hypothesis)
  let hypothesis = '';
  if (preserveEdits && existingProposal?.hypothesis?.trim()) {
    hypothesis = existingProposal.hypothesis.trim();
  } else if (studentAnswers?.hypothesis?.trim()) {
    hypothesis = studentAnswers.hypothesis.trim();
  }

  // 4. ตัวแปร (variables)
  let independent: string[] = [];
  let dependent: string[] = [];
  let controlled: string[] = [];

  if (preserveEdits && existingProposal?.variables) {
    independent = [...(existingProposal.variables.independent ?? [])];
    dependent = [...(existingProposal.variables.dependent ?? [])];
    controlled = [...(existingProposal.variables.controlled ?? [])];
  } else {
    // Collect from studentAnswers first, then fallback to idea.variables
    const ansInd = studentAnswers?.independentVar;
    const ansDep = studentAnswers?.dependentVar;
    const ansCtrl = studentAnswers?.controlledVar;

    independent = ansInd ? parseStringList(ansInd) : parseStringList(idea?.variables?.independent);
    dependent = ansDep ? parseStringList(ansDep) : parseStringList(idea?.variables?.dependent);
    controlled = ansCtrl ? parseStringList(ansCtrl) : parseStringList(idea?.variables?.controlled);
  }

  // 5. วิธีทำ / ขั้นตอนดำเนินงาน (methodology)
  let methodology = '';
  if (preserveEdits && existingProposal?.methodology?.trim()) {
    methodology = existingProposal.methodology.trim();
  } else if (studentAnswers?.methodology?.trim()) {
    methodology = studentAnswers.methodology.trim();
  }

  const proposal: Proposal = {
    title,
    problemStatement,
    objectives,
    hypothesis,
    variables: {
      independent,
      dependent,
      controlled,
    },
    methodology,
  };

  // Strip any accidental forbidden fields (Zero-PII enforcement)
  const cleanProposal: Proposal = {
    title: proposal.title,
    problemStatement: proposal.problemStatement,
    objectives: proposal.objectives,
    hypothesis: proposal.hypothesis,
    variables: {
      independent: proposal.variables.independent,
      dependent: proposal.variables.dependent,
      controlled: proposal.variables.controlled,
    },
    methodology: proposal.methodology,
  };

  return cleanProposal;
}

/**
 * Immutably updates a specific section of a Proposal.
 */
export function updateProposalSection<K extends keyof Proposal>(
  proposal: Proposal,
  section: K,
  value: Proposal[K]
): Proposal {
  const updated = {
    ...proposal,
    [section]: value,
  };

  // If variables is updated, ensure fresh clone
  if (section === 'variables') {
    const vars = value as ProposalVariables;
    updated.variables = {
      independent: [...(vars.independent ?? [])],
      dependent: [...(vars.dependent ?? [])],
      controlled: [...(vars.controlled ?? [])],
    };
  }

  return updated;
}

export interface ProvenanceReport {
  valid: boolean;
  untracedFields: string[];
}

/**
 * Validates that all non-empty content in a Proposal traces back to provided student sources.
 * Guarantees zero AI hallucinated or unverified text.
 */
export function verifyProposalProvenance(
  proposal: Proposal,
  sources: ProposalAssemblySources
): ProvenanceReport {
  const untracedFields: string[] = [];

  // Pool all student-supplied text
  const sourceTexts: string[] = [];
  if (sources.idea?.title) sourceTexts.push(sources.idea.title);
  if (sources.idea?.description) sourceTexts.push(sources.idea.description);
  if (sources.idea?.variables?.independent) sourceTexts.push(sources.idea.variables.independent);
  if (sources.idea?.variables?.dependent) sourceTexts.push(sources.idea.variables.dependent);
  if (sources.idea?.variables?.controlled) {
    if (Array.isArray(sources.idea.variables.controlled)) {
      sources.idea.variables.controlled.forEach((c: unknown) => {
        if (typeof c === 'string') sourceTexts.push(c);
      });
    } else if (typeof sources.idea.variables.controlled === 'string') {
      sourceTexts.push(sources.idea.variables.controlled);
    }
  }

  if (sources.studentAnswers) {
    Object.values(sources.studentAnswers).forEach((val) => {
      if (typeof val === 'string') sourceTexts.push(val);
      if (Array.isArray(val)) {
        val.forEach((item) => {
          if (typeof item === 'string') sourceTexts.push(item);
        });
      }
    });
  }

  const pool = sourceTexts.join(' ').toLowerCase();

  const isTextInPool = (text: string): boolean => {
    if (!text.trim()) return true;
    const clean = text.trim().toLowerCase();
    return pool.includes(clean);
  };

  if (proposal.title && !isTextInPool(proposal.title)) {
    untracedFields.push('title');
  }
  if (proposal.problemStatement && !isTextInPool(proposal.problemStatement)) {
    untracedFields.push('problemStatement');
  }
  for (const obj of proposal.objectives) {
    if (!isTextInPool(obj)) {
      untracedFields.push(`objectives:${obj}`);
    }
  }
  if (proposal.hypothesis && !isTextInPool(proposal.hypothesis)) {
    untracedFields.push('hypothesis');
  }
  for (const ind of proposal.variables.independent) {
    if (!isTextInPool(ind)) {
      untracedFields.push(`variables.independent:${ind}`);
    }
  }
  for (const dep of proposal.variables.dependent) {
    if (!isTextInPool(dep)) {
      untracedFields.push(`variables.dependent:${dep}`);
    }
  }
  for (const ctrl of proposal.variables.controlled) {
    if (!isTextInPool(ctrl)) {
      untracedFields.push(`variables.controlled:${ctrl}`);
    }
  }
  if (proposal.methodology && !isTextInPool(proposal.methodology)) {
    untracedFields.push('methodology');
  }

  return {
    valid: untracedFields.length === 0,
    untracedFields,
  };
}
