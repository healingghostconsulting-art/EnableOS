# Browser Validation Notes

## 2026-05-05 completion-chip walkthrough

The learner page at `/learner` showed the new priority retraining alert with a **Pending** status chip and a learner-side completion control. After triggering the learner completion action, the alert updated in-place to show the assigned module as complete, switched the status treatment to **completed**, and changed the launch actions to review wording. This confirms the learner-side state transition is working in the live preview and is ready for cross-role validation.

The manager workspace at `/manager` was reloaded after the learner completion action. The live retraining assignment card updated from **Pending** to **completed**, and the card copy now states that Nina finished the targeted retraining from Workflow Precision. The manager-facing action label also changed to **Review completed retraining**, confirming the cross-role cache invalidation and server state are both behaving correctly.

The coach workspace at `/coach` showed the new **Learner retraining completion** block with the assignment card in a green completed state, including the completion timestamp. After returning to `/manager` and reopening the **Coach direct-report oversight** lane, the targeted retraining completion card also displayed the green completed chip and matching completion timestamp. This confirms the completed status now propagates correctly across learner, coach, and manager browser views.

On `/learner`, the live preview now shows a separate **Past retraining history** section directly beneath the priority retraining notification. It displayed the completed historical module **Active listening in high-friction interactions** with a completed chip, completion timestamp, and assigning role.

On `/coach`, the supervision lane now includes a dedicated **Retraining completion history** card. It displayed the same completed historical assignment while keeping the current live retraining assignment visible separately, confirming the coach view now distinguishes current work from past completed retraining.

On `/manager`, the coach direct-report oversight lane now includes a dedicated **Targeted retraining history** panel inside the mirrored coaching block. The panel showed the completed historical assignment **Active listening in high-friction interactions** with its completed chip, completion timestamp, and assigning role while the live retraining assignment remained separated elsewhere in the manager workspace.

On `/manager`, the coach-oversight lane now shows a **History window** control with **Week** and **Month** options above targeted retraining history. In the live preview, the default month view displayed **2 tracked** completed assignments, and after switching to **Week**, the panel narrowed to **1 tracked** recent completion while preserving the same oversight context.

On `/manager`, the coach-oversight lane now includes an **Export CSV** action beside the **Week** and **Month** history window controls. After re-triggering the month export following the download-flow fix, the browser saved `/home/ubuntu/Downloads/nina-patel-retraining-history-month.csv` with two filtered history rows and the expected columns: `module_title`, `journey_title`, `skill_focus`, `completion_date`, and `assigning_role`.
