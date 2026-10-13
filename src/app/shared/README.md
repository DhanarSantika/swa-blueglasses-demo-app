# Shared

Reusable UI belongs here when multiple features need the same presentation or interaction.

## Components

- `components/page-header`: page title, context, description, and projected `[page-actions]`.
- `components/panel`: shared content surface with optional eyebrow and title.
- `components/alert`: success, warning, error, and informational messages.
- `components/status-badge`: compact semantic state label.
- `components/empty-state`: empty-list explanation and optional projected action.
- `components/metric-card`: label, value, and optional detail.
- `components/table-container`: scrollable, keyboard-focusable table region.
- `components/confirm-dialog`: accessible Material confirmation dialog for destructive actions.

Presentational components use standalone Angular APIs, signal inputs, content projection, and `OnPush`. Feature pages own API calls, forms, business state, and authorization-aware actions. Keep business rules in the API.

Prefer Angular Material controls for new controls. Shared tokens and typography live in `src/styles/`; avoid copying common values into feature stylesheets.
