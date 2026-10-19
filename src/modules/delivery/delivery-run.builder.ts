import { randomUUID } from 'crypto';
import { distanceKm } from '../../common/utils/geo';

export const MAX_RUN_ORDERS = 5;
export const PICKUP_MERGE_DISTANCE_KM = 0.05;

export type RunStopKind = 'pickup' | 'drop';
export type RunStopStatus = 'pending' | 'current' | 'done';
export type RunMicroStep =
  | 'navigate_pickup'
  | 'confirm_pickup'
  | 'navigate_drop'
  | 'confirm_delivery';

export type RunOrderSummary = {
  assignmentId: string;
  orderId: string;
  orderNumber: string;
  deliveryFee: number;
  itemCount: number;
  pickupDone: boolean;
  deliveryDone: boolean;
};

export type RunStop = {
  stopId: string;
  assignmentIds: string[];
  orderIds: string[];
  orderNumbers: string[];
  kind: RunStopKind;
  status: RunStopStatus;
  address: string;
  latitude: number;
  longitude: number;
};

export type ActiveRunState = {
  runId: string;
  createdAt: string;
  currentStopIndex: number;
  microStep: RunMicroStep;
  stops: RunStop[];
  orders: RunOrderSummary[];
};

export type AssignmentStopInput = {
  assignmentId: string;
  orderId: string;
  orderNumber: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  customerLat: number;
  customerLng: number;
  customerAddress: string;
  deliveryFee: number;
  itemCount: number;
};

export { distanceKm };

export function buildActiveRun(
  assignments: AssignmentStopInput[],
  partnerLat: number,
  partnerLng: number,
): ActiveRunState {
  if (!assignments.length) {
    throw new Error('assignments required');
  }

  const pickups = [...assignments].sort(
    (a, b) =>
      distanceKm(partnerLat, partnerLng, a.pickupLat, a.pickupLng) -
      distanceKm(partnerLat, partnerLng, b.pickupLat, b.pickupLng),
  );

  const pickupStops: RunStop[] = [];
  for (const row of pickups) {
    const merged = pickupStops.find(
      (s) =>
        s.kind === 'pickup' &&
        distanceKm(s.latitude, s.longitude, row.pickupLat, row.pickupLng) <=
          PICKUP_MERGE_DISTANCE_KM,
    );
    if (merged) {
      merged.assignmentIds.push(row.assignmentId);
      merged.orderIds.push(row.orderId);
      merged.orderNumbers.push(row.orderNumber);
      continue;
    }
    pickupStops.push({
      stopId: randomUUID(),
      assignmentIds: [row.assignmentId],
      orderIds: [row.orderId],
      orderNumbers: [row.orderNumber],
      kind: 'pickup',
      status: 'pending',
      address: row.pickupAddress,
      latitude: row.pickupLat,
      longitude: row.pickupLng,
    });
  }

  let cursorLat = partnerLat;
  let cursorLng = partnerLng;
  if (pickupStops.length) {
    const lastPickup = pickupStops[pickupStops.length - 1];
    cursorLat = lastPickup.latitude;
    cursorLng = lastPickup.longitude;
  }

  const remaining = [...assignments];
  const dropStops: RunStop[] = [];
  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i += 1) {
      const d = distanceKm(
        cursorLat,
        cursorLng,
        remaining[i].customerLat,
        remaining[i].customerLng,
      );
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const row = remaining.splice(bestIdx, 1)[0];
    cursorLat = row.customerLat;
    cursorLng = row.customerLng;
    dropStops.push({
      stopId: randomUUID(),
      assignmentIds: [row.assignmentId],
      orderIds: [row.orderId],
      orderNumbers: [row.orderNumber],
      kind: 'drop',
      status: 'pending',
      address: row.customerAddress,
      latitude: row.customerLat,
      longitude: row.customerLng,
    });
  }

  const stops = [...pickupStops, ...dropStops];
  if (stops.length) {
    stops[0].status = 'current';
  }

  const orders: RunOrderSummary[] = assignments.map((a) => ({
    assignmentId: a.assignmentId,
    orderId: a.orderId,
    orderNumber: a.orderNumber,
    deliveryFee: a.deliveryFee,
    itemCount: a.itemCount,
    pickupDone: false,
    deliveryDone: false,
  }));

  const firstKind = stops[0]?.kind ?? 'pickup';
  const microStep: RunMicroStep =
    firstKind === 'pickup' ? 'navigate_pickup' : 'navigate_drop';

  return {
    runId: randomUUID(),
    createdAt: new Date().toISOString(),
    currentStopIndex: 0,
    microStep,
    stops,
    orders,
  };
}

export function initialMicroStepForStop(kind: RunStopKind): RunMicroStep {
  return kind === 'pickup' ? 'navigate_pickup' : 'navigate_drop';
}

export function advanceRunMicroStep(
  run: ActiveRunState,
): { run: ActiveRunState; completed: boolean } {
  const stop = run.stops[run.currentStopIndex];
  if (!stop) {
    return { run, completed: true };
  }

  const pickupFlow: RunMicroStep[] = ['navigate_pickup', 'confirm_pickup'];
  const dropFlow: RunMicroStep[] = ['navigate_drop', 'confirm_delivery'];

  if (stop.kind === 'pickup') {
    if (run.microStep === 'navigate_pickup') {
      return {
        run: { ...run, microStep: 'confirm_pickup' },
        completed: false,
      };
    }
    if (run.microStep === 'confirm_pickup') {
      return completeCurrentStop(run);
    }
  } else {
    if (run.microStep === 'navigate_drop') {
      return {
        run: { ...run, microStep: 'confirm_delivery' },
        completed: false,
      };
    }
    if (run.microStep === 'confirm_delivery') {
      return completeCurrentStop(run);
    }
  }

  const flow = stop.kind === 'pickup' ? pickupFlow : dropFlow;
  const idx = flow.indexOf(run.microStep);
  const next = flow[idx + 1];
  if (!next) {
    return completeCurrentStop(run);
  }
  return { run: { ...run, microStep: next }, completed: false };
}

function completeCurrentStop(run: ActiveRunState): {
  run: ActiveRunState;
  completed: boolean;
} {
  const stop = run.stops[run.currentStopIndex];
  if (!stop) {
    return { run, completed: true };
  }

  const stops = run.stops.map((s, i) =>
    i === run.currentStopIndex ? { ...s, status: 'done' as RunStopStatus } : s,
  );

  let orders = run.orders.map((o) => {
    if (!stop.assignmentIds.includes(o.assignmentId)) return o;
    if (stop.kind === 'pickup') {
      return { ...o, pickupDone: true };
    }
    return { ...o, deliveryDone: true };
  });

  const nextIndex = run.currentStopIndex + 1;
  if (nextIndex >= stops.length) {
    return {
      run: { ...run, stops, orders, microStep: 'confirm_delivery' },
      completed: true,
    };
  }

  const nextStops = stops.map((s, i) =>
    i === nextIndex ? { ...s, status: 'current' as RunStopStatus } : s,
  );
  const nextStop = nextStops[nextIndex];
  const microStep = initialMicroStepForStop(nextStop.kind);

  return {
    run: {
      ...run,
      stops: nextStops,
      orders,
      currentStopIndex: nextIndex,
      microStep,
    },
    completed: false,
  };
}

export function stepForAssignmentInRun(
  run: ActiveRunState,
  assignmentId: string,
): RunMicroStep | undefined {
  const order = run.orders.find((o) => o.assignmentId === assignmentId);
  if (!order) return undefined;
  if (order.deliveryDone) return 'confirm_delivery';
  if (order.pickupDone) return 'navigate_drop';

  const currentStop = run.stops[run.currentStopIndex];
  if (
    currentStop &&
    currentStop.assignmentIds.includes(assignmentId) &&
    currentStop.status === 'current'
  ) {
    return run.microStep;
  }

  const pickupStop = run.stops.find(
    (s) => s.kind === 'pickup' && s.assignmentIds.includes(assignmentId),
  );
  if (pickupStop?.status === 'done') {
    return 'navigate_drop';
  }
  return 'navigate_pickup';
}
