# AI usage

This project was built with AI assistance. This file is the record of it. It is
graded as the finals badge, and it is worth 100 points.

Start it in week 1 and keep it up as you go. The commit history of this file is
part of the evidence: a file written all at once the night before the deadline
looks exactly like what it is.

## 1. How I used AI

At least six entries. One per real use. Every entry needs a commit link.

### 2026-09-26 - NavBar visual iteration (translucency, active-tab fill, shape)

- **Tool:** Claude, Sonnet 5
- **What I asked for:** Several rounds of visual changes against the
  wireframe: make the pill actually translucent (not just labeled that way),
  give the active tab a filled chip behind its icon, move the label inside
  that chip, switch the fill color when it didn't meet the design doc's
  documented contrast pairings, change the shape from a full stadium/pill to
  a 12px rounded rectangle, tighten spacing, shrink the whole bar, and make
  the active chip's fill touch the navbar's own border.
- **What it gave back:** Incremental restyles each round, alpha value fixes,
  a restructured chip (icon+label stacked, fixed width), a shared 12px radius
  between the outer pill and each tab cell, `hitSlop` added to keep the
  48×48dp accessibility minimum once the visual chip shrank below that size.
- **What I kept, what I changed, and why:** Kept the accessibility-preserving
  approach (hitSlop instead of shrinking the actual tap target) since it
  matched the checklist requirement without a visual tradeoff. Changed the
  fill color from primary to accent mid-way through, after it was flagged
  that primary+surface only cleared ~3.1:1 contrast, what the rest of
  the palette uses, while accent+surface is the doc's own verified 6.47:1
  pairing.
- **Commit:** https://github.com/Lintahlo-001/Ember/commit/790b1b5f67ce5069b588a8ce8516d8a9f0eb0c28

## 2. Where the AI got it wrong

Three cases. Be specific. If you write that the AI was never wrong, this section
scores zero.

### Case 1 - NavBar prop types

- **What it gave me:** First pass hand-rolled a local `NavBarProps` type for
  the `tabBar` render prop. When that didn't compile, the second attempt
  imported `BottomTabBarProps` directly from `@react-navigation/bottom-tabs`, which also failed, since that package isn't resolvable as a direct named
  import in this install even though `expo-router` depends on it internally.
- **What was wrong with it:** Both attempts guessed at where the correct type
  lived instead of deriving it from something already known to work. The
  first guessed the shape by hand; the second guessed a valid import path
  that turned out not to be resolvable here.
- **What I did instead:** Used
  `Parameters<ComponentProps<typeof Tabs>['tabBar']>[0]` to pull the exact
  prop type straight from `expo-router`'s own `Tabs` component, no direct
  import of `@react-navigation/bottom-tabs` needed at all.
- **Commit:** https://github.com/Lintahlo-001/Ember/commit/cf427b363fe130cf6a95f2a67651d2da6ec7828f

## 3. Who wrote what

At least a fifth of this project is code you wrote yourself. Name it, and explain
it in your own words.

> Group projects: give each member their own heading below, and use your GitHub
> handle as the heading. You are graded on your own section.

### Written by me

- **File:** `src/theme/theme.ts`
- **Commit:** https://github.com/Lintahlo-001/Ember/commit/84537849304bfeda9c0393fad8f8417e1e096395
- **What it does and why it is built this way:** This file
  holds every design constant the app uses, colors, font names, spacing
  values, breakpoints, and accessibility minimums as plain exported
  objects, instead of scattering hex codes and pixel numbers across every
  screen's `StyleSheet`. It's a direct translation of the design system doc:
  every value here traces back to a specific row in that doc's tables, so if
  a token ever changes (say, the accent red), it changes in exactly one
  place instead of every file that used it. It's built as plain constants
  rather than a styling library because the design doc explicitly avoids a
  styling-library dependency in favor of React Native's built-in
  `StyleSheet`.

### The AI-written part I understand best

- **File:**
- **Commit:**
- **What it does and why we kept it:**