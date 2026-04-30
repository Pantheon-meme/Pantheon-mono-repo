# Agent Instructions

## Verification Cost Rule

Do not run heavyweight build commands by default. Prefer the narrowest useful
check for the files changed, such as package-local `tsc --noEmit`, focused
tests, or lint/typecheck commands that do not bundle or install production
artifacts.

Only run full builds, production bundles, long-running generation tasks, or
commands that may install/download dependencies when they are absolutely
necessary to validate the work, or when the user explicitly asks for them.
If a build starts doing dependency installation, network fetches, or other
slow setup unrelated to the code change, stop and report the lighter
verification that was completed instead.

## MUD System Migration Rule

When migrating any Phaser gameplay system or action into MUD, treat the MUD
world as the authoritative state layer and the Phaser client as an optimistic
presentation layer.

Every migrated user-facing action must include an optimistic UI path unless the
action is explicitly non-interactive or unsafe to preview.

For each migrated system:

1. Keep the Phaser interaction responsive by applying the expected local state
   change immediately.
2. Submit the matching MUD transaction in the background.
3. Track enough previous local state to roll back the optimistic update if the
   transaction fails or is rejected.
4. Reconcile the local state with the confirmed MUD result or indexed table
   update.
5. Surface pending, confirmed, and rejected states in the existing UI/log
   pattern for that system.
6. Avoid double-applying confirmed updates when the optimistic state already
   reflects the transaction.
7. Prefer small bridge/adaptor components over coupling Phaser render systems
   directly to contract calls.

All MUD-backed user actions that depend on player position or prior onchain
state must flow through the client action coordination layer. The action queue
must preserve user intent order across systems: if the player moves several
times and then sleeps, digs, plants, or harvests, the discrete action waits for
movement reconciliation before it starts. Retryable sync failures should keep
the action at the front of the queue instead of dropping the input.

Movement needs special care because prediction, collision, and correction can be
more visible than discrete actions. Movement may use a dedicated optimistic
prediction/reconciliation layer, but it must expose pending/queued/confirmed
state to the shared action queue so later actions do not execute against stale
onchain coordinates.

The existing digging migration is the reference pattern:

- `TerrainActions.dig` applies the local dirt/depth change optimistically.
- `MudWorldBridge.submitDig` sends `pantheon__dig` behind the scene.
- Rejection rolls back the dirt/depth state and refunds local energy.
- Confirmation updates the action log without applying the visual change again.
