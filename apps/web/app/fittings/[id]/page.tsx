'use client';

/**
 * Screen 5: Fitting Results View & 360° Motion Walk
 * Spec Anchors:
 *   - docs/Drape/screens/05-fitting-results-view.md
 *   - docs/Drape/features/FEAT-006.md (360° Looping Neural Motion & Garment Walk)
 *   - CONTRACTS.md C-012, C-014, C-015
 *   - docs/Drape/nfr.md (NFR-030, NFR-040)
 */

import React, { use, Suspense } from 'react';
import { FittingResultsViewContent } from '@/components/fitting/FittingResultsViewContent';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function FittingsIdPage(props: PageProps) {
  const resolvedParams = use(props.params);

  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-mono">Loading Fitting Presentation...</div>}>
      <FittingResultsViewContent fittingId={resolvedParams.id} />
    </Suspense>
  );
}
