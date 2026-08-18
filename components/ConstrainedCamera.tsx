import { useImperativeHandle, useRef, useState, type Ref } from 'react';
import {
  Camera,
  type CameraProps,
  type CameraRef,
  type ViewState,
} from '@maplibre/maplibre-react-native';
import { centerLimit, clampCenter, sameBounds, type Bounds } from '../lib/core/map-bounds';

/** Long enough to read as a correction rather than a jump, short enough not to fight a drag. */
const RECENTER_MS = 250;

export type ConstrainedCameraRef = Pick<CameraRef, 'easeTo'> & {
  /** Feed in every settled viewport — `onRegionDidChange` on the enclosing `Map`. */
  constrain(view: ViewState): void;
};

type Props = Pick<CameraProps, 'initialViewState' | 'minZoom' | 'maxZoom'> & {
  /** The box the whole viewport must stay inside, not just the centre. */
  limit: Bounds;
  ref?: Ref<ConstrainedCameraRef>;
};

/**
 * A `Camera` that cannot show anything outside `limit`, fed by the enclosing map's region events.
 *
 * `maxBounds` is a centre clamp, so what it gets is `limit` inset by half the last reported span.
 * The inset lives in this component's own state rather than the map screen's because the map
 * re-serialises its style and its whole feature source on any render — putting the state in the
 * parent would pay that once per gesture, where here a settle re-renders one `Camera`.
 */
export default function ConstrainedCamera({ limit, ref, ...cameraProps }: Props) {
  const camera = useRef<CameraRef>(null);
  // Starts at the full box: until the map reports a viewport there is nothing to inset it by.
  const [centerBounds, setCenterBounds] = useState<Bounds>(limit);

  useImperativeHandle(
    ref,
    () => ({
      easeTo: (options) => camera.current?.easeTo(options),
      constrain: ({ bounds, center }) => {
        const inset = centerLimit(bounds, limit);
        setCenterBounds((current) => (sameBounds(current, inset) ? current : inset));
        // Only a zoom changes the span, and zooming out near an edge lands the centre outside the
        // tightened box — which the native clamp will not undo, it only refuses the next move.
        const corrected = clampCenter(center, inset);
        if (corrected) camera.current?.easeTo({ center: corrected, duration: RECENTER_MS });
      },
    }),
    [limit],
  );

  return <Camera ref={camera} {...cameraProps} maxBounds={centerBounds} />;
}
