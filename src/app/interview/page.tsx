import { AppShell } from '@/components/shell/AppShell';
import { InterviewWizard } from '@/components/interview/InterviewWizard';

export default function InterviewPage() {
  return (
    <AppShell>
      <InterviewWizard />
    </AppShell>
  );
}
