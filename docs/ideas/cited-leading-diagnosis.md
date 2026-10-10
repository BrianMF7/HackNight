# Cited leading diagnosis

## Problem Statement

How might we let the person running an adult intake confirm a possible focus, such as depression, and only then open the short set of questions the base form does not already ask?

## Recommended Direction

The adult intake stays the fixed questionnaire it is today: presenting concerns, mood, sleep, PHQ-9, safety, substance use, treatment history, and social history. A few times during the session, a scorer may surface one or more possible focuses. Each one shows a single high-level reason. Quotes stay collapsed until the intake person asks to see why.

Yes and No belong to the intake person. Yes opens a short add-on that the base form does not already contain. For depression, that add-on is prior episodes plus a brief elevated-mood screen. No leaves the base form as it is. Neither answer writes a diagnosis code. The handoff keeps the line that no diagnosis code has been assigned.

The model does not name the focus. It may only attach a transcript quote to a criterion id in a store. A small scorer surfaces a possible focus when that focus’s required evidence is quoted, and it surfaces nothing when the bar is not met. The store can hold more focuses later. The first one with an add-on is depression, because that is the example that has to work, and because mood and PHQ-9 are already always on the form. Repeating them would not be a new form.

## Key Assumptions to Validate

- [ ] On a saved transcript where a clinician would want the depression add-on, the scorer surfaces depression, and on a transcript where they would not, it stays quiet.
- [ ] A quote that is not a substring of the transcript, or a criterion id that is not in the store, never surfaces a focus.
- [ ] The intake person treats Yes as “ask these next questions,” and the prior-episode plus elevated-mood items are questions they actually want after they agree. If they would not ask them, the add-on is the wrong module.
- [ ] The criterion records can be written as original evidence rules, without reproducing DSM-5 criteria text.

## MVP Scope

One depression record set in the store. One binder that returns a criterion id, a quote, and a timestamp, and rejects anything the existing quote check would reject. One scorer that either surfaces “depression” with one sentence or surfaces nothing. Yes reveals the two-part add-on: prior episodes, and a brief elevated-mood screen. Quotes open only on request.

The first test is a saved transcript with a clinician’s yes or no already written down. Live speech comes after that match exists.

## Not Doing (and Why)

- Writing a diagnosis code onto the handoff — Yes only opens questions. The current document still says no code has been assigned.
- Loading PHQ-9, mood, or sleep when someone confirms depression — those items are already required for every patient.
- Add-on modules for anxiety, trauma, or substance use — the store can grow, and only depression has a module until the yes/no test is real.
- Scoring disorders the intake never asks about — a focus with no add-on and no interview coverage should stay off the panel.
- Letting the model write the focus name — the scorer writes it from bound criteria.
- Running a model call on every speech commit — the panel updates when a new quote changes the score. The Yes click itself is local.
- Showing the suggestion to the patient — the intake person confirms it.

## Open Questions

- Who authors the depression evidence rules, and who checks them against how intake staff actually decide to keep asking?
- How many possible focuses may sit on screen at once before the panel becomes a second interview?
- Does the elevated-mood screen stay a few questions inside this session, or is a “yes” on that screen itself a later branch?
