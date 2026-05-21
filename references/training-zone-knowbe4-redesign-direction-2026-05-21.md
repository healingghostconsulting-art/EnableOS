# Training Zone vs. KnowBe4: Refined Redesign Direction

## Executive Summary

After reviewing the new **Training Zone Feedback 5.21.26** video together with the earlier **KnowBe4 comparison** and **direct comparison** materials, the main issue is now clearer: the Training Zone is not failing because it lacks visual polish alone. It is failing because it still behaves like a **stacked instructional workspace** instead of a **focused learner player**. Even in its more compact form, the current Training Zone asks the learner to process too many adjacent or vertically stacked panels before the actual lesson experience takes over.

The KnowBe4 pattern to mimic is not simply “smaller cards.” It is a more fundamental interaction model: the user enters a training, lands inside a **single dominant learning frame**, sees **persistent but compact progression context**, and only reveals supporting detail when needed. By contrast, the current Training Zone still exposes too much structure, too much meta-information, and too many supporting containers at once.

## What the New Video Corrects

The newest feedback video is important because it corrects the earlier mockup assumption. The Training Zone is **already somewhat compacted**, but it is still too scroll-heavy because the compaction happened at the container level rather than at the **experience-model level**. The video shows that the user is still encountering a top banner, a sizable learning-path card, side support panels, progress blocks, and downstream instructional content in the same overall flow. That means the redesign challenge is not simply reducing spacing; it is **changing what is visible by default**.

## Comparison: Current Training Zone vs. KnowBe4-Style Experience

| Area | Current Training Zone behavior | KnowBe4-style behavior to mimic | Recommended change |
| --- | --- | --- | --- |
| Entry into training | Learner lands in a page that still presents multiple informational regions before the lesson becomes dominant | Learner enters a focused lesson state quickly, with the active training experience clearly owning the screen | Make the lesson canvas the primary destination immediately after entry, not a downstream section |
| Information density | Multiple medium-sized cards compete for attention at once | One dominant content frame, with compact secondary context | Collapse nonessential panels into drawers, tabs, or icon-triggered side rails |
| Progress visibility | Progress exists, but it is spread across several blocks and summary cards | Progress is always visible in one terse, persistent location | Use one persistent progress rail or header strip for completion, time left, score, and next milestone |
| Outline and structure | Structural context is visible as a significant content block | Structural context is present but learner to the lesson | Keep the module outline in a narrow, collapsible left rail rather than a full-content section |
| Checkpoints and quizzes | Assessment elements feel embedded in a longer document flow | Assessment appears as a discrete stage in the lesson journey | Trigger checkpoints as focused in-frame states or modal overlays rather than buried sections lower on the page |
| Supporting artifacts | Script, storyboard, coaching notes, and support layers feel too exposed | Learner sees only what advances the current step | Hide design-heavy or support-heavy content behind “Transcript,” “Coach notes,” or “Resources” toggles |
| Scroll pattern | The learner keeps moving downward through explanation, structure, and interactions | The learner progresses laterally or stage-by-stage with minimal vertical travel | Convert the Training Zone from a long reading page into a staged player with progressive disclosure |

## The Core Problem in Plain Terms

Right now, the Training Zone still feels like a **content wall with attached utilities**. KnowBe4 feels more like a **guided task flow**. That difference matters because it changes the learner’s emotional experience. In the current EnableOS flow, the learner is invited to inspect the architecture of the training. In the KnowBe4-style flow, the learner is invited to **do the next thing**.

This is why the current experience still feels clunky even after the compact rollout. The system is still exposing too much of its own internal structure. It is not yet ruthless enough about protecting the learner from everything except the current step.

## What to Mimic from KnowBe4 More Literally

The next redesign pass should mimic the **behavioral model** of KnowBe4 more literally.

| KnowBe4 pattern to mimic | How it should translate into EnableOS |
| --- | --- |
| Immediate lesson dominance | Open directly into the active lesson canvas, not a preamble stack |
| Compact persistent chrome | Keep only a narrow header, compact outline, and minimal progress rail visible |
| Discrete stages | Treat learn, checkpoint, practice, and apply as distinct states rather than continuous page sections |
| Progressive disclosure | Hide transcript, storyboard, supporting evidence, and optional coaching detail behind explicit reveal controls |
| Minimal vertical travel | Ensure the first interactive lesson state starts above the fold on desktop |
| One primary action at a time | Make the next required action obvious and singular: continue, answer, retry, or advance |

## Specific Improvements I Would Make Next

The first major change should be to **eliminate the pre-lesson stack**. The learner should not hit a sizeable summary card, support card, and contextual panels before reaching the actual learning interaction. Instead, the first viewport should contain a compact top bar, a narrow outline rail, the active lesson canvas, and a small progress rail.

The second major change should be to **remove inline instructional-design artifacts from the default flow**. Narration scripts, storyboards, coaching guidance, and comparable support materials should not be visible as part of the main reading experience unless the learner explicitly asks for them. If these artifacts are needed for accessibility or facilitator workflows, they should be available through a transcript drawer, a coach drawer, or a resources tab.

The third major change should be to **separate checkpoints from scroll**. Knowledge checks should no longer appear as something the learner discovers farther down the page. They should interrupt or advance the journey as discrete states within the player itself. That will make the experience feel like progression rather than page traversal.

The fourth major change should be to **treat the Training Zone as a player, not a dashboard**. The current layout still inherits too much dashboard DNA. That is useful for admin and reporting surfaces, but it works against immersion in the learner flow. The player should therefore become visually quieter, more focused, and less card-fragmented than the surrounding product.

## Recommended Target Layout

The target desktop layout should work as a three-part player.

| Region | Purpose | Default behavior |
| --- | --- | --- |
| Left rail | Module outline and stage position | Narrow, sticky, collapsible, always secondary to lesson |
| Center canvas | Current learning block, checkpoint, or scenario | Dominant region, above the fold, owns most of the width |
| Right rail | Progress, time left, score state, next action | Compact, persistent, terse, no long explanatory copy |

Below the fold, the system should show only optional depth. That depth should be organized into **collapsed drawers** such as Transcript, Coach Notes, Resources, and Evidence. The learner should never be forced to pass through those sections to continue core training.

## Priority Order

| Priority | Recommendation | Why it matters |
| --- | --- | --- |
| High | Move the active lesson canvas above the fold and make it the immediate training destination | This directly addresses the strongest “content wall” complaint |
| High | Collapse or remove all nonessential pre-lesson panels | This cuts scroll and improves focus immediately |
| High | Turn checkpoints into dedicated in-flow states rather than lower-page sections | This makes progression feel intentional rather than buried |
| Medium | Convert transcript, storyboard, and coaching support into reveal-on-demand drawers | This preserves richness without overwhelming the learner |
| Medium | Tighten the progress model into one persistent compact rail | This keeps orientation without visual clutter |
| Medium | Reduce dashboard-style card fragmentation inside the player | This makes the Training Zone feel more like a learning environment and less like a workspace summary |

## Bottom Line

The correct direction is not to make the current Training Zone merely **smaller**. It is to make it **more opinionated**. KnowBe4 works because it is uncompromising about the learner’s focal point. Our Training Zone should adopt the same discipline: one dominant lesson frame, one clear next action, one compact orientation model, and optional detail only when requested.

That is the path to making EnableOS feel genuinely closer to KnowBe4 rather than simply more compact than before.

