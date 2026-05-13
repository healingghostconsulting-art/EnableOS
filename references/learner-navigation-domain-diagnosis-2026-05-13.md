# Learner navigation diagnosis

The published CHCG EnableOS domain at `/learner` redirected to the Manus sign-in page during inspection, so the learner sidebar state could not be verified there without logging in.

The current sandbox preview learner route at `/learner` rendered only three learner-scoped sidebar items: **Learner Journey**, **Training Zone**, and **Content Missions**. It did not show executive, manager, coach, admin, or CHCG admin navigation.

This indicates that the current preview code is already applying learner-only menu overrides correctly. The user-reported screenshot is therefore more likely explained by one of the following:

1. the shared/published domain is still serving an older published checkpoint,
2. the user is viewing a previously loaded stale client bundle,
3. a different authenticated route or account state is being used outside the current preview environment.
