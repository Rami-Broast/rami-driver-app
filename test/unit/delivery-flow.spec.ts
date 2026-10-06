import { deliveryFlow, isActiveDelivery } from '../../src/delivery/delivery-flow';
import { DELIVERY_STATUS, DeliveryStatus } from '../../src/types/backend';

const ALL = Object.values(DELIVERY_STATUS) as DeliveryStatus[];

describe('deliveryFlow', () => {
  it('never throws and returns a valid shape for every status', () => {
    for (const s of ALL) {
      const f = deliveryFlow(s);
      expect(f.label.length).toBeGreaterThan(0);
      if (f.action) {
        expect(['picked-up', 'out-for-delivery', 'delivered']).toContain(f.action.key);
      }
    }
  });

  it('walks assigned → picked up → out for delivery → delivered', () => {
    expect(deliveryFlow(DELIVERY_STATUS.ASSIGNED).action?.key).toBe('picked-up');
    expect(deliveryFlow(DELIVERY_STATUS.PICKED_UP).action?.key).toBe('out-for-delivery');
    expect(deliveryFlow(DELIVERY_STATUS.OUT_FOR_DELIVERY).action?.key).toBe('delivered');
  });

  it('allows failure only after pickup', () => {
    expect(deliveryFlow(DELIVERY_STATUS.ASSIGNED).canFail).toBe(false);
    expect(deliveryFlow(DELIVERY_STATUS.PICKED_UP).canFail).toBe(true);
    expect(deliveryFlow(DELIVERY_STATUS.OUT_FOR_DELIVERY).canFail).toBe(true);
  });

  it('marks terminal states with no action', () => {
    for (const s of [DELIVERY_STATUS.DELIVERED, DELIVERY_STATUS.FAILED, DELIVERY_STATUS.CANCELLED]) {
      const f = deliveryFlow(s);
      expect(f.terminal).toBe(true);
      expect(f.action).toBeNull();
    }
  });

  it('identifies the active jobs a driver holds', () => {
    expect(isActiveDelivery(DELIVERY_STATUS.ASSIGNED)).toBe(true);
    expect(isActiveDelivery(DELIVERY_STATUS.OUT_FOR_DELIVERY)).toBe(true);
    expect(isActiveDelivery(DELIVERY_STATUS.DELIVERED)).toBe(false);
    expect(isActiveDelivery(DELIVERY_STATUS.PENDING_ASSIGNMENT)).toBe(false);
  });
});
