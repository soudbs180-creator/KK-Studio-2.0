# Plan

1. Extend the creation task and snapshot schemas with submission state, bounded timestamps, and an unknown task/output status.
2. Queue durable writes before provider submission and flush terminal or unknown transitions before updating the UI.
3. Fence recovery and retry behavior around submission state and add browser, unit, and native regression coverage.
4. Add a dry-run-first static Web release packager and remote atomic activation script with no embedded credentials.
5. Run the repository verification gates, document the packaged TaskHost limitation, and merge the scoped branch into local `main`.
