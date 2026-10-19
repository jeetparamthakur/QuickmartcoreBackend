import {
  advanceRunMicroStep,
  buildActiveRun,
  stepForAssignmentInRun,
  type ActiveRunState,
  type RunStop,
} from './delivery-run.builder';

describe('delivery-run.builder', () => {
  const assignments = [
    {
      assignmentId: 'a1',
      orderId: 'o1',
      orderNumber: 'QM-1',
      pickupLat: 28.63,
      pickupLng: 77.21,
      pickupAddress: 'Pickup A',
      customerLat: 28.61,
      customerLng: 77.23,
      customerAddress: 'Drop A',
      deliveryFee: 40,
      itemCount: 2,
    },
    {
      assignmentId: 'a2',
      orderId: 'o2',
      orderNumber: 'QM-2',
      pickupLat: 28.6301,
      pickupLng: 77.2101,
      pickupAddress: 'Pickup A merged',
      customerLat: 28.62,
      customerLng: 77.22,
      customerAddress: 'Drop B',
      deliveryFee: 35,
      itemCount: 1,
    },
  ];

  it('merges nearby pickups and orders drops', () => {
    const run = buildActiveRun(assignments, 28.6, 77.2);
    const pickupStops = run.stops.filter((s) => s.kind === 'pickup');
    expect(pickupStops).toHaveLength(1);
    expect(pickupStops[0].assignmentIds).toEqual(['a1', 'a2']);
    expect(run.stops.filter((s) => s.kind === 'drop')).toHaveLength(2);
    expect(run.stops[0].status).toBe('current');
  });

  it('advances through pickup confirm and moves to next stop', () => {
    let run = buildActiveRun([assignments[0]], 28.6, 77.2);
    let result = advanceRunMicroStep(run);
    expect(result.completed).toBe(false);
    expect(result.run.microStep).toBe('confirm_pickup');

    result = advanceRunMicroStep(result.run);
    expect(result.completed).toBe(false);
    expect(result.run.stops[0].status).toBe('done');
    expect(result.run.stops[1].status).toBe('current');
    expect(result.run.microStep).toBe('navigate_drop');
  });

  it('completes full two-order run', () => {
    let run = buildActiveRun(assignments, 28.6, 77.2);
    const steps: ActiveRunState[] = [];
    let completed = false;
    for (let i = 0; i < 20 && !completed; i += 1) {
      const result = advanceRunMicroStep(run);
      run = result.run;
      completed = result.completed;
      steps.push(run);
    }
    expect(completed).toBe(true);
    expect(run.orders.every((o) => o.pickupDone && o.deliveryDone)).toBe(true);
  });

  it('maps per-assignment step from run state', () => {
    const run = buildActiveRun(assignments, 28.6, 77.2);
    expect(stepForAssignmentInRun(run, 'a1')).toBe('navigate_pickup');
    const afterPickup: ActiveRunState = {
      ...run,
      microStep: 'navigate_drop',
      orders: run.orders.map((o) => ({ ...o, pickupDone: true })),
      currentStopIndex: 1,
      stops: run.stops.map((s, i) => ({
        ...s,
        status: (i === 0 ? 'done' : i === 1 ? 'current' : 'pending') as RunStop['status'],
      })),
    };
    expect(stepForAssignmentInRun(afterPickup, 'a1')).toBe('navigate_drop');
  });
});
