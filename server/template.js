// Canonical adult intake. server/test/template.test.js fails if required or safety ids drift from src/api/templates/adultIntake.js.
const adultIntake = {
  id: "adult-intake-v1",
  title: "Intake Questionnaire for New Patients (Adult)",
  version: "v1",
  pages: [
    {
      page: 1,
      sections: [
        {
          id: "sec-presenting",
          title: "Presenting Concerns",
          questions: [
            { id: "AIQ-001", label: "What brings you in today?", followUp: "What is the main reason you are seeking support right now?", required: true },
            { id: "AIQ-002", label: "When did these symptoms begin?", followUp: "When did you first notice these symptoms?", required: true },
            { id: "AIQ-003", label: "How have these concerns affected daily life?", followUp: "How have these concerns affected work, home, or relationships?", required: true },
          ],
        },
      ],
    },
    {
      page: 2,
      sections: [
        {
          id: "sec-mood",
          title: "Mood and Anxiety",
          questions: [
            { id: "AIQ-004", label: "Describe your mood over the past two weeks.", followUp: "How would you describe your mood over the past two weeks?", required: true },
            { id: "AIQ-005", label: "Describe any worry, nervousness, or anxiety.", followUp: "Have you been experiencing worry or anxiety? How often?", required: true },
            { id: "AIQ-006", label: "Describe any sleep difficulties.", followUp: "How has your sleep been lately?", required: true },
          ],
        },
        {
          id: "sec-phq",
          title: "Depression Screening (PHQ-9 format)",
          note: "Each item requires a response category for the past two weeks: Not at all, Several days, More than half the days, Nearly every day.",
          questions: [
            { id: "PHQ-001", label: "Little interest or pleasure in doing things", followUp: "Over the last two weeks, how often have you had little interest or pleasure in doing things?", required: true, phq: true },
            { id: "PHQ-002", label: "Feeling down, depressed, or hopeless", followUp: "Over the last two weeks, how often have you felt down, depressed, or hopeless?", required: true, phq: true },
            { id: "PHQ-003", label: "Trouble falling or staying asleep, or sleeping too much", followUp: "Over the last two weeks, how often has sleep been a problem?", required: true, phq: true },
            { id: "PHQ-004", label: "Feeling tired or having little energy", followUp: "Over the last two weeks, how often have you felt tired or low on energy?", required: true, phq: true },
            { id: "PHQ-005", label: "Poor appetite or overeating", followUp: "Over the last two weeks, how often has appetite been a problem?", required: true, phq: true },
            { id: "PHQ-006", label: "Feeling bad about yourself, or that you are a failure", followUp: "Over the last two weeks, how often have you felt bad about yourself?", required: true, phq: true },
            { id: "PHQ-007", label: "Trouble concentrating on things", followUp: "Over the last two weeks, how often have you had trouble concentrating?", required: true, phq: true },
            { id: "PHQ-008", label: "Moving or speaking noticeably slowly, or being unusually restless", followUp: "Over the last two weeks, how often have you noticed changes in your movement or restlessness?", required: true, phq: true },
            { id: "PHQ-009", label: "Thoughts of being better off dead, or of hurting yourself", followUp: "Over the last two weeks, how often have you had thoughts of being better off dead or of hurting yourself?", required: true, phq: true, safety: true },
          ],
        },
      ],
    },
    {
      page: 3,
      sections: [
        {
          id: "sec-safety",
          title: "Safety",
          questions: [
            { id: "SAF-001", label: "Current thoughts of harming yourself", followUp: "Are you having any thoughts of harming yourself right now?", required: true, safety: true },
            { id: "SAF-002", label: "Thoughts of harming others", followUp: "Are you having any thoughts of harming anyone else?", required: true, safety: true },
          ],
        },
        {
          id: "sec-substance",
          title: "Substance Use",
          questions: [
            { id: "SUB-001", label: "Alcohol use", followUp: "How often do you drink alcohol, and how much?", required: true },
            { id: "SUB-002", label: "Other substance use", followUp: "Do you use any other substances, including tobacco or cannabis?", required: true },
          ],
        },
      ],
    },
    {
      page: 4,
      sections: [
        {
          id: "sec-history",
          title: "Treatment History",
          questions: [
            { id: "HIS-001", label: "Previous counseling or therapy", followUp: "Have you worked with a counselor or therapist before?", required: true },
            { id: "HIS-002", label: "Current medications", followUp: "Are you currently taking any medications?", required: true },
          ],
        },
        {
          id: "sec-social",
          title: "Relationships and Social History",
          questions: [
            { id: "SOC-001", label: "Living situation and supports", followUp: "Who do you live with, and who do you turn to for support?", required: true },
            { id: "SOC-002", label: "Work or school", followUp: "What do you do for work or school?", required: false },
          ],
        },
      ],
    },
  ],
};

const catalog = [
  { id: adultIntake.id, title: adultIntake.title, pages: adultIntake.pages.length, available: true, note: "Primary demo template" },
  { id: "brief-intake", title: "Brief Intake Assessment", pages: 10, available: false, note: "Reference only. Not yet loaded in demo." },
  { id: "phq9", title: "Patient Health Questionnaire (PHQ-9)", pages: 2, available: false, note: "Reference only. Not yet loaded in demo." },
];

export function listTemplates() {
  return catalog;
}

export function getTemplate(templateId) {
  if (templateId !== adultIntake.id) return null;
  return adultIntake;
}
