# Learner Access Debug Notes

## 2026-05-12 validation

A live browser check on `/learner` with the current signed-in owner account originally showed the full admin navigation, including Executive Command, Manager Ops, Coach Studio, Client Control, and CHCG Command, while the page content itself was learner-scoped.

After updating the guarded workspace shell to accept explicit route menu overrides and applying the learner, coach, and manager overrides in `client/src/App.tsx`, a second browser check confirmed that `/learner` now displays only:

- Learner Journey
- Training Zone
- Content Missions

This confirms the learner link now renders a learner-scoped shell even when the authenticated account has broader permissions.
