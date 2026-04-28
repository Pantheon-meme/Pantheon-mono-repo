# Agent Instructions

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

Movement will need special care because prediction, collision, and correction
can be more visible than discrete actions. When migrating movement, design a
dedicated prediction/reconciliation layer rather than copying the simpler
single-action pattern used by digging.

The existing digging migration is the reference pattern:

- `TerrainActions.dig` applies the local dirt/depth change optimistically.
- `MudWorldBridge.submitDig` sends `pantheon__dig` behind the scene.
- Rejection rolls back the dirt/depth state and refunds local energy.
- Confirmation updates the action log without applying the visual change again.
