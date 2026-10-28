'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { WardrobeOrder } from './types';
import { triggerTailorPdfDownload } from './wardrobeApi';

interface OrderHistoryTableProps {
  orders: WardrobeOrder[];
  onPdfDownloaded?: (order: WardrobeOrder) => void;
}

/**
 * Order History Table Component
 * Spec Anchor: screens/09-digital-wardrobe.md, FEAT-009, CONTRACTS.md (C-017, C-028)
 */
export function OrderHistoryTable({ orders, onPdfDownloaded }: OrderHistoryTableProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadSpec = async (order: WardrobeOrder) => {
    setDownloadingId(order.id);
    try {
      await triggerTailorPdfDownload({
        orderId: order.id,
        orderNumber: order.orderNumber,
      });
      if (onPdfDownloaded) {
        onPdfDownloaded(order);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status: WardrobeOrder['status']) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-blue-100 text-blue-800 border border-blue-200">
            Confirmed
          </span>
        );
      case 'cutting':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-100 text-amber-800 border border-amber-200">
            In Cutting Room
          </span>
        );
      case 'dispatched':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-purple-100 text-purple-800 border border-purple-200">
            Dispatched
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
            Delivered
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-stone-100 text-stone-800">
            {status}
          </span>
        );
    }
  };

  // Luxury fractional formatting helper
  const formatYards = (yards: number) => {
    const whole = Math.floor(yards);
    const fraction = yards - whole;
    let fracStr = '';
    if (Math.abs(fraction - 0.125) < 0.01) fracStr = '1/8';
    else if (Math.abs(fraction - 0.25) < 0.01) fracStr = '1/4';
    else if (Math.abs(fraction - 0.375) < 0.01) fracStr = '3/8';
    else if (Math.abs(fraction - 0.5) < 0.01) fracStr = '1/2';
    else if (Math.abs(fraction - 0.625) < 0.01) fracStr = '5/8';
    else if (Math.abs(fraction - 0.75) < 0.01) fracStr = '3/4';
    else if (Math.abs(fraction - 0.875) < 0.01) fracStr = '7/8';

    if (whole > 0 && fracStr) return `${whole} ${fracStr} yds`;
    if (whole > 0) return `${whole} yds`;
    if (fracStr) return `${fracStr} yds`;
    return `${yards.toFixed(2)} yds`;
  };

  if (!orders || orders.length === 0) {
    return (
      <div className="py-12 text-center text-stone-500 font-sans text-sm">
        No fabric purchase orders recorded.
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden bg-white border border-stone-200 rounded-xl shadow-sm">
      <div className="overflow-x-auto">
        <table data-testid="orders-table" className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50/80 border-b border-stone-200 text-[11px] font-mono tracking-widest uppercase text-stone-500">
              <th className="py-3.5 px-4 font-semibold">Order</th>
              <th className="py-3.5 px-4 font-semibold">Date</th>
              <th className="py-3.5 px-4 font-semibold">Textile & Dye Lot</th>
              <th className="py-3.5 px-4 font-semibold">Yardage</th>
              <th className="py-3.5 px-4 font-semibold">Status</th>
              <th className="py-3.5 px-4 font-semibold">Tracking</th>
              <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-sm">
            {orders.map((order) => {
              const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <tr
                  key={order.id}
                  data-testid={`order-row-${order.id}`}
                  className="hover:bg-stone-50/60 transition-colors"
                >
                  {/* Order Number */}
                  <td className="py-4 px-4 font-mono font-medium text-stone-900 whitespace-nowrap">
                    {order.orderNumber}
                  </td>

                  {/* Date */}
                  <td className="py-4 px-4 text-stone-500 whitespace-nowrap text-xs">
                    {formattedDate}
                  </td>

                  {/* Textile & Dye Lot */}
                  <td className="py-4 px-4">
                    <div className="font-serif font-normal text-stone-900">{order.fabricName}</div>
                    {order.dyeLotCode && (
                      <div className="text-xs font-mono text-stone-400">
                        Batch: {order.dyeLotCode}
                      </div>
                    )}
                  </td>

                  {/* Yardage */}
                  <td className="py-4 px-4 font-mono text-stone-700 whitespace-nowrap">
                    {formatYards(order.yardsCut)}
                  </td>

                  {/* Status Badge */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    {getStatusBadge(order.status)}
                  </td>

                  {/* Carrier Tracking */}
                  <td className="py-4 px-4 whitespace-nowrap text-xs">
                    {order.carrierTrackingUrl ? (
                      <a
                        href={order.carrierTrackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-amber-900 hover:text-amber-700 underline font-mono text-xs"
                      >
                        <span>DHL Express</span>
                        <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ) : (
                      <span className="text-stone-400 font-mono">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center space-x-2">
                      {/* Tailor PDF Download */}
                      <button
                        type="button"
                        onClick={() => handleDownloadSpec(order)}
                        disabled={downloadingId === order.id}
                        data-testid={`download-order-pdf-${order.id}`}
                        title="Download Vector Technical Tailor Dossier PDF"
                        className="p-1.5 rounded hover:bg-stone-100 text-stone-700 hover:text-stone-900 transition-colors text-xs font-medium border border-stone-200"
                      >
                        {downloadingId === order.id ? (
                          <span className="flex items-center px-1">
                            <svg className="animate-spin w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            PDF
                          </span>
                        ) : (
                          <span className="flex items-center px-1">
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Tailor PDF
                          </span>
                        )}
                      </button>

                      {/* Repeat Yardage Reorder */}
                      <Link
                        href="/catalog"
                        data-testid={`reorder-bolt-${order.id}`}
                        title="Reorder Repeat Yardage from Current Dye Lot"
                        className="px-2.5 py-1.5 rounded bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs font-medium transition-colors"
                      >
                        Reorder Bolt
                      </Link>

                      {/* Route to Master Tailor */}
                      <Link
                        href="/tailors"
                        data-testid={`route-tailor-${order.id}`}
                        title="Route Spec and Fabric to Partner Master Tailor"
                        className="px-2.5 py-1.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-medium transition-colors border border-amber-200"
                      >
                        Route Tailor
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
