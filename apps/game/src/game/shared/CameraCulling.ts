import Phaser from "phaser";

export function isNearCameraView(
  camera: Phaser.Cameras.Scene2D.Camera,
  x: number,
  y: number,
  margin = 256,
): boolean {
  const view = camera.worldView;

  return (
    x >= view.x - margin &&
    y >= view.y - margin &&
    x <= view.right + margin &&
    y <= view.bottom + margin
  );
}
