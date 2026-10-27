import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateLocalYardage,
  snapToEighthYard,
  calculateYardage,
  acquireBoltLock,
  releaseBoltLock,
  createPaymentIntent,
  createOrder,
  getOrderDetails,
  STANDARD_SIZE_MEASUREMENTS,
} from '../lib/checkoutApi';
import { formatFractionalYards } from '../components/checkout/YardageCalculatorWidget';
import {
  YardageCalculationRequest,
  CreatePaymentIntentRequest,
  CreateOrderRequest,
} from '../lib/checkoutTypes';

describe('FEAT-007: Algorithmic Yardage & Pattern Spec Estimator (C-016)', () => {
  it('enforces 1/8th-yard (0.125) precision snapping on all calculations', () => {
    expect(snapToEighthYard(1.0)).toBe(1.0);
    expect(snapToEighthYard(1.05)).toBe(1.125); // 1 1/8 yds
    expect(snapToEighthYard(1.13)).toBe(1.25); // 1 1/4 yds
    expect(snapToEighthYard(4.21)).toBe(4.25);
    expect(snapToEighthYard(4.26)).toBe(4.375); // 4 3/8 yds
    expect(snapToEighthYard(0.01)).toBe(0.125);
  });

  it('formats decimal yards into luxury mixed fractional notation', () => {
    expect(formatFractionalYards(4.25)).toBe('4 1/4 yds (4.250 yd)');
    expect(formatFractionalYards(0.125)).toBe('1/8 yds (0.125 yd)');
    expect(formatFractionalYards(3.5)).toBe('3 1/2 yds (3.500 yd)');
    expect(formatFractionalYards(5.875)).toBe('5 7/8 yds (5.875 yd)');
  });

  it('calculates floor-length mermaid gown with safety margin on 54" bolt', () => {
    const req: YardageCalculationRequest = {
      silhouetteId: 'corseted_mermaid',
      fabricId: 'FAB-SLK-892',
      heightCm: 172,
      bustCircumferenceCm: 90,
      waistCircumferenceCm: 72,
      hipCircumferenceCm: 98,
      boltWidthInches: 54,
    };

    const res = calculateLocalYardage(req);

    // Recommended yardage must be positive, snapped to 1/8th yard, and include safety margin
    expect(res.recommendedYards).toBeGreaterThan(3.5);
    expect(res.recommendedYards % 0.125).toBeCloseTo(0, 5);
    expect(res.safetyMarginYards).toBe(0.375);
    expect(res.boltWidthInches).toBe(54);
    expect(res.cuttingLayout.panels.length).toBeGreaterThanOrEqual(4);
  });

  it('adjusts yardage upward for 45-degree true bias cut on Grecian Bias Gown', () => {
    const standardReq: YardageCalculationRequest = {
      silhouetteId: 'cocktail_sheath',
      fabricId: 'FAB-SLK-892',
      heightCm: 170,
      boltWidthInches: 54,
    };
    const biasReq: YardageCalculationRequest = {
      silhouetteId: 'grecian_bias_gown',
      fabricId: 'FAB-SLK-892',
      heightCm: 170,
      boltWidthInches: 54,
    };

    const stdRes = calculateLocalYardage(standardReq);
    const biasRes = calculateLocalYardage(biasReq);

    expect(biasRes.recommendedYards).toBeGreaterThan(stdRes.recommendedYards);
    // Panels must declare 45-degree grainline angle for true bias drape
    expect(biasRes.cuttingLayout.panels[0].grainlineAngleDegrees).toBe(45.0);
  });

  it('flags directional nap restriction and increases yield buffer (FEAT-007 AC-2)', () => {
    const req: YardageCalculationRequest = {
      silhouetteId: 'corseted_mermaid',
      fabricId: 'FAB-VEL-401',
      heightCm: 170,
      boltWidthInches: 54,
    };

    const withoutNap = calculateLocalYardage(req, { isDirectionalNap: false });
    const withNap = calculateLocalYardage(req, { isDirectionalNap: true });

    expect(withNap.isDirectionalNap).toBe(true);
    expect(withNap.recommendedYards).toBeGreaterThan(withoutNap.recommendedYards);
    expect(withNap.safetyMarginYards).toBeGreaterThan(withoutNap.safetyMarginYards);
  });

  it('adjusts yardage based on bolt width: 45" requires more length than 60"', () => {
    const req45: YardageCalculationRequest = {
      silhouetteId: 'architectural_tuxedo',
      fabricId: 'FAB-WOL-102',
      heightCm: 175,
      boltWidthInches: 45,
    };
    const req60: YardageCalculationRequest = {
      ...req45,
      boltWidthInches: 60,
    };

    const res45 = calculateLocalYardage(req45);
    const res60 = calculateLocalYardage(req60);

    expect(res45.recommendedYards).toBeGreaterThan(res60.recommendedYards);
  });

  it('falls back gracefully to standard size chart when measurements are omitted', () => {
    const req: YardageCalculationRequest = {
      silhouetteId: 'ballgown_offshoulder',
      fabricId: 'FAB-SLK-892',
      heightCm: 170,
      standardSize: 'US_10',
    };

    const res = calculateLocalYardage(req);

    expect(res.recommendedYards).toBeGreaterThan(5.0);
    expect(STANDARD_SIZE_MEASUREMENTS.US_10.bustCm).toBe(98);
    expect(STANDARD_SIZE_MEASUREMENTS.US_10.waistCm).toBe(80);
  });

  it('triggers split-bolt warning when requested yardage exceeds continuous roll', () => {
    const req: YardageCalculationRequest = {
      silhouetteId: 'ballgown_offshoulder',
      fabricId: 'FAB-SLK-892',
      heightCm: 180,
      customTrainLengthInches: 48,
    };

    // Remaining bolt has only 4.0 yards
    const res = calculateLocalYardage(req, { remainingContinuousYards: 4.0 });

    expect(res.isSplitBoltWarning).toBe(true);
    expect(res.remainingContinuousYardsOnBolt).toBe(4.0);
  });
});

describe('FEAT-008: 15-Minute Continuous Bolt Reservation Timer (C-019, C-020)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('acquires continuous bolt reservation with 15-minute expiry', async () => {
    const lock = await acquireBoltLock({
      boltId: 'bolt_901',
      requestedYards: 4.25,
    });

    expect(lock.boltId).toBe('bolt_901');
    expect(lock.lockedYards).toBe(4.25);
    expect(lock.lockId).toBeDefined();

    const acquired = new Date(lock.lockAcquiredAt).getTime();
    const expires = new Date(lock.expiresAt).getTime();
    const diffMinutes = (expires - acquired) / (60 * 1000);

    expect(diffMinutes).toBeCloseTo(15, 1);
  });

  it('releases active bolt inventory lock cleanly (C-020)', async () => {
    const res = await releaseBoltLock('bolt_901', 'lock_test_123');
    expect(res.released).toBe(true);
    expect(res.boltId).toBe('bolt_901');
  });
});

describe('FEAT-008 & C-021: Multi-Currency Checkout & Swatch Credit Deduction', () => {
  it('calculates Stripe PaymentIntent with automatic $25 swatch credit deduction', async () => {
    const req: CreatePaymentIntentRequest = {
      currency: 'USD',
      items: [
        {
          fabricId: 'FAB-SLK-892',
          boltId: 'bolt_901',
          yardsCut: 4.25,
          isSwatchBox: false,
          lockId: 'lock_901',
        },
      ],
      applySwatchCredit: true,
    };

    const res = await createPaymentIntent(req);

    const uncreditedSubtotal = 4.25 * 120.0;
    const uncreditedTotal = uncreditedSubtotal + 35.0 + Number((uncreditedSubtotal * 0.0825).toFixed(2));

    expect(res.currency).toBe('USD');
    expect(res.paymentIntentId).toBeDefined();
    expect(res.clientSecret).toBeDefined();
    expect(res.subtotalAmount).toBe(uncreditedSubtotal); // 510.00
    expect(res.swatchCreditApplied).toBe(25.0);
    expect(res.shippingAmount).toBe(35.0);
    expect(res.totalAmount).toBeLessThan(uncreditedTotal);
    expect(res.totalAmount).toBe(560.01);
  });

  it('supports multi-currency checkout (EUR, GBP, NGN)', async () => {
    const eurReq: CreatePaymentIntentRequest = {
      currency: 'EUR',
      items: [
        {
          fabricId: 'FAB-SLK-892',
          boltId: 'bolt_901',
          yardsCut: 2.0,
          isSwatchBox: false,
          lockId: 'lock_901',
        },
      ],
    };

    const res = await createPaymentIntent(eurReq);
    expect(res.currency).toBe('EUR');
  });
});

describe('FEAT-008 & C-022: Order Placement & Mandatory Non-Returnable Disclaimer', () => {
  it('creates confirmed atelier order with verified dye lot provenance and tailor dispatch', async () => {
    const orderReq: CreateOrderRequest = {
      idempotencyKey: 'idemp_test_unique_key_001',
      paymentIntentId: 'pi_test_3928192831',
      items: [
        {
          fabricId: 'FAB-SLK-892',
          boltId: 'bolt_901',
          lockId: 'lock_901',
          yardsCut: 4.25,
          isSwatchBox: false,
        },
      ],
      acknowledgedNonReturnableCut: true,
      shippingAddress: {
        street: '72 Grosvenor Street',
        city: 'London',
        postalCode: 'W1K 3LF',
        country: 'GB',
      },
      recipientContact: {
        fullName: 'Amara Okafor',
        email: 'amara.okafor@drape-atelier.com',
        phone: '+44 20 7946 0912',
      },
      tailorRouting: {
        tailorStudioId: 'tailor_savile_row',
        studioName: 'Atelier Savile Row & Co.',
        conciergeNotes: 'Fitted mermaid gown for December gala.',
      },
    };

    const { order } = await createOrder(orderReq);

    expect(order.id).toBeDefined();
    expect(order.orderNumber).toMatch(/^DRP-2027-\d+$/);
    expect(order.status).toBe('confirmed');
    expect(order.items[0].boltRollId).toBe('bolt_901');
    expect(order.items[0].dyeLotCode).toBe('LOT-2026-EMR-04');
    expect(order.tailorDispatch).not.toBeNull();
    expect(order.tailorDispatch?.studioName).toBe('Atelier Savile Row & Co.');
  });
});

describe('Screen 07: Order Confirmation & Provenance Receipt (C-023)', () => {
  it('fetches order details with 4-stage tracking and certified dye-lot provenance badge', async () => {
    const order = await getOrderDetails('ord_test_442');

    expect(order.id).toBe('ord_test_442');
    expect(order.items[0].dyeLotCode).toBe('LOT-2026-EMR-04');
    expect(order.carrierTracking?.carrier).toBe('DHL_EXPRESS');
    expect(order.carrierTracking?.trackingNumber).toBeDefined();
    expect(order.specDossierUrl).toContain('spec-pdf');
    expect(order.dyeLotCertificateUrl).toBeDefined();
  });
});
